import { save } from "@tauri-apps/plugin-dialog";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
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
          const prefix = tag === "ul" ? "•  " : `${i + 1}.  `;
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

// ---------- HTML -> PDF（矢量文本，文字可选中/复制） ----------
// 用 pdf-lib 把文档 HTML 逐文本块绘制成真实 PDF（文字可选中、可复制），与
// HTML/Word 导出一致：先弹“保存”对话框选路径再写盘。中文通过嵌入微软雅黑
// 字体（Regular + Bold）渲染；启用 subset 子集化，仅嵌入用到的字形，PDF 体积
// 不会因字体变大。逐字符换行天然支持中文（无空格也能正确断行）。
//
// 字体以 base64 形式在构建期由 scripts/embed-fonts.mjs 注入
// src/lib/_fontBytes.generated.ts，运行期**静态引入并直接解码**使用，不再
// 依赖 fetch 加载字体文件，也不依赖动态 import 的代码分割 chunk（Tauri 生产
// WebView 加载该 21MB chunk 可能失败而回退到错误字体，产生文字散乱、间距巨大
// 等乱码 PDF）。代价是主包增大约 21MB，桌面应用可接受，且彻底消除字体加载的
// 环境不确定性。
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function loadFontBytes(): Promise<[Uint8Array, Uint8Array]> {
  // 静态引入已保证字节存在；此处仅做 base64 解码。若构建未注入字体字节，
  // 直接抛错（而非静默回退到 fetch 错误字体），让问题暴露而不是产出乱码 PDF。
  if (!MSYH_TTF_B64 || !MSYHBD_TTF_B64) {
    throw new Error("字体字节未注入：请确认 scripts/embed-fonts.mjs 已在构建前运行");
  }
  return [b64ToBytes(MSYH_TTF_B64), b64ToBytes(MSYHBD_TTF_B64)];
}

type Style = { bold?: boolean; code?: boolean; link?: boolean; italic?: boolean };
type Segment = { text: string; style: Style };
type Run = { ch: string; style: Style };
type RichOpts = {
  size?: number;
  leading?: number;
  indent?: number;
  color?: any;
  gapBefore?: number;
  gapAfter?: number;
};

class PdfWriter {
  pdf: any;
  font: any;
  boldFont: any;
  page: any;
  y = 0;
  readonly marginX = 56;
  readonly marginY = 54;
  readonly pageW = 595.28; // A4 @72dpi
  readonly pageH = 841.89;
  contentW = 0;

  constructor(pdf: any, font: any, boldFont: any) {
    this.pdf = pdf;
    this.font = font;
    this.boldFont = boldFont;
    this.contentW = this.pageW - this.marginX * 2;
    this.page = pdf.addPage([this.pageW, this.pageH]);
    this.y = this.pageH - this.marginY;
  }

  newPage() {
    this.page = this.pdf.addPage([this.pageW, this.pageH]);
    this.y = this.pageH - this.marginY;
  }

  ensure(space: number) {
    if (this.y - space < this.marginY) this.newPage();
  }

  charW(ch: string, style: Style, size: number): number {
    const f = style.bold ? this.boldFont : this.font;
    return f.widthOfTextAtSize(ch, size);
  }

  colorFor(style: Style, base: any): any {
    if (style.code) return rgb(0.78, 0.2, 0.2);
    if (style.link) return rgb(0.02, 0.38, 0.76);
    return base;
  }

  // 富文本块：逐字符换行 + 内联样式（粗体/代码/链接），文字可选中复制
  rich(segs: Segment[], opts: RichOpts) {
    const size = opts.size ?? 12;
    const leading = opts.leading ?? size * 1.6;
    const indent = opts.indent ?? 0;
    const color = opts.color ?? rgb(0.12, 0.16, 0.23);
    if (opts.gapBefore) this.y -= opts.gapBefore;
    const flat: Run[] = [];
    for (const s of segs) for (const ch of s.text) flat.push({ ch, style: s.style });
    const maxW = this.contentW - indent;
    let line: Run[] = [];
    let curW = 0;
    const flush = () => {
      if (line.length === 0) return;
      const baseY = this.y - size;
      let runText = "";
      let runStyle: Style = line[0].style;
      let runX = this.marginX + indent;
      const emit = () => {
        if (!runText) return;
        const f = runStyle.bold ? this.boldFont : this.font;
        this.page.drawText(runText, {
          x: runX,
          y: baseY,
          size,
          font: f,
          color: this.colorFor(runStyle, color),
        });
        runX += f.widthOfTextAtSize(runText, size);
        runText = "";
      };
      for (const item of line) {
        if (item.style !== runStyle) emit();
        runStyle = item.style;
        runText += item.ch;
      }
      emit();
      this.y -= leading;
      line = [];
      curW = 0;
    };
    for (const item of flat) {
      if (item.ch === "\n") {
        flush();
        continue;
      }
      const w = this.charW(item.ch, item.style, size);
      if (line.length > 0 && curW + w > maxW) flush();
      line.push(item);
      curW += w;
    }
    flush();
    if (opts.gapAfter) this.y -= opts.gapAfter;
  }

