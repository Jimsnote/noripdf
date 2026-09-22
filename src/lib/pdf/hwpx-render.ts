import type { PDFDocument, PDFPage, PDFFont, RGB } from '@cantoo/pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getPdfLib } from './pdf-lib';
import type { HwpxCharStyle, HwpxDoc, HwpxPage, HwpxPara, HwpxParaItem, HwpxTable } from './hwpx-parse';

/**
 * HWPX document model → PDF. A deliberately small layout engine: flow
 * paragraphs with CJK-aware line breaking, fixed-layout tables with borders,
 * embedded PNG/JPG pictures. Korean text is drawn with the bundled
 * Noto Sans KR (Regular + Bold). Italic is rendered upright (documented
 * limitation — Korean body text rarely uses it).
 */

export interface HwpxFonts {
  regular: Uint8Array;
  bold: Uint8Array;
}

export interface RenderProgress {
  page: number; // pages written so far
  pages: number; // total, once finished (0 while unknown)
}

const CELL_PAD_X = 4;
const CELL_PAD_Y = 3;
const TABLE_BORDER = 0.7;

const hexColor = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Korean wraps after almost every char; keep Latin/digit words whole. */
const isLatinWordChar = (ch: string): boolean => /[A-Za-z0-9]/.test(ch);

interface TextSegment {
  text: string;
  char: HwpxCharStyle;
}

interface LayoutLine {
  segments: TextSegment[];
  width: number;
  height: number;
}

interface Measurer {
  widthOf(text: string, size: number): number;
}

interface Token {
  ch: string;
  seg: TextSegment;
}

function collectTokens(items: HwpxParaItem[]): Token[] {
  const tokens: Token[] = [];
  for (const item of items) {
    if (item.kind !== 'text') continue;
    for (const ch of item.text) {
      if (ch === '\n' || ch === '\r') continue;
      tokens.push({ ch: ch === '\t' ? '⇥' : ch, seg: { text: '', char: item.char } });
    }
  }
  return tokens;
}

function wrapText(items: HwpxParaItem[], maxWidth: number, meas: Measurer): LayoutLine[] {
  const tokens = collectTokens(items);
  const lines: LayoutLine[] = [];
  let cur: Token[] = [];
  let curWidth = 0;
  let curHeight = 0;
  let wordStart = -1;
  let wordWidth = 0;

  const tokenWidth = (t: Token): number =>
    t.ch === '⇥' ? 0 : meas.widthOf(t.ch, t.seg.char.sizePt);

  const flush = () => {
    if (cur.length === 0) return;
    const segments: TextSegment[] = [];
    let buf = '';
    let last: TextSegment | null = null;
    for (const t of cur) {
      if (t.seg !== last) {
        if (buf && last) segments.push({ text: buf, char: last.char });
        buf = '';
        last = t.seg;
      }
      buf += t.ch === '⇥' ? ' ' : t.ch;
    }
    if (buf && last) segments.push({ text: buf, char: last.char });
    lines.push({ segments, width: curWidth, height: curHeight });
    cur = [];
    curWidth = 0;
    curHeight = 0;
    wordStart = -1;
    wordWidth = 0;
  };

  for (const t of tokens) {
    const size = t.seg.char.sizePt;
    const chWidth = tokenWidth(t);
    const isWord = isLatinWordChar(t.ch);
    if (isWord && wordStart === -1) {
      wordStart = cur.length;
      wordWidth = 0;
    }

    if (t.ch === '⇥') {
      const stop = Math.ceil((curWidth + 1) / (size * 4)) * (size * 4);
      curWidth = stop;
      cur.push(t);
      continue;
    }

    if (cur.length > 0 && curWidth + chWidth > maxWidth) {
      if (isWord && wordStart > 0 && curWidth - wordWidth + chWidth <= maxWidth) {
        // move the whole pending Latin word to the next line
        const overflow = cur.splice(wordStart);
        const overflowWidth = overflow.reduce((s, x) => s + tokenWidth(x), 0);
        curWidth -= overflowWidth;
        flush();
        cur = overflow;
        curWidth = overflowWidth;
        curHeight = Math.max(...overflow.map((x) => x.seg.char.sizePt));
      } else if (isWord && wordStart === 0 && wordWidth + chWidth > maxWidth) {
        // single word longer than a full line: hard-break mid-word
        flush();
        cur.push(t);
        curWidth = chWidth;
        curHeight = size;
        wordStart = 0;
        wordWidth = chWidth;
        continue;
      } else {
        flush();
      }
    }
    cur.push(t);
    curWidth += chWidth;
    curHeight = Math.max(curHeight, size);
    if (isWord) wordWidth += chWidth;
    else {
      wordStart = -1;
      wordWidth = 0;
    }
  }
  flush();
  return lines;
}

interface CellParaLayout {
  lines: LayoutLine[];
  spacing: number;
  before: number;
  after: number;
}

