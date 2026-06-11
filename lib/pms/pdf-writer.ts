/**
 * Minimal, dependency-free PDF writer.
 *
 * StayFlow's sandbox has no network access to install a PDF library
 * (pdf-lib, pdfkit, etc.), so this hand-rolls just enough of the PDF 1.4
 * format to lay out a simple table report: multi-page documents, the
 * standard Helvetica / Helvetica-Bold fonts (no embedding required — these
 * are part of every PDF viewer's base 14), straight lines/rectangles, and
 * left-aligned text with basic word-wrapping.
 *
 * Coordinates passed to `drawText`/`drawLine`/`drawRect` use a top-left
 * origin with y increasing *downward* (matching how the report layout is
 * easiest to reason about); they are flipped to PDF's bottom-left/y-up
 * coordinate space internally.
 *
 * Limitations:
 *  - Only WinAnsi-range characters (roughly Latin-1, codes 32–255) render.
 *    Thai (or other non-Latin) text is replaced with "?" by `sanitizeText`
 *    since no Thai-capable font can be embedded in this environment.
 */

export type PdfFont = "helvetica" | "helvetica-bold";

// Helvetica glyph widths (1/1000 em), WinAnsiEncoding codes 32–126.
const HELVETICA_WIDTHS: number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const DEFAULT_WIDTH = 556;
// Helvetica-Bold runs ~7% wider on average than regular Helvetica.
const BOLD_FACTOR = 1.07;

function glyphWidth(code: number, bold: boolean): number {
  const base = code >= 32 && code <= 126 ? HELVETICA_WIDTHS[code - 32] : DEFAULT_WIDTH;
  return bold ? base * BOLD_FACTOR : base;
}

/**
 * Replace characters outside the renderable WinAnsi range (32–126 plus the
 * Latin-1 supplement 160–255) with "?". Thai text falls into this bucket.
 */
export function sanitizeText(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63;
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
      out += ch;
    } else if (code === 0x2018 || code === 0x2019) {
      out += "'";
    } else if (code === 0x201c || code === 0x201d) {
      out += '"';
    } else if (code === 0x2013 || code === 0x2014) {
      out += "-";
    } else {
      out += "?";
    }
  }
  return out;
}

/** Width (in points) of `text` set in `font` at `size`. */
export function textWidth(text: string, size: number, font: PdfFont = "helvetica"): number {
  const bold = font === "helvetica-bold";
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    total += glyphWidth(text.charCodeAt(i), bold);
  }
  return (total / 1000) * size;
}

/**
 * Greedy word-wrap `text` to fit within `maxWidth` points at `size`.
 * Words longer than `maxWidth` on their own are hard-broken.
 */