  text(t: string, opts: RichOpts) {
    this.rich([{ text: t, style: {} }], opts);
  }

  heading(t: string, size: number, color: any, withBorder: boolean, gapBefore: number, gapAfter: number) {
    this.y -= gapBefore;
    this.ensure(size * 1.6);
    const baseY = this.y - size;
    this.page.drawText(t, { x: this.marginX, y: baseY, size, font: this.boldFont, color });
    this.y -= size * 1.4;
    if (withBorder) {
      const yLine = this.y + size * 0.35;
      this.page.drawLine({
        start: { x: this.marginX, y: yLine },
        end: { x: this.pageW - this.marginX, y: yLine },
        thickness: 1,
        color: rgb(0.86, 0.92, 0.98),
      });
      this.y -= 4;
    }
    this.y -= gapAfter;
  }

  hr() {
    this.y -= 8;
    this.ensure(8);
    const yLine = this.y;
    this.page.drawLine({
      start: { x: this.marginX, y: yLine },
      end: { x: this.pageW - this.marginX, y: yLine },
      thickness: 0.8,
      color: rgb(0.89, 0.91, 0.94),
    });
    this.y -= 12;
  }

  // 代码块（浅灰底 + 逐行文本）
  codeBlock(code: string) {
    const size = 10.5;
    const leading = size * 1.5;
    const padX = 10;
    const padY = 8;
    const maxW = this.contentW - padX * 2;
    const lines = this.wrapPlain(code, this.font, size, maxW);
    const blockH = lines.length * leading + padY * 2;
    this.y -= 6;
    this.ensure(blockH);
    const top = this.y;
    this.page.drawRectangle({
      x: this.marginX,
      y: top - blockH,
      width: this.contentW,
      height: blockH,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.89, 0.91, 0.94),
      borderWidth: 0.5,
    });
    let yy = top - padY;
    for (const ln of lines) {
      this.page.drawText(ln, {
        x: this.marginX + padX,
        y: yy - size,
        size,
        font: this.font,
        color: rgb(0.15, 0.2, 0.3),
      });
      yy -= leading;
    }
    this.y = top - blockH - 6;
  }

  wrapPlain(text: string, font: any, size: number, maxW: number): string[] {
    const out: string[] = [];
    let line = "";
    for (const ch of text) {
      if (ch === "\n") {
        out.push(line);
        line = "";
        continue;
      }
      const cand = line + ch;
      if (font.widthOfTextAtSize(cand, size) > maxW && line) {
        out.push(line);
        line = ch;
      } else {
        line = cand;
      }
    }
    out.push(line);
    return out;
  }

  blockquote(segs: Segment[]) {
    const indent = 14;
    const size = 12;
    const leading = size * 1.6;
    const flat: Run[] = [];
    for (const s of segs) for (const ch of s.text) flat.push({ ch, style: s.style });
    const maxW = this.contentW - indent - 6;
    let lines = 1;
    let curW = 0;
    for (const item of flat) {
      const w = this.charW(item.ch, item.style, size);
      if (curW + w > maxW && curW > 0) {
        lines++;
        curW = 0;
      }
      curW += w;
    }
    const blockH = lines * leading;
    this.y -= 6;
    this.ensure(blockH);
    const top = this.y;
    this.page.drawRectangle({
      x: this.marginX + 2,
      y: top - blockH,
      width: 3,
      height: blockH,
      color: rgb(0.8, 0.83, 0.88),
    });
    this.rich(segs, { size, leading, indent, color: rgb(0.28, 0.34, 0.42), gapAfter: 6 });
  }

  list(items: Segment[][], ordered: boolean) {
    this.y -= 4;
    items.forEach((segs, i) => {
      const marker = ordered ? `${i + 1}. ` : "• ";
      const size = 12;
      const leading = size * 1.6;
      const indent = 16;
      const flat: Run[] = [];
      for (const s of segs) for (const ch of s.text) flat.push({ ch, style: s.style });
      const markerW = this.font.widthOfTextAtSize(marker, size);
      const maxW = this.contentW - indent;
      let lines = 1;
      let curW = markerW;
      for (const item of flat) {
        const w = this.charW(item.ch, item.style, size);
        if (curW + w > maxW && curW > markerW) {
          lines++;
          curW = markerW;
        }
        curW += w;
      }
      const blockH = lines * leading;
      this.ensure(blockH);
      const baseY = this.y - size;
      this.page.drawText(marker, {
        x: this.marginX,
        y: baseY,
        size,
        font: this.font,
        color: rgb(0.2, 0.25, 0.33),
      });
      this.rich(segs, { size, leading, indent, color: rgb(0.12, 0.16, 0.23), gapAfter: 2 });
    });
    this.y -= 4;
  }

  table(rows: Segment[][][], header: boolean) {
    const size = 10.5;
    const leading = size * 1.5;
    const padX = 6;
    const padY = 5;
    const cols = rows[0]?.length ?? 1;
    const colW = this.contentW / cols;
    const cellMaxW = colW - padX * 2;
    const rowH = rows.map((cells) => {
      let maxLines = 1;
      for (const segs of cells) {
        const flat: Run[] = [];
        for (const s of segs) for (const ch of s.text) flat.push({ ch, style: s.style });
        let curW = 0;
        let lines = 1;
        for (const item of flat) {
          const w = this.charW(item.ch, item.style, size);
          if (curW + w > cellMaxW && curW > 0) {
            lines++;
            curW = 0;
          }
          curW += w;
        }
        if (lines > maxLines) maxLines = lines;
      }
      return maxLines * leading + padY * 2;
    });
    this.y -= 6;
    const headerToRepeat = header ? [rows[0]] : null;
    rows.forEach((cells, ri) => {
      if (this.y - rowH[ri] < this.marginY) {
        this.newPage();
        if (headerToRepeat) {
          this.y -= rowH[0];
          this.drawRow(headerToRepeat[0], size, leading, padX, padY, colW, cellMaxW, true);
          this.y -= 6;
        }
      }
      this.drawRow(cells, size, leading, padX, padY, colW, cellMaxW, header && ri === 0);
      this.y -= rowH[ri];
    });
    this.y -= 6;
  }

  drawRow(
    cells: Segment[][],
    size: number,
    leading: number,
    padX: number,
    padY: number,
    colW: number,
    cellMaxW: number,
    isHeader: boolean
  ) {
    const rowTop = this.y;
    cells.forEach((segs, ci) => {
      const cellLeft = this.marginX + ci * colW;
      const flat: Run[] = [];
      for (const s of segs) for (const ch of s.text) flat.push({ ch, style: s.style });
      let lines = 1;
      let curW = 0;
      for (const item of flat) {
        const w = this.charW(item.ch, item.style, size);
        if (curW + w > cellMaxW && curW > 0) {
          lines++;
          curW = 0;
        }
        curW += w;
      }
      const hh = lines * leading + padY * 2;
      this.page.drawRectangle({
        x: cellLeft,
        y: rowTop - hh,
        width: colW,
        height: hh,
        color: isHeader ? rgb(0.94, 0.96, 0.99) : rgb(1, 1, 1),
        borderColor: rgb(0.8, 0.84, 0.88),
        borderWidth: 0.5,
      });
      this.richInCell(segs, size, leading, cellLeft + padX, rowTop - padY, cellMaxW, isHeader);
    });
  }

  richInCell(segs: Segment[], size: number, leading: number, x0: number, topY: number, maxW: number, isHeader: boolean) {
    const flat: Run[] = [];
    for (const s of segs) for (const ch of s.text) flat.push({ ch, style: s.style });
    let line: Run[] = [];
    let curW = 0;
    let yy = topY;
    const flush = () => {
      if (line.length === 0) return;
      const baseY = yy - size;
      let runText = "";
      let runStyle: Style = line[0].style;
      let runX = x0;
      const emit = () => {
        if (!runText) return;
        const f = runStyle.bold || isHeader ? this.boldFont : this.font;
        this.page.drawText(runText, {
          x: runX,
          y: baseY,
          size,
          font: f,
          color: rgb(0.12, 0.16, 0.23),
        });
        runX += f.widthOfTextAtSize(runText, size);
        runText = "";
      };
      for (const item of line) {
        if (item.style !== runStyle) emit();
        runStyle = item.style;
        runText += item.ch;
      }
      emit();
      yy -= leading;
      line = [];
      curW = 0;
    };
    for (const item of flat) {
      if (item.ch === "\n") {
        flush();
        continue;
      }
      const w = this.charW(item.ch, item.style, size);
      if (line.length > 0 && curW + w > maxW) flush();
      line.push(item);
      curW += w;
    }
    flush();
  }

  async image(src: string) {
    try {
      const m = /^data:(image\/(png|jpeg|jpg));base64,(.*)$/i.exec(src.trim());
      if (!m) return;
      const bytes = Uint8Array.from(atob(m[3]), (c) => c.charCodeAt(0));
      const emb = m[2] === "png" ? await this.pdf.embedPng(bytes) : await this.pdf.embedJpg(bytes);
      const iw = emb.width;
      const ih = emb.height;
      const maxW = this.contentW;
      const w = Math.min(maxW, iw);
      const h = (ih / iw) * w;
      this.ensure(h);
      this.page.drawImage(emb, { x: this.marginX, y: this.y - h, width: w, height: h });
      this.y -= h + 8;
    } catch (e) {
      /* 忽略无法嵌入的图片 */
    }
  }
}

