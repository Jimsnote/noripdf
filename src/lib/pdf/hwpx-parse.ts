import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

/**
 * HWPX (한글 2014+, OWPML) → document model.
 * HWPX is an OPC zip: Contents/header.xml holds char/para styles, border
 * fills and font faces; Contents/content.hpf is an OPF-like spine pointing
 * at sectionN.xml; each <sec> holds <p> paragraphs whose <run> children
 * carry text, tables and pictures. Tables are grid-addressed: every <tc>
 * declares <cellAddr colAddr rowAddr>, <cellSpan colSpan rowSpan>,
 * <cellSz width height> and <cellMargin>. Paragraphs saved by Hangul carry
 * a <linesegarray> with the producer's own line segmentation.
 * Reference semantics cross-checked against @ssabrojs/hwpxjs (MIT).
 */

export const HWPUNIT_PER_PT = 100;

export interface HwpxPage {
  width: number; // pt
  height: number; // pt
  margin: { top: number; right: number; bottom: number; left: number }; // pt
}

export interface HwpxCharStyle {
  sizePt: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string; // #rrggbb
  fontFamily: string; // declared font face (mapped at render time)
  shade: string | null; // #rrggbb background, null = none
}

export interface HwpxParaStyle {
  align: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY' | 'DISTRIBUTE' | 'NONE';
  spacing: number; // line height multiplier (1.6 = 160%)
  spaceBeforePt: number;
  spaceAfterPt: number;
  indentPt: number;
}

/** Producer-computed line metrics (units: HWPUNIT unless noted). */
export interface HwpxLineSeg {
  textpos: number; // char offset where the line starts
  vertpos: number; // line area top, relative to paragraph top
  vertsize: number; // line area height
  baseline: number; // baseline offset within the line area
  spacing: number; // gap between this line area and the next
  horzpos: number; // line left offset
  horzsize: number; // line width
}

export interface HwpxTextRun {
  kind: 'text';
  text: string;
  char: HwpxCharStyle;
}

export interface HwpxImageRun {
  kind: 'img';
  data: Uint8Array;
  widthPt: number;
  heightPt: number;
}

export interface HwpxFieldRun {
  kind: 'field';
  fieldType: string; // e.g. 'PAGE', 'DATE'
  text: string;
  char: HwpxCharStyle;
}

export type HwpxRun = HwpxTextRun | HwpxImageRun | HwpxFieldRun;

export interface HwpxPara {
  kind: 'p';
  style: HwpxParaStyle;
  items: HwpxParaItem[];
  lineSegs: HwpxLineSeg[] | null;
}

export type HwpxParaItem = HwpxRun | HwpxTable;

export interface HwpxTable {
  kind: 'tbl';
  rows: HwpxRow[];
}

export interface HwpxRow {
  cells: HwpxCell[];
}

export interface HwpxCell {
  colAddr: number;
  rowAddr: number;
  colSpan: number;
  rowSpan: number;
  widthPt: number | null; // cellSz
  heightPt: number | null;
  margin: { left: number; right: number; top: number; bottom: number }; // pt
  borderFillId: string | null;
  blocks: HwpxBlock[];
}

export type HwpxBlock = HwpxPara | HwpxTable;

export interface HwpxBorderSide {
  type: string; // SOLID, NONE, ...
  widthPt: number;
  color: string;
}

export interface HwpxBorderFill {
  left: HwpxBorderSide;
  right: HwpxBorderSide;
  top: HwpxBorderSide;
  bottom: HwpxBorderSide;
}

export interface HwpxDoc {
  title: string | null;
  encrypted: boolean;
  sections: HwpxSection[];
  borderFills: Map<string, HwpxBorderFill>;
}

export interface HwpxSection {
  page: HwpxPage;
  blocks: HwpxBlock[];
}

export class HwpxError extends Error {}

const arr = <T>(v: T | T[] | undefined | null): T[] =>
  v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};

