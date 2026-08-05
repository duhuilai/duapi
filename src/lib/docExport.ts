import { save } from "@tauri-apps/plugin-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "./api";
// 字体字节在构建期由 scripts/embed-fonts.mjs 注入（base64 字符串）。
// 此处**静态**引入，确保运行期必定拿到确切字节，不依赖动态 import 的
// 代码分割 chunk（Tauri 生产 WebView 加载该 21MB chunk 可能失败而回退到
// 错误的 fetch 路径，导致 PDF 文字散乱）。静态引入会让主包增大 ~21MB，
// 但桌面应用可接受，且彻底消除字体加载的环境不确定性。
import { MSYH_TTF_B64, MSYHBD_TTF_B64 } from "./_fontBytes.generated";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  ShadingType,
  BorderStyle,
  WidthType,
} from "docx";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const BASE_CSS = `
body { font-family: 'Segoe UI','Microsoft YaHei',Arial,sans-serif; color:#1e293b; max-width: 960px; margin: 24px auto; padding: 0 16px; line-height:1.6; font-size:14px; }
h1 { color:#1E40AF; border-bottom:2px solid #DBEAFE; padding-bottom:8px; font-size:26px; }
h2 { color:#1E40AF; margin-top:28px; font-size:20px; }
h3 { color:#334155; margin-top:22px; font-size:16px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th, td { border:1px solid #cbd5e1; padding:6px 10px; text-align:left; vertical-align:top; font-size:13px; }
th { background:#eff6ff; font-weight:700; }
code { background:#f1f5f9; padding:1px 5px; border-radius:4px; font-family: Consolas,'Courier New',monospace; font-size:13px; }
pre { background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:8px; overflow:auto; }
pre code { background:transparent; padding:0; }
.method-badge { color:#ffffff; padding:2px 10px; border-radius:5px; font-weight:700; font-size:12px; margin-right:6px; }
.meta { color:#475569; }
.muted { color:#94a3b8; }
hr { border:none; border-top:1px solid #e2e8f0; margin:20px 0; }
.empty { color:#94a3b8; font-style:italic; }
`;

