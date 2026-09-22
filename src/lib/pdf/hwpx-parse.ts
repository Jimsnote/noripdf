import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

/**
 * HWPX (한글 2014+, OWPML) → document model.
 * HWPX is an OPC zip: Contents/header.xml holds char/para styles,
 * Contents/content.hpf is an OPF-like spine pointing at sectionN.xml,
 * each <sec> holds <p> paragraphs whose <run> children carry text,
 * tables and pictures. Reference semantics were cross-checked against
 * @ssabrojs/hwpxjs (MIT).
 */

export const HWPUNIT_PER_PT = 100;

export interface HwpxMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HwpxPage {
  width: number; // pt
  height: number; // pt
  margin: HwpxMargin; // pt
}

export interface HwpxCharStyle {
  sizePt: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string; // #rrggbb
}

export interface HwpxParaStyle {
  align: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY' | 'DISTRIBUTE' | 'NONE';
  spacing: number; // line height multiplier (1.6 = 160%)
  spaceBeforePt: number;
  spaceAfterPt: number;
  indentPt: number;
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

export type HwpxRun = HwpxTextRun | HwpxImageRun;

export interface HwpxPara {
  kind: 'p';
  style: HwpxParaStyle;
  items: HwpxParaItem[];
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
  widthPt: number | null;
  blocks: HwpxBlock[];
}

export type HwpxBlock = HwpxPara | HwpxTable;

export interface HwpxSection {
  page: HwpxPage;
  blocks: HwpxBlock[];
}

export interface HwpxDoc {
  title: string | null;
  encrypted: boolean;
  sections: HwpxSection[];
}

export class HwpxError extends Error {}

const arr = <T>(v: T | T[] | undefined | null): T[] =>
  v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};

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
    const bytes = files.get(path);
    return bytes ? new TextDecoder('utf-8').decode(bytes) : null;
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
  if (encrypted) {
    throw new HwpxError('encrypted');
  }

  // ---- styles from header.xml ----
  const charStyles = new Map<string, HwpxCharStyle>();
  const paraStyles = new Map<string, HwpxParaStyle>();
  const styleCharRef = new Map<string, string>();
  const styleParaRef = new Map<string, string>();
  let title: string | null = null;

  const headerXml = textFile('Contents/header.xml');
  if (headerXml) {
    const header = parseXml(headerXml) as Record<string, unknown> | null;
    const refList = (header as { head?: { refList?: Record<string, unknown> } })?.head?.refList;
    if (refList) {
      const charProps = (refList as { charProperties?: { charPr?: unknown } }).charProperties?.charPr;
      for (const cp of arr(charProps as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        const c = cp as Record<string, unknown>;
        const id = String(c['@id'] ?? '');
        if (!id) continue;
        const underline = c.underline as Record<string, unknown> | undefined;
        charStyles.set(id, {
          sizePt: hwpunitToPt(c['@height'], 1000),
          bold: c.bold !== undefined,
          italic: c.italic !== undefined,
          underline: underline !== undefined && String(underline['@type'] ?? 'BOTTOM') !== 'NONE',
          color: String(c['@textColor'] ?? '#000000'),
        });
      }
      const paraProps = (refList as { paraProperties?: { paraPr?: unknown } }).paraProperties?.paraPr;
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
        const prev = (margin?.['hc:prev'] ?? margin?.prev) as Record<string, unknown> | undefined;
        const next = (margin?.['hc:next'] ?? margin?.next) as Record<string, unknown> | undefined;
        const intent = (margin?.['hc:intent'] ?? margin?.intent) as Record<string, unknown> | undefined;
        paraStyles.set(id, {
          align: (align as HwpxParaStyle['align']) ?? 'LEFT',
          spacing: spacingMult,
          spaceBeforePt: hwpunitToPt(prev?.['@value'], 0),
          spaceAfterPt: hwpunitToPt(next?.['@value'], 0),
          indentPt: hwpunitToPt(intent?.['@value'], 0),
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

  // ---- title from content.hpf ----
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
      | {
          package?: {
            manifest?: { item?: unknown };
            spine?: { itemref?: unknown };
          };
        }
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
        const widthAttr = tc['@width'] ?? (tc.cellPr as Record<string, unknown> | undefined)?.['@width'];
        const sub = (tc.subList ?? tc['hp:subList']) as Record<string, unknown> | undefined;
        const blocks: HwpxBlock[] = [];
        for (const p of arr((sub?.p ?? sub?.['hp:p']) as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
          const pb = parsePara(p);
          if (pb) blocks.push(pb);
        }
        cells.push({ widthPt: widthAttr !== undefined ? hwpunitToPt(widthAttr) : null, blocks });
      }
      rows.push({ cells });
    }
    return { kind: 'tbl', rows };
  };

  const parsePara = (p: Record<string, unknown>): HwpxPara | null => {
    const styleId = p['@styleIDRef'] !== undefined ? String(p['@styleIDRef']) : undefined;
    const basePara = resolvePara(p['@paraPrIDRef'] !== undefined ? String(p['@paraPrIDRef']) : styleParaRef.get(styleId ?? ''));
    const items: HwpxParaItem[] = [];
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
      // fields (date/page number): render their literal text when present
      if (!text && run.fld) {
        const ft = textOf((run.fld as Record<string, unknown>).t);
        if (ft) items.push({ kind: 'text', text: ft, char });
      }
    }
    return { kind: 'p', style: basePara, items };
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
      // page setup lives in the first paragraph's secPr control
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

  if (sections.length === 0) {
    throw new HwpxError('empty');
  }
  return { title, encrypted: false, sections };
}
