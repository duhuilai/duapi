/**
 * Markdown ↔ HTML 轻量转换器
 * 用于文档导出 WYSIWYG 编辑器
 */

// ── Markdown → HTML ──

export function mdToHtml(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inTable = false;
  let inCodeBlock = false;
  let codeContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code>${escapeHtml(codeContent)}</code></pre>\n`;
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent += (codeContent ? '\n' : '') + line;
      continue;
    }

    if (line.startsWith('|')) {
      if (!inTable) {
        html += '<table>\n';
        inTable = true;
      }
      const cells = line.split('|').filter(c => c.trim() !== '' || line.endsWith('|'));
      const isHeader =
        i + 1 < lines.length &&
        lines[i + 1].startsWith('|') &&
        lines[i + 1].includes('---');
      const tag = isHeader ? 'th' : 'td';
      html += '<tr>';
      for (const cell of cells) {
        html += `<${tag}>${inlineMdToHtml(cell.trim())}</${tag}>`;
      }
      html += '</tr>\n';
      if (isHeader) i++;
      continue;
    } else {
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }
    }

    if (line.startsWith('### ')) {
      html += `<h3>${inlineMdToHtml(line.slice(4))}</h3>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${inlineMdToHtml(line.slice(3))}</h2>\n`;
    } else if (line.startsWith('# ')) {
      html += `<h1>${inlineMdToHtml(line.slice(2))}</h1>\n`;
    } else if (line.startsWith('> ')) {
      html += `<blockquote>${inlineMdToHtml(line.slice(2))}</blockquote>\n`;
    } else if (line.startsWith('---')) {
      html += '<hr>\n';
    } else if (line.trim() === '') {
      html += '<br>\n';
    } else {
      html += `<p>${inlineMdToHtml(line)}</p>\n`;
    }
  }

  if (inTable) html += '</table>\n';
  if (inCodeBlock && codeContent) {
    html += `<pre><code>${escapeHtml(codeContent)}</code></pre>\n`;
  }

  return html;
}

function inlineMdToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank">$1</a>',
    );
}

// ── HTML → Markdown ──

export function htmlToMd(html: string): string {
  // 使用 DOMParser 解析 HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const lines: string[] = [];

  function processNode(node: Node, indent: string): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) lines.push(indent + text.trim());
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case 'h1':
        lines.push('# ' + getTextContent(el));
        break;
      case 'h2':
        lines.push('## ' + getTextContent(el));
        break;
      case 'h3':
        lines.push('### ' + getTextContent(el));
        break;
      case 'h4':
        lines.push('#### ' + getTextContent(el));
        break;
      case 'p':
        lines.push(processInline(el));
        break;
      case 'br':
        lines.push('');
        break;
      case 'strong':
      case 'b':
        lines.push('**' + getTextContent(el) + '**');
        break;
      case 'em':
      case 'i':
        lines.push('*' + getTextContent(el) + '*');
        break;
      case 'u':
        lines.push(getTextContent(el));
        break;
      case 'code':
        // inline code (inside p)
        if (el.parentElement?.tagName.toLowerCase() !== 'pre') {
          lines.push('`' + getTextContent(el) + '`');
        }
        break;
      case 'pre': {
        const code = el.querySelector('code');
        const content = code ? code.textContent || '' : el.textContent || '';
        lines.push('```');
        lines.push(content.trim());
        lines.push('```');
        break;
      }
      case 'blockquote':
        lines.push('> ' + getTextContent(el));
        break;
      case 'hr':
        lines.push('---');
        break;
      case 'ul':
      case 'ol': {
        const items = el.querySelectorAll(':scope > li');
        let idx = 1;
        items.forEach(li => {
          const prefix = tag === 'ol' ? `${idx}. ` : '- ';
          lines.push(prefix + getTextContent(li));
          idx++;
        });
        break;
      }
      case 'table': {
        const rows = el.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr');
        let isFirst = true;
        rows.forEach(row => {
          const cells = row.querySelectorAll('th, td');
          const cellTexts = Array.from(cells).map(c => getTextContent(c));
          lines.push('| ' + cellTexts.join(' | ') + ' |');
          if (isFirst) {
            lines.push('|' + cellTexts.map(() => '------').join('|') + '|');
            isFirst = false;
          }
        });
        break;
      }
      case 'a': {
        const href = el.getAttribute('href') || '';
        const text = getTextContent(el);
        lines.push(`[${text}](${href})`);
        break;
      }
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        lines.push(`![${alt}](${src})`);
        break;
      }
      case 'div':
      case 'span':
      case 'section':
      case 'article':
        // Recurse into children
        el.childNodes.forEach(child => processNode(child, indent));
        break;
      default:
        // Unknown elements — output text
        const t = getTextContent(el);
        if (t.trim()) lines.push(t.trim());
    }

    // Add blank line after block elements
    const blockTags = ['h1', 'h2', 'h3', 'h4', 'p', 'pre', 'blockquote', 'hr', 'ul', 'ol', 'table'];
    if (blockTags.includes(tag)) {
      lines.push('');
    }
  }

  // Process body children
  const body = doc.body || doc.documentElement;
  body.childNodes.forEach(child => processNode(child, ''));

  // Clean up: collapse consecutive blank lines
  const cleaned: string[] = [];
  let prevBlank = false;
  for (const line of lines) {
    if (line === '') {
      if (!prevBlank) cleaned.push(line);
      prevBlank = true;
    } else {
      cleaned.push(line);
      prevBlank = false;
    }
  }

  return cleaned.join('\n').trim() + '\n';
}

function processInline(el: HTMLElement): string {
  let result = '';
  el.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent || '';
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const c = child as HTMLElement;
      const tag = c.tagName.toLowerCase();
      const text = getTextContent(c);
      switch (tag) {
        case 'strong':
        case 'b':
          result += '**' + text + '**';
          break;
        case 'em':
        case 'i':
          result += '*' + text + '*';
          break;
        case 'code':
          result += '`' + text + '`';
          break;
        case 'a': {
          const href = c.getAttribute('href') || '';
          result += '[' + text + '](' + href + ')';
          break;
        }
        default:
          result += text;
      }
    }
  });
  return result;
}

function getTextContent(el: Element): string {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