export function exportHtml(title: string, content: string): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(
    title
  )}</title><style>${BASE_CSS}</style></head><body>${content}</body></html>`;
}

// Convert a Blob to a base64 string (for passing binary data through Tauri).
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = (reader.result as string) || "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Convert our Tiptap HTML into real .docx (Office Open XML) using the `docx`
// library. `docx` is pure ESM (no `with`, no Node `fs`), so it bundles cleanly
// with Vite — unlike html-docx-js which uses `with` and breaks the build.
export async function exportWord(title: string, content: string): Promise<string> {
  const doc = buildDocx(title, content);
  const blob = await Packer.toBlob(doc);
  return await blobToBase64(blob);
}

type DocxBlock = Paragraph | Table;
type DocxInline = TextRun;

// Inline formatting inside a paragraph / table cell.
function inlineRuns(el: HTMLElement): DocxInline[] {
  const out: DocxInline[] = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent || "";
      if (t) out.push(new TextRun(t));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const e = node as HTMLElement;
      const tag = e.tagName.toLowerCase();
      if (tag === "br") {
        out.push(new TextRun({ text: "", break: 1 }));
      } else if (tag === "strong" || tag === "b") {
        out.push(new TextRun({ text: e.textContent || "", bold: true }));
      } else if (tag === "em" || tag === "i") {
        out.push(new TextRun({ text: e.textContent || "", italics: true }));
      } else if (tag === "code") {
        out.push(new TextRun({ text: e.textContent || "", font: "Consolas" }));
      } else if (tag === "a") {
        const href = e.getAttribute("href") || "";
        const label = e.textContent || "";
        out.push(new TextRun({ text: href ? `${label} (${href})` : label, color: "0563C1" }));
      } else if (tag === "span" || tag === "sub" || tag === "sup") {
        out.push(...inlineRuns(e));
      } else {
        out.push(new TextRun(e.textContent || ""));
      }
    }
  });
  if (out.length === 0) out.push(new TextRun(""));
  return out;
}

// Block-level conversion (headings / p / pre / lists / table / hr / div ...).
function blockElements(el: HTMLElement): DocxBlock[] {
  const out: DocxBlock[] = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent || "").trim();
      if (t) out.push(new Paragraph({ children: [new TextRun(t)] }));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const e = node as HTMLElement;
    const tag = e.tagName.toLowerCase();
    switch (tag) {
      case "h1":
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns(e) }));
        break;
      case "h2":
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: inlineRuns(e) }));
        break;
      case "h3":
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: inlineRuns(e) }));
        break;
      case "p":
        out.push(new Paragraph({ children: inlineRuns(e), spacing: { after: 120 } }));
        break;
      case "pre": {
        const code = e.querySelector("code");
        const text = (code ? code.textContent : e.textContent) || "";
        out.push(
          new Paragraph({
            shading: { type: ShadingType.SOLID, color: "auto", fill: "F2F2F2" },
            children: [new TextRun({ text, font: "Consolas" })],
            spacing: { before: 80, after: 120 },
          })
        );
        break;
      }
      case "ul":
      case "ol": {
        const items = Array.from(e.querySelectorAll(":scope > li"));
        items.forEach((li, i) => {
          const prefix = tag === "ul" ? "\u2022  " : `${i + 1}.  `;
          out.push(
            new Paragraph({
              children: [new TextRun({ text: prefix }), ...inlineRuns(li as HTMLElement)],
              spacing: { after: 40 },
            })
          );
        });
        break;
      }
      case "table":
        out.push(convertTable(e));
        break;
      case "hr":
        out.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" } },
            children: [new TextRun("")],
            spacing: { before: 80, after: 80 },
          })
        );
        break;
      case "blockquote":
        out.push(
          new Paragraph({ children: inlineRuns(e), indent: { left: 360 }, spacing: { after: 120 } })
        );
        break;
      case "div":
      case "section":
      case "figure":
        out.push(...blockElements(e));
        break;
      default:
        out.push(new Paragraph({ children: inlineRuns(e) }));
    }
  });
  return out;
}

function convertTable(table: HTMLElement): Table {
  const rows = Array.from(table.querySelectorAll("tr"));
  const docxRows = rows.map((tr) => {
    const cells = Array.from(tr.querySelectorAll("th,td"));
    const isHeader = !!tr.querySelector("th");
    return new TableRow({
      tableHeader: isHeader,
      children: cells.map(
        (c) =>
          new TableCell({
            children: [new Paragraph({ children: inlineRuns(c as HTMLElement) })],
          })
      ),
    });
  });
  return new Table({
    rows: docxRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function buildDocx(title: string, content: string): Document {
  const dom = new DOMParser().parseFromString(content, "text/html");
  const children: DocxBlock[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title)] }),
    ...blockElements(dom.body),
  ];
  return new Document({ sections: [{ children }] });
}

// ---------- HTML -> Markdown ----------
function serialize(node: ChildNode, ctx: ListCtx): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || "").replace(/\s+/g, " ");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "h1": return "\n# " + inner(el, ctx) + "\n\n";
    case "h2": return "\n## " + inner(el, ctx) + "\n\n";
    case "h3": return "\n### " + inner(el, ctx) + "\n\n";
    case "h4": return "\n#### " + inner(el, ctx) + "\n\n";
    case "p": return inner(el, ctx).trim() + "\n\n";
    case "br": return "\n";
    case "hr": return "\n---\n\n";
    case "strong":
    case "b": return "**" + inner(el, ctx) + "**";
    case "em":
    case "i": return "*" + inner(el, ctx) + "*";
    case "code": return "`" + (el.textContent || "") + "`";
    case "pre": {
      const code = el.querySelector("code");
      const text = code ? code.textContent || "" : el.textContent || "";
      return "\n```\n" + text + "\n```\n\n";
    }
    case "ul":
    case "ol": {
      ctx.depth += 1;
      if (tag === "ol") ctx.olNum = 0;
      const out = inner(el, ctx);
      ctx.depth -= 1;
      return out + "\n";
    }
    case "li": {
      const indent = "  ".repeat(Math.max(0, ctx.depth - 1));
      let marker = "- ";
      if (ctx.inOl) {
        ctx.olNum += 1;
        marker = `${ctx.olNum}. `;
      }
      return indent + marker + inner(el, ctx).trim() + "\n";
    }
    case "table": return "\n" + tableToMd(el) + "\n\n";
    case "div":
    case "section":
    case "span":
      return inner(el, ctx);
    default:
      return inner(el, ctx);
  }
}

interface ListCtx {
  depth: number;
  olNum: number;
  inOl: boolean;
}

function inner(el: HTMLElement, ctx: ListCtx): string {
  const wasOl = ctx.inOl;
  if (el.tagName.toLowerCase() === "ol") ctx.inOl = true;
  let out = "";
  el.childNodes.forEach((c) => (out += serialize(c, ctx)));
  ctx.inOl = wasOl;
  return out;
}

function tableToMd(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length === 0) return "";
  const cellsOf = (tr: HTMLElement) =>
    Array.from(tr.querySelectorAll("th,td")).map(
      (c) => (c.textContent || "").replace(/\n/g, " ").replace(/\|/g, "\\|").trim()
    );
  const header = cellsOf(rows[0]);
  let md = "| " + header.join(" | ") + " |\n";
  md += "| " + header.map(() => "---").join(" | ") + " |\n";
  for (let i = 1; i < rows.length; i++) {
    md += "| " + cellsOf(rows[i]).join(" | ") + " |\n";
  }
  return md;
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const ctx: ListCtx = { depth: 0, olNum: 0, inOl: false };
  let out = inner(doc.body, ctx);
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out + "\n";
}

// ---------- Save helpers ----------
async function pickAndWrite(
  filename: string,
  content: string,
  ext: string,
  label: string
): Promise<boolean> {
  const path = await save({
    defaultPath: filename,
    filters: [{ name: label, extensions: [ext] }],
  });
  if (!path) return false;
  await api.writeTextFile(path, content);
  return true;
}

async function pickAndWriteBinary(
  filename: string,
  content: string,
  ext: string,
  label: string
): Promise<boolean> {
  const path = await save({
    defaultPath: filename,
    filters: [{ name: label, extensions: [ext] }],
  });
  if (!path) return false;
  await api.writeBinaryFile(path, content);
  return true;
}

export async function exportAsHtml(title: string, content: string) {
  const ok = await pickAndWrite(
    `${title}.html`,
    exportHtml(title, content),
    "html",
    "HTML 文件"
  );
  return ok;
}

export async function exportAsWord(title: string, content: string) {
  const b64 = await exportWord(title, content);
  const ok = await pickAndWriteBinary(
    `${title}.docx`,
    b64,
    "docx",
    "Word 文档"
  );
  return ok;
}

export async function exportAsMarkdown(title: string, content: string) {
  const ok = await pickAndWrite(
    `${title}.md`,
    htmlToMarkdown(content),
    "md",
    "Markdown 文件"
  );
  return ok;
}

// ==========================================================================
//  PDF 导出 — jsPDF + autoTable 方案（v0.1.21）
//  用浏览器级表格引擎替换手写 PdfWriter 布局，彻底解决表格错位问题。
// ==========================================================================

const PAGE_W = 210; // A4 width in mm
const PAGE_H = 297; // A4 height in mm
const MARGIN_L = 20;
const MARGIN_R = 20;
const MARGIN_T = 25;
const MARGIN_B = 25;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

/** Current cursor Y position (from top of page). */
let pdfY = MARGIN_T;
/** The jsPDF instance being built. */
let pdfInst: jsPDF | null = null;

/**
 * Ensure there's at least `need` mm of space left on the current page.
 * If not, add a new page and reset cursor.
 */
function ensureSpace(need: number) {
  if (!pdfInst) return;
  if (pdfY + need > PAGE_H - MARGIN_B) {
    pdfInst.addPage();
    pdfY = MARGIN_T;
  }
}

/** Rich-text segment extracted from HTML inline elements. */
type Style = { bold?: boolean; code?: boolean; link?: boolean; italic?: boolean };
type Segment = { text: string; style: Style };

/** Extract plain text from inline segments. */
function plainText(segs: Segment[]): string {
  return segs.map((s) => s.text).join("");
}

/**
 * Parse inline HTML elements into Segment array.
 * Preserves <strong>/<code>/<em>/<a> styling info; <br> becomes \n.
 */
function inlineSegments(el: HTMLElement): Segment[] {
  const out: Segment[] = [];
  const push = (text: string, style: Style) => {
    if (text) out.push({ text, style });
  };
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      push(node.textContent || "", {});
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const e = node as HTMLElement;
      const tag = e.tagName.toLowerCase();
      const style: Style = {};
      if (tag === "strong" || tag === "b") style.bold = true;
      if (tag === "code") style.code = true;
      if (tag === "em" || tag === "i") style.italic = true;
      if (tag === "a") style.link = true;
      if (tag === "br") {
        push("\n", {});
        return;
      }
      out.push(...inlineSegments(e));
    }
  });
  return out;
}

/**
 * Render a block of mixed-format text using jsPDF's text() API.
 * Handles bold/inline-code styles within a paragraph by splitting into runs.
 * Auto-wraps CJK text at CONTENT_W boundary.
 */
function renderRichText(pdf: jsPDF, segs: Segment[], size: number = 11): void {
  if (!segs.length) return;
  const lineHeight = size * 1.55;
  const fontName = "MicrosoftYaHei";

  // Build flat run array
  interface TextRun { text: string; bold: boolean; mono: boolean }
  const runs: TextRun[] = [];
  for (const s of segs) {
    if (!s.text) continue;
    runs.push({ text: s.text, bold: !!s.style.bold, mono: !!s.style.code });
  }
  if (!runs.length) return;

  // Split each run into lines that fit CONTENT_W
  interface LineRun { text: string; bold: boolean; mono: boolean }
  const lines: LineRun[][] = [];
  let currentLine: LineRun[] = [];

  for (const run of runs) {
    pdf.setFont(run.mono ? "MicrosoftYaHei" : fontName, run.bold ? "bold" : "normal");

    const chars = run.text.split("");
    let buf = "";

    for (const ch of chars) {
      const candidate = buf + ch;
      const w = pdf.getTextWidth(candidate);
      if (w > CONTENT_W && buf.length > 0) {
        currentLine.push({ text: buf, bold: run.bold, mono: run.mono });
        lines.push(currentLine);
        currentLine = [];
        buf = ch;
      } else {
        buf = candidate;
      }
    }
    if (buf) currentLine.push({ text: buf, bold: run.bold, mono: run.mono });
  }
  if (currentLine.length) lines.push(currentLine);

  // Render each line
  if (lines.length === 0) return;
  ensureSpace(lineHeight * lines.length);
  for (const line of lines) {
    let x = MARGIN_L;
    for (const frag of line) {
      pdf.setFont(frag.mono ? "MicrosoftYaHei" : fontName, frag.bold ? "bold" : "normal");
      pdf.setTextColor(30, 35, 45);
      pdf.text(frag.text, x, pdfY, { baseline: "top" });
      x += pdf.getTextWidth(frag.text);
    }
    pdfY += lineHeight;
  }
  pdfY += 3; // gap after paragraph
}

/**
 * Render an HTML element tree to jsPDF using autoTable for tables.
 * This is the core rendering function — handles all block-level elements.
 */
function renderToJsPDF(pdf: jsPDF, el: HTMLElement): void {
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "h1": {
      ensureSpace(28);
      pdf.setFont("MicrosoftYaHei", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(30, 64, 175);
      pdf.text((el.textContent || "").trim(), MARGIN_L, pdfY, { baseline: "top" });
      pdfY += 26;
      // Underline
      pdf.setDrawColor(219, 234, 254);
      pdf.setLineWidth(0.8);
      pdf.line(MARGIN_L, pdfY, PAGE_W - MARGIN_R, pdfY);
      pdfY += 10;
      break;
    }
    case "h2": {
      ensureSpace(22);
      pdf.setFont("MicrosoftYaHei", "bold");
      pdf.setFontSize(17);
      pdf.setTextColor(30, 64, 175);
      pdf.text((el.textContent || "").trim(), MARGIN_L, pdfY, { baseline: "top" });
      pdfY += 20;
      break;
    }
    case "h3": {
      ensureSpace(18);
      pdf.setFont("MicrosoftYaHei", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(51, 65, 85);
      pdf.text((el.textContent || "").trim(), MARGIN_L, pdfY, { baseline: "top" });
      pdfY += 17;
      break;
    }
    case "h4": {
      ensureSpace(16);
      pdf.setFont("MicrosoftYaHei", "bold");
      pdf.setFontSize(12.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text((el.textContent || "").trim(), MARGIN_L, pdfY, { baseline: "top" });
      pdfY += 15;
      break;
    }
    case "p":
      renderRichText(pdf, inlineSegments(el), 11);
      break;

    case "pre": {
      const codeEl = el.querySelector("code");
      const codeText = (codeEl ? codeEl.textContent : el.textContent) || "";
      const fontSize = 9.5;
      const lineHeight = fontSize * 1.5;
      // Wrap code lines — use YaHei font for CJK support (courier has no Chinese glyphs)
      const rawLines = codeText.split("\n");
      const wrappedLines: string[] = [];
      pdf.setFont("MicrosoftYaHei", "normal");
      pdf.setFontSize(fontSize);
      for (const rl of rawLines) {
        let buf = "";
        for (const ch of rl) {
          const cand = buf + ch;
          if (pdf.getTextWidth(cand) > CONTENT_W - 20 && buf) {
            wrappedLines.push(buf);
            buf = ch;
          } else {
            buf = cand;
          }
        }
        wrappedLines.push(buf || " ");
      }
      const blockH = wrappedLines.length * lineHeight + 14;
      ensureSpace(blockH);
      // Background rect
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(MARGIN_L, pdfY, CONTENT_W, blockH, 2, 2, "FD");
      let ty = pdfY + 7;
      pdf.setFont("MicrosoftYaHei", "normal");
      pdf.setFontSize(fontSize);
      pdf.setTextColor(23, 32, 48);
      for (const wl of wrappedLines) {
        pdf.text(wl, MARGIN_L + 10, ty, { baseline: "top" });
        ty += lineHeight;
      }
      pdfY += blockH + 6;
      break;
    }

    case "ul":
    case "ol": {
      const items = Array.from(el.querySelectorAll(":scope > li"));
      items.forEach((li, i) => {
        const marker = tag === "ol" ? `${i + 1}. ` : "\u2022 ";
        const segs = inlineSegments(li as HTMLElement);
        ensureSpace(18);
        pdf.setFont("MicrosoftYaHei", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(51, 59, 83);
        pdf.text(marker, MARGIN_L, pdfY, { baseline: "top" });
        const markerW = pdf.getTextWidth(marker);
        // Render indented text (temporarily shift left margin)
        const savedL = MARGIN_L;
        (MARGIN_L as any) = MARGIN_L + markerW;
        try {
          renderRichText(pdf, segs, 11);
          pdfY -= 3; // reduce gap between list items
        } finally {
          (MARGIN_L as any) = savedL;
        }
      });
      pdfY += 4;
      break;
    }

    case "blockquote": {
      const segs = inlineSegments(el);
      ensureSpace(18);
      const topY = pdfY;
      renderRichText(pdf, segs, 11);
      const bh = pdfY - topY;
      // Left border bar
      pdf.setFillColor(204, 212, 224);
      pdf.rect(MARGIN_L, topY, 2, bh, "F");
      pdfY += 4;
      break;
    }

    case "hr":
      ensureSpace(6);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.4);
      pdf.line(MARGIN_L, pdfY + 3, PAGE_W - MARGIN_R, pdfY + 3);
      pdfY += 12;
      break;

    case "table": {
      const trs = Array.from(el.querySelectorAll("tr"));
      const isHeader = !!el.querySelector("th");

      // Build body array for autoTable
      const body: string[][] = [];
      trs.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th,td")).map(
          (c) => (c.textContent || "").trim()
        );
        body.push(cells);
      });

      if (body.length === 0) break;

      ensureSpace(30); // minimum for table start

      autoTable(pdf, {
        head: isHeader ? [body[0]] : undefined,
        body: isHeader ? body.slice(1) : body,
        startY: pdfY,
        margin: { left: MARGIN_L, right: MARGIN_R },
        styles: {
          font: "MicrosoftYaHei",
          fontSize: 9.5,
          cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
          textColor: [30, 35, 45],
          lineColor: [203, 213, 225],
          lineWidth: 0.3,
          valign: "top",
          overflow: "linebreak",
        },
        headStyles: {
          fontStyle: "bold",
          fontSize: 9.5,
          fillColor: [239, 246, 255],
          textColor: [30, 64, 175],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        tableLineColor: [203, 213, 225],
        tableLineWidth: 0.3,
      });

      // Update pdfY to after the table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pdfY = (pdf as any).lastAutoTable.finalY + 8;
      break;
    }

    case "img":
      // Images not yet supported in jsPDF path (rare in API docs)
      break;

    case "div":
    case "section":
    case "figure":
      Array.from(el.childNodes).forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE)
          renderToJsPDF(pdf, n as HTMLElement);
        else if (n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim()) {
          ensureSpace(16);
          pdf.setFont("MicrosoftYaHei", "normal");
          pdf.setFontSize(11);
          pdf.setTextColor(30, 35, 45);
          pdf.text((n.textContent || "").trim(), MARGIN_L, pdfY, { baseline: "top" });
          pdfY += 16;
        }
      });
      break;

    default:
      if ((el.textContent || "").trim()) {
        renderRichText(pdf, inlineSegments(el), 11);
      }
  }
}

// ---------------------------------------------------------------------------
//  Generate PDF bytes (base64) via jsPDF + autoTable
// ---------------------------------------------------------------------------

async function htmlToPdfBytes(title: string, content: string): Promise<string> {
  // Create A4 portrait document
  pdfInst = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  }) as jsPDF;
  pdfY = MARGIN_T;

  // Register Chinese fonts from embedded base64 bytes.
  // jsPDF's VFS (Virtual File System) stores fonts as base64 strings keyed by filename.
  pdfInst.addFileToVFS("msyh.ttf", MSYH_TTF_B64);
  pdfInst.addFileToVFS("msyhbd.ttf", MSYHBD_TTF_B64);
  pdfInst.addFont("msyh.ttf", "MicrosoftYaHei", "normal");
  pdfInst.addFont("msyhbd.ttf", "MicrosoftYaHei", "bold");

  // Render document title
  pdfInst.setFont("MicrosoftYaHei", "bold");
  pdfInst.setFontSize(24);
  pdfInst.setTextColor(30, 64, 175);
  pdfInst.text(title, MARGIN_L, pdfY, { baseline: "top" });
  pdfY += 30;

  // Parse HTML and render all elements
  const dom = new DOMParser().parseFromString(content, "text/html");
  Array.from(dom.body.childNodes).forEach((n) => {
    if (n.nodeType === Node.ELEMENT_NODE)
      renderToJsPDF(pdfInst!, n as HTMLElement);
    else if (n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim()) {
      ensureSpace(16);
      pdfInst!.setFont("MicrosoftYaHei", "normal");
      pdfInst!.setFontSize(11);
      pdfInst!.setTextColor(30, 35, 45);
      pdfInst!.text((n.textContent || "").trim(), MARGIN_L, pdfY, { baseline: "top" });
      pdfY += 16;
    }
  });

  // Output as base64 data URI, strip the "data:application/pdf;base64," prefix
  const dataUri = pdfInst.output("datauristring");
  const b64 = dataUri.split(",")[1] || "";

  // Cleanup refs
  pdfInst = null;

  return b64;
}

/**
 * Export document content as PDF.
 *
 * v0.1.21: uses **jsPDF + jspdf-autotable** instead of hand-rolled pdf-lib layout.
 * Tables are rendered by autoTable's mature engine (row heights, column widths,
 * text wrapping, page breaks, header repeat — all handled automatically).
 *
 * Chinese text via Microsoft YaHei (regular + bold), embedded as base64 VFS fonts.
 * Output is vector text (selectable/copyable), no rasterization.
 */
export async function exportAsPdf(title: string, content: string): Promise<boolean> {
  if (!content || !content.trim()) return false;
  try {
    const path = await save({
      defaultPath: `${title}.pdf`,
      filters: [{ name: "PDF 文件", extensions: ["pdf"] }],
    });
    if (!path) return false;

    const b64 = await htmlToPdfBytes(title, content);
    await api.writeBinaryFile(path, b64);
    return true;
  } catch (e) {
    console.error("PDF 导出失败", e);
    return false;
  }
}