// 内联片段（保留 <strong>/<code>/<em>/<a> 样式，<br> 折行）
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

function renderNode(w: PdfWriter, el: HTMLElement) {
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "h1":
      w.heading(el.textContent || "", 20, rgb(0.12, 0.25, 0.69), true, 16, 10);
      break;
    case "h2":
      w.heading(el.textContent || "", 16, rgb(0.12, 0.25, 0.69), false, 12, 8);
      break;
    case "h3":
      w.heading(el.textContent || "", 13.5, rgb(0.2, 0.25, 0.33), false, 10, 6);
      break;
    case "h4":
      w.heading(el.textContent || "", 12, rgb(0.2, 0.25, 0.33), false, 8, 5);
      break;
    case "p":
      w.rich(inlineSegments(el), { size: 12, gapBefore: 2, gapAfter: 8 });
      break;
    case "pre": {
      const code = el.querySelector("code");
      w.codeBlock((code ? code.textContent : el.textContent) || "");
      break;
    }
    case "ul":
    case "ol": {
      const items = Array.from(el.querySelectorAll(":scope > li")).map((li) =>
        inlineSegments(li as HTMLElement)
      );
      w.list(items, tag === "ol");
      break;
    }
    case "blockquote":
      w.blockquote(inlineSegments(el));
      break;
    case "hr":
      w.hr();
      break;
    case "table": {
      const trs = Array.from(el.querySelectorAll("tr"));
      const isHeader = !!el.querySelector("th");
      const rows = trs.map((tr) =>
        Array.from(tr.querySelectorAll("th,td")).map((c) => inlineSegments(c as HTMLElement))
      );
      w.table(rows, isHeader);
      break;
    }
    case "img": {
      const src = el.getAttribute("src") || "";
      w.image(src);
      break;
    }
    case "div":
    case "section":
    case "figure":
      Array.from(el.childNodes).forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE) renderNode(w, n as HTMLElement);
        else if (n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim())
          w.rich([{ text: n.textContent || "", style: {} }], { size: 12, gapAfter: 4 });
      });
      break;
    default:
      if ((el.textContent || "").trim())
        w.rich(inlineSegments(el), { size: 12, gapAfter: 8 });
  }
}

// 生成可选中文本的 PDF，返回 base64 字节串（供 writeBinaryFile 写盘）
async function htmlToPdfBytes(title: string, content: string): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [fb, bb] = await loadFontBytes();
  const font = await pdf.embedFont(fb, { subset: true });
  const boldFont = await pdf.embedFont(bb, { subset: true });
  const w = new PdfWriter(pdf, font, boldFont);
  w.heading(title, 22, rgb(0.12, 0.25, 0.69), true, 0, 14);
  const dom = new DOMParser().parseFromString(content, "text/html");
  Array.from(dom.body.childNodes).forEach((n) => {
    if (n.nodeType === Node.ELEMENT_NODE) renderNode(w, n as HTMLElement);
    else if (n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim())
      w.rich([{ text: n.textContent || "", style: {} }], { size: 12, gapAfter: 6 });
  });
  const bytes = await pdf.save();
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
}

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
