import type { PDFDocument, PDFPage, PDFFont, RGB } from '@cantoo/pdf-lib';
import { concatTransformationMatrix, popGraphicsState, pushGraphicsState } from '@cantoo/pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getPdfLib } from './pdf-lib';
import type {
  HwpxBorderFill,
  HwpxCell,
  HwpxCharStyle,
  HwpxDoc,
  HwpxLineSeg,
  HwpxPage,
  HwpxPara,
  HwpxParaItem,
  HwpxTable,
} from './hwpx-parse';

/**
 * HWPX document model → PDF. Layout engine v2: producer line segmentation
 * (linesegarray) drives line breaks when available, tables are laid out on
 * their declared grid (cellAddr/cellSpan/cellSz) with per-side borders from
 * borderFills, and the document font class (gothic vs batang/myeongjo) picks
 * the embedded Nanum family. Italic is sheared, PAGE/DATE fields are dynamic,
 * shaded characters get a background. Everything runs locally in the browser.
 */

export interface HwpxFonts {
  gothicRegular: Uint8Array;
  gothicBold: Uint8Array;
  myeongjoRegular: Uint8Array;
  myeongjoBold: Uint8Array;
}

export interface RenderProgress {
  page: number;
  pages: number;
}

const MIN_ROW_HEIGHT = 12;

const hexColor = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const isLatinWordChar = (ch: string): boolean => /[A-Za-z0-9]/.test(ch);
const SERIF_RE = /바탕|명조|batang|myeongjo|serif/i;
const ITALIC_SHEAR = 0.21;

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

function collectTokens(items: HwpxParaItem[]): Token[] | null {
  // Returns null when non-text items make char-offset mapping unsafe.
  const tokens: Token[] = [];
  for (const item of items) {
    if (item.kind === 'text') {
      for (const ch of item.text) {
        if (ch === '\n' || ch === '\r') continue;
        tokens.push({ ch: ch === '\t' ? '⇥' : ch, seg: { text: '', char: item.char } });
      }
    } else if (item.kind === 'field') {
      for (const ch of item.text) tokens.push({ ch, seg: { text: '', char: item.char } });
    } else {
      return null;
    }
  }
  return tokens;
}

