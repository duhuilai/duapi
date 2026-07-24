import { save } from "@tauri-apps/plugin-dialog";
import { api } from "./api";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const BASE_CSS = `
:root { --primary:#1E40AF; }
body { font-family: 'Segoe UI','Microsoft YaHei',system-ui,sans-serif; color:#1e293b; max-width: 960px; margin: 24px auto; padding: 0 16px; line-height:1.6; }
h1 { color:#1E40AF; border-bottom:2px solid #DBEAFE; padding-bottom:8px; }
h2 { color:#1E40AF; margin-top:28px; }
h3 { color:#334155; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th, td { border:1px solid #cbd5e1; padding:6px 10px; text-align:left; vertical-align:top; font-size:13px; }
th { background:#eff6ff; }
code { background:#f1f5f9; padding:1px 5px; border-radius:4px; font-family: Consolas,'Courier New',monospace; }
pre { background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:8px; overflow:auto; }
pre code { background:transparent; padding:0; }
.method-badge { color:#fff; padding:2px 10px; border-radius:5px; font-weight:700; font-size:12px; margin-right:6px; }
.meta { color:#475569; }
.muted { color:#94a3b8; }
hr { border:none; border-top:1px solid #e2e8f0; margin:20px 0; }
`;

export function exportHtml(title: string, content: string): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(
    title
  )}</title><style>${BASE_CSS}</style></head><body>${content}</body></html>`;
}

export function exportWord(title: string, content: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
<style>${BASE_CSS}</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${content}
</body>
</html>`;
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
  const ok = await pickAndWrite(
    `${title}.doc`,
    exportWord(title, content),
    "doc",
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
