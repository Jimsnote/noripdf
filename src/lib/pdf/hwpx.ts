import { parseHwpx, HwpxError } from './hwpx-parse';
import { renderHwpxToPdf, type HwpxFonts, type RenderProgress } from './hwpx-render';

/**
 * HWPX → PDF orchestration. Korean fonts (Nanum Gothic + Nanum Myeongjo,
 * OFL-1.1) are fetched lazily on first use with progress, then cached for
 * the session. Everything runs locally — the file never leaves the device.
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

const FONT_SOURCES = [
  ['gothicRegular', '/fonts/NanumGothic-Regular.ttf', 2_054_744],
  ['gothicBold', '/fonts/NanumGothic-Bold.ttf', 2_073_868],
  ['myeongjoRegular', '/fonts/NanumMyeongjo-Regular.ttf', 3_058_408],
  ['myeongjoBold', '/fonts/NanumMyeongjo-Bold.ttf', 3_074_720],
] as const;

type FontKey = (typeof FONT_SOURCES)[number][0];
const FONT_TOTAL = FONT_SOURCES.reduce((s, f) => s + f[2], 0);

let fontCache: Promise<HwpxFonts> | null = null;

/** Preload/cache the Korean fonts. In tests, inject bytes via `injectFonts`. */
export function loadHwpxFonts(
  onProgress?: (loadedBytes: number, totalBytes: number) => void,
): Promise<HwpxFonts> {
  if (!fontCache) {
    fontCache = (async () => {
      const progress: Record<FontKey, number> = {
        gothicRegular: 0,
        gothicBold: 0,
        myeongjoRegular: 0,
        myeongjoBold: 0,
      };
      const loaded = {} as Record<FontKey, Uint8Array>;
      await Promise.all(
        FONT_SOURCES.map(async ([key, url]) => {
          const res = await fetch(url);
          if (!res.ok || !res.body) throw new Error(`font fetch failed: ${url}`);
          const reader = res.body.getReader();
          const chunks: Uint8Array[] = [];
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            progress[key] += value.length;
            onProgress?.(
              FONT_SOURCES.reduce((s, f) => s + progress[f[0]], 0),
              FONT_TOTAL,
            );
          }
          const out = new Uint8Array(progress[key]);
          let offset = 0;
          for (const c of chunks) {
            out.set(c, offset);
            offset += c.length;
          }
          loaded[key] = out;
        }),
      );
      return loaded as unknown as HwpxFonts;
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
