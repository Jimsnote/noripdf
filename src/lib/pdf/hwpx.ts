import { parseHwpx, HwpxError } from './hwpx-parse';
export { HwpxError } from './hwpx-parse';
import {
  renderHwpxToPdf,
  docPrefersSerif,
  type HwpxFonts,
  type RenderProgress,
} from './hwpx-render';

/**
 * HWPX → PDF orchestration. Korean fonts (Nanum Gothic / Nanum Myeongjo,
 * OFL-1.1) are fetched lazily on first use with progress — only the family
 * the document actually needs (~4–6 MB) — then cached for the session.
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

const FAMILY_SOURCES = {
  sans: [
    ['/fonts/NanumGothic-Regular.ttf', 2_054_744],
    ['/fonts/NanumGothic-Bold.ttf', 2_073_868],
  ] as const,
  serif: [
    ['/fonts/NanumMyeongjo-Regular.ttf', 3_058_408],
    ['/fonts/NanumMyeongjo-Bold.ttf', 3_074_720],
  ] as const,
};

let sansCache: Promise<HwpxFonts> | null = null;
let serifCache: Promise<HwpxFonts> | null = null;

/** Preload/cache the Korean font family a document needs. */
export function loadHwpxFonts(
  serif: boolean,
  onProgress?: (loadedBytes: number, totalBytes: number) => void,
): Promise<HwpxFonts> {
  const cache = serif ? serifCache : sansCache;
  if (cache) return cache;
  const sources = serif ? FAMILY_SOURCES.serif : FAMILY_SOURCES.sans;
  const total = sources.reduce((s, f) => s + f[1], 0);
  const load = (async (): Promise<HwpxFonts> => {
    const loaded: Uint8Array[] = [];
    let done = 0;
    try {
      for (const [url] of sources) {
        const res = await fetch(url);
        if (!res.ok || !res.body) throw new HwpxError('engine');
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        for (;;) {
          const { done: d, value } = await reader.read();
          if (d) break;
          chunks.push(value);
          done += value.length;
          onProgress?.(done, total);
        }
        const size = chunks.reduce((s, c) => s + c.length, 0);
        const out = new Uint8Array(size);
        let offset = 0;
        for (const c of chunks) {
          out.set(c, offset);
          offset += c.length;
        }
        loaded.push(out);
      }
    } catch (e) {
      // offline / CSP / mid-stream drop — none of these are the file's fault
      if (e instanceof HwpxError) throw e;
      throw new HwpxError('engine');
    }
    return { regular: loaded[0], bold: loaded[1] ?? loaded[0] };
  })();
  if (serif) serifCache = load;
  else sansCache = load;
  return load;
}

/** Test hook: provide font bytes directly (Node) instead of fetching. */
export function injectFontsForTest(fonts: HwpxFonts): void {
  sansCache = Promise.resolve(fonts);
  serifCache = Promise.resolve(fonts);
}

/** Shared parse+render core (HWPX bytes → PDF), used by both converters. */
export async function parseAndRender(
  bytes: Uint8Array,
  onProgress?: (p: HwpxProgress) => void,
): Promise<HwpxToPdfResult> {
  onProgress?.({ stage: 'parse', ratio: 0 });
  const doc = await parseHwpx(bytes);

  const serif = docPrefersSerif(doc);
  onProgress?.({ stage: 'engine', ratio: 0, engineStatus: 'fonts' });
  const fonts = await loadHwpxFonts(serif, (loaded, total) =>
    onProgress?.({ stage: 'engine', ratio: loaded / total, engineStatus: 'fonts' }),
  );

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

export async function hwpxToPdf(
  bytes: Uint8Array,
  onProgress?: (p: HwpxProgress) => void,
): Promise<HwpxToPdfResult> {
  return parseAndRender(bytes, onProgress);
}

/** Map failures to i18n keys handled by the tool component. */
export function hwpxErrorKey(err: unknown): 'encrypted' | 'empty' | 'engine' | 'invalid' {
  if (err instanceof HwpxError) {
    if (err.message === 'encrypted') return 'encrypted';
    if (err.message === 'empty') return 'empty';
    if (err.message === 'engine') return 'engine';
  }
  return 'invalid';
}
