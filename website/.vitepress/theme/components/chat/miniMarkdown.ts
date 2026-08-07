/**
 * 极简 markdown → HTML 渲染器(零依赖,问答场景够用)。
 *
 * 为什么不复用 markdown-it:website 不单独装依赖,且聊天气泡只需覆盖
 * 助手回答常见的几种语法。这里做了 HTML 转义,避免 XSS。
 *
 * 支持:围栏代码块 ```、行内 `code`、**粗体**、标题 #、有序/无序列表、
 * 链接 [t](u)、表格 | a | b |、段落与换行。不支持复杂嵌套(够用即可)。
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const COPY_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

/**
 * 渲染一个代码块:始终深色面板(明暗主题下都高对比可读)+ 顶部工具条
 * (语言标签 + 复制按钮)。复制行为由组件层事件委托处理(.csb-copy)。
 */
function renderCodeBlock(lang: string, code: string): string {
  const label = lang ? escapeHtml(lang) : 'code';
  return (
    '<div class="csb-code">' +
    '<div class="csb-code-bar">' +
    `<span class="csb-code-lang">${label}</span>` +
    `<button class="csb-copy" type="button" aria-label="copy code">` +
    `<span class="csb-ico-copy">${COPY_ICON}</span>` +
    `<span class="csb-ico-check">${CHECK_ICON}</span>` +
    '</button>' +
    '</div>' +
    `<pre><code class="lang-${label}">${escapeHtml(code)}</code></pre>` +
    '</div>'
  );
}

/** 行内级:code → bold → link(顺序保证 code 内不被二次解析) */
function renderInline(text: string): string {
  const parts: string[] = [];
  // 先切出行内 code,code 内部不做其它解析
  const codeSplit = text.split(/(`[^`]+`)/g);
  for (const seg of codeSplit) {
    if (/^`[^`]+`$/.test(seg)) {
      parts.push(`<code>${escapeHtml(seg.slice(1, -1))}</code>`);
    } else {
      let h = escapeHtml(seg);
      // 粗体 **x**
      h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // 链接 [text](url) —— url 仅允许 http(s)/相对路径
      // 安全:escapeHtml 已把 " 转成 &quot;,但浏览器解析 HTML 属性值时会把 &quot; 解码回 ",
      // 导致 url 形如 https://x.com&quot;onclick=&quot;alert(1 时能逃逸出 href 属性、注入事件处理器
      // (典型 XSS via 引号转义不充分)。这里把 url 里的 &quot; 进一步编码成 %22,彻底封死。
      h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (_, text, url) => {
        const safeUrl = url.replace(/&quot;/g, '%22');
        return `<a href="${safeUrl}" target="_blank" rel="noreferrer">${text}</a>`;
      });
      parts.push(h);
    }
  }
  return parts.join('');
}

export function renderMarkdown(src: string): string {
  if (!src) return '';
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  let i = 0;
  let inCode = false;
  let codeLang = '';
  let codeBuf: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let tableBuf: string[] = [];

  const closeList = () => {
    if (listType) {
      out.push(listType === 'ul' ? '</ul>' : '</ol>');
      listType = null;
    }
  };

  const flushTable = () => {
    if (tableBuf.length < 2) {
      // 不是合法表格,按段落降级
      for (const t of tableBuf) out.push(`<p>${renderInline(t)}</p>`);
      tableBuf = [];
      return;
    }
    const parseRow = (row: string) =>
      row.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const header = parseRow(tableBuf[0]);
    const bodyRows = tableBuf.slice(2); // 第二行是分隔 |---|
    let html = '<table><thead><tr>';
    html += header.map((c) => `<th>${renderInline(c)}</th>`).join('');
    html += '</tr></thead><tbody>';
    for (const r of bodyRows) {
      const cells = parseRow(r);
      html += '<tr>' + cells.map((c) => `<td>${renderInline(c)}</td>`).join('') + '</tr>';
    }
    html += '</tbody></table>';
    out.push(html);
    tableBuf = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (inCode) {
        out.push(renderCodeBlock(codeLang, codeBuf.join('\n')));
        inCode = false;
        codeBuf = [];
        codeLang = '';
      } else {
        closeList();
        if (tableBuf.length) flushTable();
        inCode = true;
        codeLang = fence[1] || '';
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    // 表格行(以 | 开头)
    if (/^\s*\|.*\|\s*$/.test(line)) {
      closeList();
      tableBuf.push(line.trim());
      i++;
      continue;
    } else if (tableBuf.length) {
      flushTable();
    }

    // 标题
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length + 2; // h3~h6,避免与文档标题抢权重
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // 列表
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul) {
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${renderInline(ul[1])}</li>`);
      i++;
      continue;
    }
    if (ol) {
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${renderInline(ol[1])}</li>`);
      i++;
      continue;
    }
    closeList();

    // 空行
    if (!line.trim()) {
      i++;
      continue;
    }

    // 普通段落
    out.push(`<p>${renderInline(line)}</p>`);
    i++;
  }

  // 收尾(回答还在流式、代码块未闭合时也先渲染出来)
  if (inCode) {
    out.push(renderCodeBlock(codeLang, codeBuf.join('\n')));
  }
  if (tableBuf.length) flushTable();
  closeList();

  return out.join('\n');
}