function wrapText(items: HwpxParaItem[], maxWidth: number, meas: Measurer): LayoutLine[] {
  const tokens = collectTokens(items) ?? [];
  const lines: LayoutLine[] = [];
  let cur: Token[] = [];
  let curWidth = 0;
  let curHeight = 0;
  let wordStart = -1;
  let wordWidth = 0;

  const tokenWidth = (t: Token): number => (t.ch === '⇥' ? 0 : meas.widthOf(t.ch, t.seg.char.sizePt));

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
        const overflow = cur.splice(wordStart);
        const overflowWidth = overflow.reduce((s, x) => s + tokenWidth(x), 0);
        curWidth -= overflowWidth;
        flush();
        cur = overflow;
        curWidth = overflowWidth;
        curHeight = Math.max(...overflow.map((x) => x.seg.char.sizePt));
      } else if (isWord && wordStart === 0 && wordWidth + chWidth > maxWidth) {
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

interface PageState {
  page: PDFPage;
  index: number;
  y: number;
  contentBottom: number;
  contentLeft: number;
  contentWidth: number;
  height: number;
  /** vertpos of the first lineseg placed on the current page (reset detection). */
  vertAnchor: number | null;
}

export async function renderHwpxToPdf(
  doc: HwpxDoc,
  fonts: HwpxFonts,
  onProgress?: (p: RenderProgress) => void,
): Promise<{ bytes: Uint8Array; pages: number }> {
  const { rgb, PDFDocument } = await getPdfLib();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(doc.title ?? 'HWPX converted');

  // ---- font family selection: dominant declared font wins ----
  const familyVotes = { serif: 0, sans: 0 };
  for (const section of doc.sections) {
    for (const block of section.blocks) walkBlocks(block, (item) => {
      if (item.kind === 'text' || item.kind === 'field') {
        if (SERIF_RE.test(item.char.fontFamily)) familyVotes.serif += item.text.length || 1;
        else familyVotes.sans += item.text.length || 1;
      }
    });
  }
  const useSerif = familyVotes.serif > familyVotes.sans;

  const fontRegular = (await pdf.embedFont(
    useSerif ? fonts.myeongjoRegular : fonts.gothicRegular,
    { subset: true },
  )) as unknown as PDFFont;
  const fontBold = (await pdf.embedFont(
    useSerif ? fonts.myeongjoBold : fonts.gothicBold,
    { subset: true },
  )) as unknown as PDFFont;

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
  const state: PageState = {
    page: null as unknown as PDFPage,
    index: 0,
    y: 0,
    contentBottom: 0,
    contentLeft: 0,
    contentWidth: 0,
    height: 0,
    vertAnchor: null as number | null,
  };

  const newPage = (setup: HwpxPage): void => {
    state.page = pdf.addPage([setup.width, setup.height]);
    state.index = ++totalPages;
    state.y = setup.margin.top;
    state.contentBottom = setup.height - setup.margin.bottom;
    state.contentLeft = setup.margin.left;
    state.contentWidth = setup.width - setup.margin.left - setup.margin.right;
    state.height = setup.height;
    state.vertAnchor = null;
    onProgress?.({ page: totalPages, pages: 0 });
  };

  const ensureSpace = (height: number, setup: HwpxPage): void => {
    if (state.y + height > state.contentBottom) newPage(setup);
  };

  const page = (): PDFPage => state.page;
  const lineY = (baselineFromTop: number): number => state.height - baselineFromTop;

  // ---- segment drawing (shared by flow and lineseg paths) ----
  const drawSegments = (
    segments: TextSegment[],
    x: number,
    baselineFromTop: number,
    extraCharSpace: number,
  ): void => {
    let cx = x;
    const baselinePdfY = lineY(baselineFromTop);
    for (const seg of segments) {
      if (!seg.text) continue;
      const font = pickFont(seg.char);
      const spacing = extraCharSpace * seg.text.length;
      if (seg.char.shade) {
        const w = font.widthOfTextAtSize(seg.text, seg.char.sizePt) + spacing;
        page().drawRectangle({
          x: cx,
          y: baselinePdfY - seg.char.sizePt * 0.85,
          width: w,
          height: seg.char.sizePt * 1.08,
          color: colorOf(seg.char.shade),
        });
      }
      if (seg.char.italic) {
        page().pushOperators(pushGraphicsState(), concatTransformationMatrix(1, 0, ITALIC_SHEAR, 1, 0, 0));
        page().drawText(seg.text, {
          x: cx - ITALIC_SHEAR * baselinePdfY,
          y: baselinePdfY,
          size: seg.char.sizePt,
          font,
          color: colorOf(seg.char.color),
          characterSpacing: extraCharSpace || undefined,
        });
        page().pushOperators(popGraphicsState());
      } else {
        page().drawText(seg.text, {
          x: cx,
          y: baselinePdfY,
          size: seg.char.sizePt,
          font,
          color: colorOf(seg.char.color),
          characterSpacing: extraCharSpace || undefined,
        });
      }
      if (seg.char.underline) {
        const w = font.widthOfTextAtSize(seg.text, seg.char.sizePt) + spacing;
        const uy = baselinePdfY + seg.char.sizePt * 0.08;
        page().drawLine({
          start: { x: cx, y: uy },
          end: { x: cx + w, y: uy },
          thickness: Math.max(0.5, seg.char.sizePt * 0.05),
          color: colorOf(seg.char.color),
        });
      }
      cx += font.widthOfTextAtSize(seg.text, seg.char.sizePt) + spacing;
    }
  };

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
    drawSegments(line.segments, x, baseline, extraCharSpace);
    state.y += lineHeight;
  };

  /**
   * Line positions taken from the producer's linesegarray. Hangul stores
   * ABSOLUTE positions from the page text-area top: vertpos grows through
   * the page and resets when a new page starts (a paragraph spanning pages
   * is split by the producer). A reset is detected when a paragraph's first
   * line sits above the current flow position → new page.
   */
  const drawParaWithSegs = (para: HwpxPara, segs: HwpxLineSeg[], setup: HwpxPage): void => {
    const tokens = collectTokens(para.items);
    if (!tokens) return;
    const style = para.style;
    const abs = (vertposHwp: number): number => setup.margin.top + vertposHwp / 100;

    if (tokens.length > 0) {
      // alignment sanity: char offsets must cover the token stream
      const last = segs[segs.length - 1];
      if (segs[0].textpos !== 0 || last.textpos > tokens.length) {
        const lines = wrapText(para.items, state.contentWidth - style.indentPt, meas);
        lines.forEach((line, i) => drawLine(line, para, i === lines.length - 1, setup));
        return;
      }

      for (let li = 0; li < segs.length; li += 1) {
        const seg = segs[li];
        const start = seg.textpos;
        const end = li + 1 < segs.length ? segs[li + 1].textpos : tokens.length;
        if (end <= start) continue;

        // page detection: within a page vertpos never decreases; a drop
        // means the producer moved to the next page
        if (state.vertAnchor === null) state.vertAnchor = seg.vertpos;
        if (seg.vertpos < state.vertAnchor) {
          newPage(setup);
          state.vertAnchor = seg.vertpos;
        }

        const lineTokens = tokens.slice(start, end);
        const baseline = abs(seg.vertpos + seg.baseline);
        // safety: producer overflow (shouldn't happen) → advance to next page
        if (baseline > state.contentBottom + seg.vertsize / 100) {
          newPage(setup);
          state.vertAnchor = seg.vertpos;
        }

        const segments: TextSegment[] = [];
        let buf = '';
        let lastSeg: TextSegment | null = null;
        for (const t of lineTokens) {
          if (t.seg !== lastSeg) {
            if (buf && lastSeg) segments.push({ text: buf, char: lastSeg.char });
            buf = '';
            lastSeg = t.seg;
          }
          buf += t.ch === '⇥' ? ' ' : t.ch;
        }
        if (buf && lastSeg) segments.push({ text: buf, char: lastSeg.char });

        let x = state.contentLeft + style.indentPt + seg.horzpos / 100;
        let extraCharSpace = 0;
        const lineWidth = segments.reduce(
          (s, sg) => s + pickFont(sg.char).widthOfTextAtSize(sg.text, sg.char.sizePt),
          0,
        );
        const align = style.align;
        if (align === 'CENTER') x = state.contentLeft + Math.max(0, (state.contentWidth - lineWidth) / 2);
        else if (align === 'RIGHT') x = state.contentLeft + state.contentWidth - lineWidth;
        else if (align === 'JUSTIFY' || align === 'DISTRIBUTE') {
          const charCount = segments.reduce((s, sg) => s + sg.text.length, 0);
          const target = seg.horzsize / 100;
          if (li + 1 < segs.length && charCount > 1 && target > lineWidth) {
            const gap = (target - lineWidth) / (charCount - 1);
            if (gap <= (seg.vertsize / 100) * 0.4) extraCharSpace = gap;
          }
        }
        drawSegments(segments, x, baseline, extraCharSpace);
      }
    }

    const lastSeg = segs[segs.length - 1];
    const segBottom = abs(lastSeg.vertpos + lastSeg.vertsize + lastSeg.spacing);
    // absolute placement must never move the flow cursor backwards
    // (tables / fallback paragraphs may already have drawn further down)
    state.y = Math.max(state.y, segBottom);
  };

  const layoutCell = (cell: HwpxCell, width: number): CellParaLayout[] =>
    cell.blocks
      .filter((b): b is HwpxPara => b.kind === 'p')
      .map((p) => ({
        lines: wrapText(p.items, width, meas),
        spacing: p.style.spacing,
        before: p.style.spaceBeforePt,
        after: p.style.spaceAfterPt,
      }));

  const cellContentHeight = (layouts: CellParaLayout[]): number =>
    layouts.reduce(
      (s, l) => s + l.before + l.after + l.lines.reduce((a, line) => a + line.height * l.spacing, 0),
      0,
    );

  const drawCellContent = (layouts: CellParaLayout[], left: number, top: number): void => {
    let cy = top;
    for (const l of layouts) {
      cy += l.before;
      for (const line of l.lines) {
        const lh = line.height * l.spacing;
        const baseline = cy + lh * 0.78;
        drawSegments(line.segments, left, baseline, 0);
        cy += lh;
      }
      cy += l.after;
    }
  };

  const borderSide = (fill: HwpxBorderFill | undefined, side: 'left' | 'right' | 'top' | 'bottom') =>
    fill?.[side];

  const drawTable = (table: HwpxTable, setup: HwpxPage): void => {
    interface GridCell {
      cell: HwpxCell;
      col: number;
      row: number;
      colSpan: number;
      rowSpan: number;
    }
    const cells: GridCell[] = [];
    let colCount = 0;
    let rowCount = 0;
    for (const row of table.rows) {
      for (const cell of row.cells) {
        cells.push({ cell, col: cell.colAddr, row: cell.rowAddr, colSpan: cell.colSpan, rowSpan: cell.rowSpan });
        colCount = Math.max(colCount, cell.colAddr + cell.colSpan);
        rowCount = Math.max(rowCount, cell.rowAddr + cell.rowSpan);
      }
    }
    if (colCount === 0 || rowCount === 0) return;

    // column widths: prefer span-1 declared widths, fill the rest evenly
    const colWidths: number[] = Array.from({ length: colCount }, () => 0);
    for (const c of cells) {
      if (c.colSpan === 1 && c.cell.widthPt) colWidths[c.col] = Math.max(colWidths[c.col], c.cell.widthPt);
    }
    const known = colWidths.filter((w) => w > 0);
    const fallback = known.length ? known.reduce((a, b) => a + b, 0) / known.length : state.contentWidth / colCount;
    for (let i = 0; i < colCount; i += 1) if (colWidths[i] === 0) colWidths[i] = fallback;
    const widthSum = colWidths.reduce((a, b) => a + b, 0);
    const scale = state.contentWidth / widthSum;
    const widths = colWidths.map((w) => w * scale);

    // row heights: explicit cellSz (split across spans) vs content height
    const rowHeights: number[] = Array.from({ length: rowCount }, () => 0);
    const cellLayouts = new Map<GridCell, CellParaLayout[]>();
    for (const c of cells) {
      const w = widths.slice(c.col, c.col + c.colSpan).reduce((a, b) => a + b, 0);
      const padX = c.cell.margin.left + c.cell.margin.right;
      const layouts = layoutCell(c.cell, Math.max(10, w - padX));
      cellLayouts.set(c, layouts);
      const contentH = cellContentHeight(layouts) + c.cell.margin.top + c.cell.margin.bottom;
      const declared = c.cell.heightPt ? c.cell.heightPt / c.rowSpan : 0;
      const perRow = Math.max(contentH / c.rowSpan, declared, MIN_ROW_HEIGHT / c.rowSpan);
      rowHeights[c.row] = Math.max(rowHeights[c.row], perRow);
    }
    for (let r = 0; r < rowCount; r += 1) rowHeights[r] = Math.max(rowHeights[r], MIN_ROW_HEIGHT);

    const colLeft = (c: number): number =>
      state.contentLeft + widths.slice(0, c).reduce((a, b) => a + b, 0);

    // whole-table height (rows are not split across pages yet)
    const tableHeight = rowHeights.reduce((a, b) => a + b, 0);
    const pageCapacity = state.contentBottom - setup.margin.top;
    if (state.y + tableHeight > state.contentBottom && tableHeight <= pageCapacity) {
      newPage(setup);
    }

    const tableTop = state.y;
    for (const c of cells) {
      const left = colLeft(c.col);
      const top = tableTop + rowHeights.slice(0, c.row).reduce((a, b) => a + b, 0);
      const w = widths.slice(c.col, c.col + c.colSpan).reduce((a, b) => a + b, 0);
      const h = rowHeights.slice(c.row, c.row + c.rowSpan).reduce((a, b) => a + b, 0);
      const layouts = cellLayouts.get(c) ?? [];
      const innerTop = top + c.cell.margin.top;
      drawCellContent(layouts, left + c.cell.margin.left, innerTop);

      const fill = c.cell.borderFillId ? doc.borderFills.get(c.cell.borderFillId) : undefined;
      const sides: ['top' | 'bottom' | 'left' | 'right', number, number, number, number][] = [
        ['top', left, top, left + w, top],
        ['bottom', left, top + h, left + w, top + h],
        ['left', left, top, left, top + h],
        ['right', left + w, top, left + w, top + h],
      ];
      for (const [side, x1, y1, x2, y2] of sides) {
        const s = borderSide(fill, side);
        if (!s || s.type === 'NONE') continue;
        page().drawLine({
          start: { x: x1, y: lineY(y1) },
          end: { x: x2, y: lineY(y2) },
          thickness: Math.max(0.3, s.widthPt),
          color: colorOf(s.color),
        });
      }
    }
    state.y = tableTop + tableHeight;
  };

  const drawPara = async (para: HwpxPara, setup: HwpxPage): Promise<void> => {
    state.y += para.style.spaceBeforePt;
    const hasNonText = para.items.some((i) => i.kind === 'img' || i.kind === 'tbl');
    const textItems = para.items.filter(
      (i): i is Extract<HwpxParaItem, { kind: 'text' | 'field' }> => i.kind === 'text' || i.kind === 'field',
    );

    if (textItems.length && para.lineSegs && !hasNonText) {
      drawParaWithSegs(para, para.lineSegs, setup);
    } else if (textItems.length) {
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
      else drawTable(block as HwpxTable, section.page);
    }
  }

  onProgress?.({ page: totalPages, pages: totalPages });
  const bytes = await pdf.save();
  return { bytes, pages: totalPages };
}

function walkBlocks(block: import('./hwpx-parse').HwpxBlock, fn: (item: HwpxParaItem) => void): void {
  if (block.kind === 'p') {
    for (const item of block.items) {
      fn(item);
      if (item.kind === 'tbl') {
        for (const row of item.rows) for (const cell of row.cells) for (const b of cell.blocks) walkBlocks(b, fn);
      }
    }
  }
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