export function wrapText(text: string, maxWidth: number, size: number, font: PdfFont = "helvetica"): string[] {
  const clean = sanitizeText(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const lines: string[] = [];
  for (const paragraph of clean.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, size, font) <= maxWidth || !line) {
        if (textWidth(candidate, size, font) <= maxWidth) {
          line = candidate;
          continue;
        }
        // Single word longer than maxWidth: hard-break it.
        let chunk = "";
        for (const ch of word) {
          const next = chunk + ch;
          if (textWidth(next, size, font) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk = next;
          }
        }
        line = chunk;
        continue;
      }
      lines.push(line);
      line = word;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function escapePdfString(text: string): string {
  return sanitizeText(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

interface DrawTextOp {
  kind: "text";
  text: string;
  x: number;
  y: number;
  size: number;
  font: PdfFont;
}

interface DrawLineOp {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

interface DrawRectOp {
  kind: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  width: number;
  fill?: string; // grayscale 0–1, when set the rect is filled instead of stroked
}

type DrawOp = DrawTextOp | DrawLineOp | DrawRectOp;

export class PdfPage {
  readonly width: number;
  readonly height: number;
  private ops: DrawOp[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /** Draw text with its top-left baseline-ish anchor at (x, y) from the top of the page. */
  drawText(text: string, x: number, y: number, size: number, font: PdfFont = "helvetica"): void {
    if (!text) return;
    this.ops.push({ kind: "text", text, x, y, size, font });
  }

  /** Draw a stroked line from (x1,y1) to (x2,y2), y measured from the top of the page. */
  drawLine(x1: number, y1: number, x2: number, y2: number, lineWidth = 0.5): void {
    this.ops.push({ kind: "line", x1, y1, x2, y2, width: lineWidth });
  }

  /** Draw a stroked (or filled, if `fill` given as 0–1 grayscale) rectangle. */
  drawRect(x: number, y: number, w: number, h: number, lineWidth = 0.5, fill?: number): void {
    this.ops.push({ kind: "rect", x, y, w, h, width: lineWidth, fill: fill !== undefined ? String(fill) : undefined });
  }

  /** Render this page's drawing operations into a PDF content stream body. */
  toContentStream(): string {
    const parts: string[] = [];
    for (const op of this.ops) {
      if (op.kind === "text") {
        const fontKey = op.font === "helvetica-bold" ? "/F2" : "/F1";
        const py = this.height - op.y;
        parts.push("BT");
        parts.push(`${fontKey} ${op.size} Tf`);
        parts.push(`${op.x.toFixed(2)} ${py.toFixed(2)} Td`);
        parts.push(`(${escapePdfString(op.text)}) Tj`);
        parts.push("ET");
      } else if (op.kind === "line") {
        const y1 = this.height - op.y1;
        const y2 = this.height - op.y2;
        parts.push(`${op.width} w`);
        parts.push(`${op.x1.toFixed(2)} ${y1.toFixed(2)} m`);
        parts.push(`${op.x2.toFixed(2)} ${y2.toFixed(2)} l`);
        parts.push("S");
      } else if (op.kind === "rect") {
        const py = this.height - op.y - op.h;
        if (op.fill !== undefined) {
          parts.push(`${op.fill} g`);
          parts.push(`${op.x.toFixed(2)} ${py.toFixed(2)} ${op.w.toFixed(2)} ${op.h.toFixed(2)} re`);
          parts.push("f");
          parts.push("0 g");
        } else {
          parts.push(`${op.width} w`);
          parts.push(`${op.x.toFixed(2)} ${py.toFixed(2)} ${op.w.toFixed(2)} ${op.h.toFixed(2)} re`);
          parts.push("S");
        }
      }
    }
    return parts.join("\n");
  }
}

export class PdfDocument {
  private pages: PdfPage[] = [];

  addPage(width: number, height: number): PdfPage {
    const page = new PdfPage(width, height);
    this.pages.push(page);
    return page;
  }

  /** Serialize all pages into a complete PDF file. */
  build(): Buffer {
    const objects: string[] = []; // 1-indexed via objects[n-1]
    const nextObj = () => objects.length + 1;

    // Reserve object 1 = Catalog, object 2 = Pages tree (filled in last).
    objects.push(""); // 1: Catalog (placeholder)
    objects.push(""); // 2: Pages (placeholder)

    // Fonts.
    const helveticaObj = nextObj();
    objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
    const helveticaBoldObj = nextObj();
    objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);

    const pageObjNumbers: number[] = [];

    for (const page of this.pages) {
      const content = page.toContentStream();
      const contentBytes = Buffer.byteLength(content, "latin1");
      const contentObj = nextObj();
      objects.push(`<< /Length ${contentBytes} >>\nstream\n${content}\nendstream`);

      const pageObj = nextObj();
      pageObjNumbers.push(pageObj);
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] ` +
          `/Resources << /Font << /F1 ${helveticaObj} 0 R /F2 ${helveticaBoldObj} 0 R >> >> ` +
          `/Contents ${contentObj} 0 R >>`
      );
    }

    objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
    objects[1] = `<< /Type /Pages /Kids [${pageObjNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjNumbers.length} >>`;

    // Assemble the file, tracking byte offsets for the xref table.
    const chunks: string[] = [];
    let offset = 0;
    const offsets: number[] = [];

    const push = (s: string) => {
      chunks.push(s);
      offset += Buffer.byteLength(s, "latin1");
    };

    push("%PDF-1.4\n");
    for (let i = 0; i < objects.length; i++) {
      offsets.push(offset);
      push(`${i + 1} 0 obj\n${objects[i]}\nendobj\n`);
    }

    const xrefOffset = offset;
    push(`xref\n0 ${objects.length + 1}\n`);
    push("0000000000 65535 f \n");
    for (const o of offsets) {
      push(`${String(o).padStart(10, "0")} 00000 n \n`);
    }
    push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    return Buffer.from(chunks.join(""), "latin1");
  }
}