/** "0.1 mm" / "1.0 pt" / "2 pt" style attribute → pt. */
export function widthAttrToPt(v: unknown, fallback = 0.5): number {
  const s = String(v ?? '');
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return fallback;
  if (s.includes('mm')) return (n / 25.4) * 72;
  if (s.includes('pt')) return n;
  if (s.includes('inch')) return n * 72;
  return n; // bare number: treat as pt
}

const hwpunitToPt = (v: unknown, fallback = 0): number => num(v, fallback) / HWPUNIT_PER_PT;

let parser: XMLParser | null = null;

function parseXml(xml: string): unknown {
  if (!parser) {
    parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@',
      trimValues: false,
      removeNSPrefix: true,
      parseTagValue: false,
      parseAttributeValue: false,
    });
  }
  return parser.parse(xml);
}

function textOf(node: unknown): string {
  if (node === undefined || node === null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'object') return textOf((node as Record<string, unknown>)['#text']);
  return '';
}

const DEFAULT_CHAR: HwpxCharStyle = {
  sizePt: 10,
  bold: false,
  italic: false,
  underline: false,
  color: '#000000',
  fontFamily: '',
  shade: null,
};

const DEFAULT_PARA: HwpxParaStyle = {
  align: 'LEFT',
  spacing: 1.6,
  spaceBeforePt: 0,
  spaceAfterPt: 0,
  indentPt: 0,
};

