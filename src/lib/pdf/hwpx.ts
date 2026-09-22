import { parseHwpx, HwpxError } from './hwpx-parse';
import { renderHwpxToPdf, type HwpxFonts, type RenderProgress } from './hwpx-render';

/**
 * HWPX → PDF orchestration. The Korean font (Noto Sans KR, OFL-1.1) is
 * fetched lazily on first use with progress, then cached for the session.
 * Everything runs locally — the file never leaves the device.
 */

export type HwpxStage = 'engine' | 'parse' | 'render';

export interface HwpxProgress {
  stage: HwpxStage;
  /** engine: 0..1 font download; render: page counter via RenderProgress */
  ratio: number;
  page?: number;
  pages?: number;
  engineStatus?: string;
}

export interface HwpxToPdfResult {
  pdfBytes: Uint8Array;
  pageCount: number;
}

const FONT_REGULAR_URL = '/fonts/NanumGothic-Regular.ttf';
const FONT_BOLD_URL = '/fonts/NanumGothic-Bold.ttf';

let fontCache: Promise<HwpxFonts> | null = null;

async function fetchWithProgress(url: string, onRatio: (r: number) => void): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`font fetch failed: ${url}`);
  const total = Number(res.headers.get('content-length') ?? 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onRatio(Math.min(1, received / total));
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Preload/cache the Korean fonts. In tests, inject bytes via `injectFonts`. */
export function loadHwpxFonts(
  onProgress?: (loadedBytes: number, totalBytes: number) => void,
): Promise<HwpxFonts> {
  if (!fontCache) {
    fontCache = (async () => {
      const REGULAR_TOTAL = 2_054_744;
      const BOLD_TOTAL = 2_073_868;
      const regular = await fetchWithProgress(FONT_REGULAR_URL, (r) =>
        onProgress?.(Math.round(r * REGULAR_TOTAL), REGULAR_TOTAL + BOLD_TOTAL),
      );
      const bold = await fetchWithProgress(FONT_BOLD_URL, (r) =>
        onProgress?.(
          REGULAR_TOTAL + Math.round(r * BOLD_TOTAL),
          REGULAR_TOTAL + BOLD_TOTAL,
        ),
      );
      return { regular, bold };
    })();
  }
  return fontCache;
}

/** Test hook: provide font bytes directly (Node) instead of fetching. */
export function injectFontsForTest(fonts: HwpxFonts): void {
  fontCache = Promise.resolve(fonts);
}

export async function hwpxToPdf(
  bytes: Uint8Array,
  onProgress?: (p: HwpxProgress) => void,
): Promise<HwpxToPdfResult> {
  onProgress?.({ stage: 'engine', ratio: 0, engineStatus: 'fonts' });
  const fonts = await loadHwpxFonts((loaded, total) =>
    onProgress?.({ stage: 'engine', ratio: loaded / total, engineStatus: 'fonts' }),
  );

  onProgress?.({ stage: 'parse', ratio: 0 });
  const doc = await parseHwpx(bytes);

  let pages = 0;
  const rendered = await renderHwpxToPdf(doc, fonts, (p) => {
    pages = p.pages || pages;
    if (p.pages > 0) {
      onProgress?.({ stage: 'render', ratio: 1, page: p.page, pages: p.pages });
    } else {
      onProgress?.({ stage: 'render', ratio: 0, page: p.page, pages: 0 });
    }
  });

  return { pdfBytes: rendered.bytes, pageCount: pages };
}

/** Map parse failures to i18n keys handled by the tool component. */
export function hwpxErrorKey(err: unknown): 'encrypted' | 'empty' | 'invalid' {
  if (err instanceof HwpxError) return err.message === 'encrypted' ? 'encrypted' : 'empty';
  return 'invalid';
}