export interface HwpxRenderResult {
  bytes: Uint8Array;
  pages: number;
}

export async function renderHwpxToPdf(
  doc: HwpxDoc,
  fonts: HwpxFonts,
  onProgress?: (p: RenderProgress) => void,
): Promise<HwpxRenderResult> {
  const { rgb, PDFDocument } = await getPdfLib();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(doc.title ?? 'HWPX converted');
  const fontRegular = (await pdf.embedFont(fonts.regular, { subset: true })) as unknown as PDFFont;
  const fontBold = (
    fonts.bold.length ? await pdf.embedFont(fonts.bold, { subset: true }) : fontRegular
  ) as unknown as PDFFont;

  const pickFont = (c: HwpxCharStyle): PDFFont => (c.bold ? fontBold : fontRegular);
  const meas: Measurer = { widthOf: (text, size) => fontRegular.widthOfTextAtSize(text, size) };

  const colorCache = new Map<string, RGB>();
  const colorOf = (hex: string): RGB => {
    let c = colorCache.get(hex);
    if (!c) {
      const [r, g, b] = hexColor(hex);
      c = rgb(r, g, b);
      colorCache.set(hex, c);
    }
    return c;
  };

  let totalPages = 0;
  const state = {
    page: null as PDFPage | null,
    index: 0,
    y: 0,
    contentBottom: 0,
    contentLeft: 0,
    contentWidth: 0,
    height: 0,
  };

  const newPage = (setup: HwpxPage): void => {
    state.page = pdf.addPage([setup.width, setup.height]);
    state.index = ++totalPages;
    state.y = setup.margin.top;
    state.contentBottom = setup.height - setup.margin.bottom;
    state.contentLeft = setup.margin.left;
    state.contentWidth = setup.width - setup.margin.left - setup.margin.right;
    state.height = setup.height;
    onProgress?.({ page: totalPages, pages: 0 });
  };

  const ensureSpace = (height: number, setup: HwpxPage): void => {
    if (state.y + height > state.contentBottom) newPage(setup);
  };

  const page = (): PDFPage => state.page as unknown as PDFPage;
  const lineY = (baselineFromTop: number): number => state.height - baselineFromTop;

  const drawLine = (line: LayoutLine, para: HwpxPara, isLast: boolean, setup: HwpxPage): void => {
    const style = para.style;
    const lineHeight = line.height * style.spacing;
    ensureSpace(lineHeight, setup);

    let x = state.contentLeft + style.indentPt;
    const align = style.align;
    if (align === 'CENTER') x = state.contentLeft + Math.max(0, (state.contentWidth - line.width) / 2);
    else if (align === 'RIGHT') x = state.contentLeft + state.contentWidth - line.width;

    let extraCharSpace = 0;
    if ((align === 'JUSTIFY' || align === 'DISTRIBUTE') && !isLast && line.width > 0) {
      const charCount = line.segments.reduce((s, seg) => s + seg.text.length, 0);
      if (charCount > 1) {
        const deficit = state.contentWidth - style.indentPt - line.width;
        if (deficit > 0 && deficit / (charCount - 1) <= line.height * 0.4) {
          extraCharSpace = deficit / (charCount - 1);
        }
      }
    }

    const baseline = state.y + lineHeight * 0.78;
    for (const seg of line.segments) {
      const font = pickFont(seg.char);
      const spacing = extraCharSpace * seg.text.length;
      page().drawText(seg.text, {
        x,
        y: lineY(baseline),
        size: seg.char.sizePt,
        font,
        color: colorOf(seg.char.color),
        characterSpacing: extraCharSpace || undefined,
      });
      if (seg.char.underline) {
        const w = font.widthOfTextAtSize(seg.text, seg.char.sizePt) + spacing;
        const uy = lineY(baseline - seg.char.sizePt * 0.08);
        page().drawLine({
          start: { x, y: uy },
          end: { x: x + w, y: uy },
          thickness: Math.max(0.5, seg.char.sizePt * 0.05),
          color: colorOf(seg.char.color),
        });
      }
      x += font.widthOfTextAtSize(seg.text, seg.char.sizePt) + spacing;
    }
    state.y += lineHeight;
  };

  const layoutCell = (cell: { blocks: import('./hwpx-parse').HwpxBlock[] }, width: number): CellParaLayout[] =>
    cell.blocks
      .filter((b): b is HwpxPara => b.kind === 'p')
      .map((p) => ({
        lines: wrapText(p.items, width - CELL_PAD_X * 2, meas),
        spacing: p.style.spacing,
        before: p.style.spaceBeforePt,
        after: p.style.spaceAfterPt,
      }));

  const cellHeight = (layouts: CellParaLayout[]): number =>
    layouts.reduce(
      (s, l) =>
        s + l.before + l.after + l.lines.reduce((a, line) => a + line.height * l.spacing, 0),
      0,
    ) + CELL_PAD_Y * 2;

  const drawCellContent = (layouts: CellParaLayout[], left: number, top: number): void => {
    let cy = top + CELL_PAD_Y;
    for (const l of layouts) {
      cy += l.before;
      for (const line of l.lines) {
        const lh = line.height * l.spacing;
        let tx = left + CELL_PAD_X;
        const baseline = cy + lh * 0.78;
        for (const seg of line.segments) {
          const font = pickFont(seg.char);
          page().drawText(seg.text, {
            x: tx,
            y: lineY(baseline),
            size: seg.char.sizePt,
            font,
            color: colorOf(seg.char.color),
          });
          tx += font.widthOfTextAtSize(seg.text, seg.char.sizePt);
        }
        cy += lh;
      }
      cy += l.after;
    }
  };

  const drawTable = (table: HwpxTable, setup: HwpxPage): void => {
    const colCount = Math.max(...table.rows.map((r) => r.cells.length), 1);
    const widths: number[] = Array.from({ length: colCount }, () => 0);
    for (const row of table.rows) {
      row.cells.forEach((cell, i) => {
        if (cell.widthPt) widths[i] = Math.max(widths[i], cell.widthPt);
      });
    }
    if (!widths.some((w) => w !== 0)) widths.forEach((_, i) => { widths[i] = 1; });
    const widthSum = widths.reduce((a, b) => a + b, 0);
    const colWidths = widths.map((w) => (w / widthSum) * state.contentWidth);

    const tableLeft = state.contentLeft;
    for (const row of table.rows) {
      const cells = row.cells.map((cell, i) => ({
        cell,
        left: tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
        width: colWidths[i],
        layouts: layoutCell(cell, colWidths[i]),
      }));
      const rowHeight = Math.max(12, ...cells.map((c) => cellHeight(c.layouts)));
      ensureSpace(rowHeight, setup);

      const top = state.y;
      const bottom = top + rowHeight;
      for (const c of cells) drawCellContent(c.layouts, c.left, top);

      const black = colorOf('#000000');
      const topY = lineY(top);
      const botY = lineY(bottom);
      page().drawLine({ start: { x: tableLeft, y: topY }, end: { x: tableLeft + state.contentWidth, y: topY }, thickness: TABLE_BORDER, color: black });
      page().drawLine({ start: { x: tableLeft, y: botY }, end: { x: tableLeft + state.contentWidth, y: botY }, thickness: TABLE_BORDER, color: black });
      let gx = tableLeft;
      const boundaryCount = row.cells.length;
      for (let i = 0; i <= boundaryCount; i += 1) {
        page().drawLine({ start: { x: gx, y: topY }, end: { x: gx, y: botY }, thickness: TABLE_BORDER, color: black });
        if (i < boundaryCount) gx += colWidths[i];
      }
      state.y = bottom;
    }
  };

  const drawPara = async (para: HwpxPara, setup: HwpxPage): Promise<void> => {
    state.y += para.style.spaceBeforePt;
    const textItems = para.items.filter(
      (i): i is Extract<HwpxParaItem, { kind: 'text' }> => i.kind === 'text',
    );
    if (textItems.length) {
      const lines = wrapText(textItems, state.contentWidth - para.style.indentPt, meas);
      lines.forEach((line, i) => drawLine(line, para, i === lines.length - 1, setup));
    }
    for (const item of para.items) {
      if (item.kind === 'img') {
        let w = item.widthPt;
        let h = item.heightPt;
        if (w > state.contentWidth) {
          const s = state.contentWidth / w;
          w *= s;
          h *= s;
        }
        ensureSpace(h, setup);
        const image = await embedImage(pdf, item.data);
        if (image) {
          page().drawImage(image, {
            x: state.contentLeft,
            y: lineY(state.y + h),
            width: w,
            height: h,
          });
        }
        state.y += h;
      } else if (item.kind === 'tbl') {
        drawTable(item, setup);
      }
    }
    state.y += para.style.spaceAfterPt;
  };

  for (const section of doc.sections) {
    newPage(section.page);
    for (const block of section.blocks) {
      if (block.kind === 'p') await drawPara(block, section.page);
      else drawTable(block, section.page);
    }
  }

  onProgress?.({ page: totalPages, pages: totalPages });
  const bytes = await pdf.save();
  return { bytes, pages: totalPages };
}

function detectImageType(data: Uint8Array): 'png' | 'jpg' | null {
  if (data.length > 8 && data[0] === 0x89 && data[1] === 0x50) return 'png';
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8) return 'jpg';
  return null;
}

async function embedImage(pdf: PDFDocument, data: Uint8Array) {
  const type = detectImageType(data);
  if (type === 'png') return pdf.embedPng(data);
  if (type === 'jpg') return pdf.embedJpg(data);
  return null;
}