export async function parseHwpx(bytes: Uint8Array): Promise<HwpxDoc> {
  const zip = await JSZip.loadAsync(bytes);
  const files = new Map<string, Uint8Array>();
  await Promise.all(
    Object.keys(zip.files).map(async (name) => {
      const entry = zip.file(name);
      if (entry) files.set(name, await entry.async('uint8array'));
    }),
  );

  const textFile = (path: string): string | null => {
    const b = files.get(path);
    return b ? new TextDecoder('utf-8').decode(b) : null;
  };
  const findIgnoreCase = (path: string): string | null => {
    const lower = path.toLowerCase();
    for (const key of files.keys()) if (key.toLowerCase() === lower) return key;
    return null;
  };

  const encrypted = (() => {
    const manifestXml = textFile('META-INF/manifest.xml');
    return manifestXml !== null && /encrypt|cipher/i.test(manifestXml);
  })();
  if (encrypted) throw new HwpxError('encrypted');

  // ---- styles from header.xml ----
  const charStyles = new Map<string, HwpxCharStyle>();
  const paraStyles = new Map<string, HwpxParaStyle>();
  const borderFills = new Map<string, HwpxBorderFill>();
  const hangulFaces = new Map<string, string>(); // font id → face name
  const latinFaces = new Map<string, string>();
  const styleCharRef = new Map<string, string>();
  const styleParaRef = new Map<string, string>();
  let title: string | null = null;

  const headerXml = textFile('Contents/header.xml');
  if (headerXml) {
    const header = parseXml(headerXml) as Record<string, unknown> | null;
    const refList = (header as { head?: { refList?: Record<string, unknown> } })?.head?.refList;
    if (refList) {
      const rl = refList as Record<string, unknown>;

      const fontfaces = (rl.fontfaces as { fontface?: unknown })?.fontface;
      for (const ff of arr(fontfaces as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        const lang = String(ff['@lang'] ?? '');
        const fonts = arr((ff as { font?: unknown }).font as Record<string, unknown> | Record<string, unknown>[] | undefined);
        for (const fo of fonts) {
          const id = String(fo['@id'] ?? '');
          const face = String(fo['@face'] ?? '');
          if (!id || !face) continue;
          if (lang === 'HANGUL') hangulFaces.set(id, face);
          if (lang === 'LATIN') latinFaces.set(id, face);
          // OTHER/JAPANESE etc. ignored for font choice
        }
      }

      const borderFillsXml = (rl.borderFills as { borderFill?: unknown })?.borderFill;
      for (const bf of arr(borderFillsXml as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        const id = String(bf['@id'] ?? '');
        if (!id) continue;
        const side = (name: string): HwpxBorderSide => {
          const s = (bf as Record<string, unknown>)[name] as Record<string, unknown> | undefined;
          return {
            type: String(s?.['@type'] ?? 'NONE'),
            widthPt: widthAttrToPt(s?.['@width'], 0.5),
            color: String(s?.['@color'] ?? '#000000'),
          };
        };
        borderFills.set(id, {
          left: side('leftBorder'),
          right: side('rightBorder'),
          top: side('topBorder'),
          bottom: side('bottomBorder'),
        });
      }

      const charProps = (rl.charProperties as { charPr?: unknown })?.charPr;
      for (const cp of arr(charProps as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        const c = cp as Record<string, unknown>;
        const id = String(c['@id'] ?? '');
        if (!id) continue;
        const underline = c.underline as Record<string, unknown> | undefined;
        const fontRef = c.fontRef as Record<string, unknown> | undefined;
        const hangulId = String(fontRef?.['@hangul'] ?? '');
        const latinId = String(fontRef?.['@latin'] ?? '');
        const shade = String(c['@shadeColor'] ?? 'none');
        charStyles.set(id, {
          sizePt: hwpunitToPt(c['@height'], 1000),
          bold: c.bold !== undefined,
          italic: c.italic !== undefined,
          underline: underline !== undefined && String(underline['@type'] ?? 'BOTTOM') !== 'NONE',
          color: String(c['@textColor'] ?? '#000000'),
          fontFamily: hangulFaces.get(hangulId) ?? latinFaces.get(latinId) ?? '',
          shade: shade !== 'none' && /^#[0-9a-fA-F]{6}/.test(shade) ? shade : null,
        });
      }

      const paraProps = (rl.paraProperties as { paraPr?: unknown })?.paraPr;
      for (const pp of arr(paraProps as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        const p = pp as Record<string, unknown>;
        const id = String(p['@id'] ?? '');
        if (!id) continue;
        const align = (p.align as Record<string, unknown> | undefined)?.['@horizontal'];
        const spacing = p.lineSpacing as Record<string, unknown> | undefined;
        let spacingMult = 1.6;
        if (spacing) {
          const type = String(spacing['@type'] ?? 'PERCENT');
          const value = num(spacing['@value'], 160);
          if (type === 'PERCENT') spacingMult = value / 100;
          else if (type === 'BETWEEN') spacingMult = Math.max(0.5, value / 1000 / 10);
        }
        const margin = p.margin as Record<string, unknown> | undefined;
        const m = (names: string[]): Record<string, unknown> | undefined => {
          for (const n of names) {
            const v = margin?.[n] as Record<string, unknown> | undefined;
            if (v) return v;
          }
          return undefined;
        };
        paraStyles.set(id, {
          align: (align as HwpxParaStyle['align']) ?? 'LEFT',
          spacing: spacingMult,
          spaceBeforePt: hwpunitToPt(m(['hc:prev', 'prev'])?.['@value'], 0),
          spaceAfterPt: hwpunitToPt(m(['hc:next', 'next'])?.['@value'], 0),
          indentPt: hwpunitToPt(m(['hc:intent', 'intent'])?.['@value'], 0),
        });
      }
    }
    const styles = (header as { head?: { styles?: { style?: unknown } } })?.head?.styles?.style;
    for (const s of arr(styles as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
      const st = s as Record<string, unknown>;
      const id = String(st['@id'] ?? '');
      if (!id) continue;
      if (st['@charPrIDRef'] !== undefined) styleCharRef.set(id, String(st['@charPrIDRef']));
      if (st['@paraPrIDRef'] !== undefined) styleParaRef.set(id, String(st['@paraPrIDRef']));
    }
  }

  const contentHpf = textFile('Contents/content.hpf');
  if (contentHpf) {
    const hpf = parseXml(contentHpf) as { package?: { metadata?: Record<string, unknown> } } | null;
    const md = hpf?.package?.metadata;
    const t = md?.['dc:title'] ?? md?.title;
    if (typeof t === 'string' && t.trim()) title = t.trim();
  }

  const resolveChar = (ref: string | undefined): HwpxCharStyle =>
    (ref !== undefined && charStyles.get(String(ref))) || DEFAULT_CHAR;
  const resolvePara = (ref: string | undefined): HwpxParaStyle =>
    (ref !== undefined && paraStyles.get(String(ref))) || DEFAULT_PARA;

  // ---- section file list ----
  let sectionPaths: string[] = [];
  if (contentHpf) {
    const hpf = parseXml(contentHpf) as
      | { package?: { manifest?: { item?: unknown }; spine?: { itemref?: unknown } } }
      | null;
    const items = arr(hpf?.package?.manifest?.item as Record<string, unknown> | Record<string, unknown>[] | undefined);
    const hrefById = new Map<string, string>();
    for (const it of items) {
      const id = String(it['@id'] ?? '');
      const href = String(it['@href'] ?? '');
      if (id && href && /Contents\/section\d+\.xml$/i.test(href) && files.has(href)) hrefById.set(id, href);
    }
    for (const ref of arr(hpf?.package?.spine?.itemref as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
      const href = hrefById.get(String(ref['@idref'] ?? ''));
      if (href) sectionPaths.push(href);
    }
  }
  if (sectionPaths.length === 0) {
    sectionPaths = [...files.keys()]
      .filter((p) => /^contents\/section\d+\.xml$/i.test(p))
      .sort((a, b) => num(a.match(/section(\d+)\.xml/i)?.[1]) - num(b.match(/section(\d+)\.xml/i)?.[1]));
  }

  // ---- walk ----
  const parseTable = (tbl: Record<string, unknown>): HwpxTable => {
    const rows: HwpxRow[] = [];
    for (const tr of arr((tbl.tr ?? tbl['hp:tr']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
      const cells: HwpxCell[] = [];
      for (const tc of arr((tr.tc ?? tr['hp:tc']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        const addr = tc.cellAddr as Record<string, unknown> | undefined;
        const span = tc.cellSpan as Record<string, unknown> | undefined;
        const sz = tc.cellSz as Record<string, unknown> | undefined;
        const cm = tc.cellMargin as Record<string, unknown> | undefined;
        const sub = (tc.subList ?? tc['hp:subList']) as Record<string, unknown> | undefined;
        const blocks: HwpxBlock[] = [];
        for (const p of arr((sub?.p ?? sub?.['hp:p']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
          const pb = parsePara(p);
          if (pb) blocks.push(pb);
        }
        cells.push({
          colAddr: num(addr?.['@colAddr'], cells.length),
          rowAddr: num(addr?.['@rowAddr'], rows.length),
          colSpan: Math.max(1, num(span?.['@colSpan'], 1)),
          rowSpan: Math.max(1, num(span?.['@rowSpan'], 1)),
          widthPt: sz?.['@width'] !== undefined ? hwpunitToPt(sz['@width']) : null,
          heightPt: sz?.['@height'] !== undefined ? hwpunitToPt(sz['@height']) : null,
          margin: {
            left: hwpunitToPt(cm?.['@left'], 280),
            right: hwpunitToPt(cm?.['@right'], 280),
            top: hwpunitToPt(cm?.['@top'], 140),
            bottom: hwpunitToPt(cm?.['@bottom'], 140),
          },
          borderFillId: tc['@borderFillIDRef'] !== undefined ? String(tc['@borderFillIDRef']) : null,
          blocks,
        });
      }
      rows.push({ cells });
    }
    return { kind: 'tbl', rows };
  };

  const parsePara = (p: Record<string, unknown>): HwpxPara | null => {
    const styleId = p['@styleIDRef'] !== undefined ? String(p['@styleIDRef']) : undefined;
    const basePara = resolvePara(
      p['@paraPrIDRef'] !== undefined ? String(p['@paraPrIDRef']) : styleParaRef.get(styleId ?? ''),
    );
    const items: HwpxParaItem[] = [];
    let lineSegs: HwpxLineSeg[] | null = null;

    for (const ls of arr((p.linesegarray ?? p['hp:linesegarray']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
      const segs: HwpxLineSeg[] = [];
      for (const seg of arr((ls.lineseg ?? ls['hp:lineseg']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        segs.push({
          textpos: num(seg['@textpos'], 0),
          vertpos: num(seg['@vertpos'], 0),
          vertsize: num(seg['@vertsize'], 1000),
          baseline: num(seg['@baseline'], 850),
          spacing: num(seg['@spacing'], 600),
          horzpos: num(seg['@horzpos'], 0),
          horzsize: num(seg['@horzsize'], 0),
        });
      }
      if (segs.length) lineSegs = segs;
    }

    for (const run of arr((p.run ?? p['hp:run']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
      if (run.secPr || run.ctrl) continue; // section config / column props
      const charRef = run['@charPrIDRef'] !== undefined ? String(run['@charPrIDRef']) : styleCharRef.get(styleId ?? '');
      const char = resolveChar(charRef);
      const text = textOf(run.t ?? run['hp:t']);
      if (text) items.push({ kind: 'text', text, char });
      for (const tbl of arr((run.tbl ?? run['hp:tbl']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        const t = parseTable(tbl as Record<string, unknown>);
        if (t.rows.length) items.push(t);
      }
      for (const pic of arr((run.pic ?? run['hp:pic']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        const imgRef = (pic.img as Record<string, unknown> | undefined)?.['@binaryItemIDRef'];
        const href = pic['@href'];
        const relPath =
          typeof imgRef === 'string' ? `BinData/${imgRef}` : typeof href === 'string' ? href : null;
        const actualPath = relPath ? (files.has(relPath) ? relPath : findIgnoreCase(relPath)) : null;
        const data = actualPath ? files.get(actualPath) : undefined;
        if (!data) continue;
        const sz = pic.sz as Record<string, unknown> | undefined;
        items.push({
          kind: 'img',
          data,
          widthPt: hwpunitToPt(sz?.['@width'], 144),
          heightPt: hwpunitToPt(sz?.['@height'], 144),
        });
      }
      const fld = run.fld as Record<string, unknown> | undefined;
      if (!text && fld) {
        items.push({
          kind: 'field',
          fieldType: String(fld['@type'] ?? ''),
          text: textOf(fld.t),
          char,
        });
      }
    }
    return { kind: 'p', style: basePara, items, lineSegs };
  };

  const sections: HwpxSection[] = [];
  for (const path of sectionPaths) {
    const xmlText = textFile(path);
    if (!xmlText) continue;
    const xml = parseXml(xmlText) as Record<string, unknown> | null;
    const sec = (xml?.sec ?? xml?.section) as Record<string, unknown> | undefined;
    if (!sec) continue;

    let page: HwpxPage = {
      width: 595,
      height: 842,
      margin: { top: 57, right: 57, bottom: 57, left: 57 },
    };
    const blocks: HwpxBlock[] = [];

    const walkP = (p: Record<string, unknown>) => {
      for (const run of arr((p.run ?? p['hp:run']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        const secPr = run.secPr as Record<string, unknown> | undefined;
        const pagePr = secPr?.pagePr as Record<string, unknown> | undefined;
        if (pagePr) {
          const margin = pagePr.margin as Record<string, unknown> | undefined;
          page = {
            width: hwpunitToPt(pagePr['@width'], 59528),
            height: hwpunitToPt(pagePr['@height'], 84188),
            margin: {
              top: hwpunitToPt(margin?.['@top'], 5669),
              right: hwpunitToPt(margin?.['@right'], 5669),
              bottom: hwpunitToPt(margin?.['@bottom'], 5669),
              left: hwpunitToPt(margin?.['@left'], 5669),
            },
          };
        }
      }
      const para = parsePara(p);
      if (para) blocks.push(para);
    };

    for (const p of arr((sec.p ?? sec['hp:p']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
      walkP(p);
    }
    sections.push({ page, blocks });
  }

  if (sections.length === 0) throw new HwpxError('empty');
  const totalItems = sections.reduce(
    (s, x) => s + x.blocks.reduce((a, b) => a + (b.kind === 'p' ? b.items.length : 1), 0),
    0,
  );
  if (totalItems === 0) throw new HwpxError('empty');
  return { title, encrypted: false, sections, borderFills };
}
