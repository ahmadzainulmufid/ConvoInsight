const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "br",
  "p",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "a",
]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

function escapeHtml(s: string) {
  return s
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;")
    .replaceAll(/"/g, "&quot;")
    .replaceAll(/'/g, "&#39;");
}
function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

function sanitizeTree(node: Node, doc: Document) {
  if (node.nodeType === Node.COMMENT_NODE) {
    node.parentNode?.removeChild(node);
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    for (const attr of [...el.attributes]) {
      const n = attr.name.toLowerCase();
      if (n.startsWith("on") || n === "style" || n === "class")
        el.removeAttribute(attr.name);
    }
    if (!ALLOWED_TAGS.has(tag)) {
      const p = doc.createElement("p");
      p.textContent = el.textContent || "";
      el.replaceWith(p);
      sanitizeTree(p, doc);
      return;
    }
    const allowed = ALLOWED_ATTRS[tag] || new Set<string>();
    for (const attr of [...el.attributes]) {
      if (!allowed.has(attr.name.toLowerCase())) el.removeAttribute(attr.name);
    }
    if (tag === "a") {
      const a = el as HTMLAnchorElement;
      const href = (a.getAttribute("href") || "").trim();
      if (!/^https?:\/\//i.test(href)) a.removeAttribute("href");
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer nofollow");
    }
    for (const child of [...el.childNodes]) sanitizeTree(child, doc);
  }
}

function unwrapOuterDiv(doc: Document) {
  const body = doc.body;
  if (
    body.children.length === 1 &&
    body.firstElementChild?.tagName.toLowerCase() === "div"
  ) {
    const inner = (body.firstElementChild as HTMLElement).innerHTML;
    body.innerHTML = inner;
  }
}

function wrapOrphansIntoP(doc: Document) {
  const body = doc.body;
  const toWrap: ChildNode[] = [];
  for (const ch of [...body.childNodes]) {
    if (ch.nodeType === Node.TEXT_NODE && ch.textContent?.trim())
      toWrap.push(ch);
  }
  for (const t of toWrap) {
    const p = doc.createElement("p");
    p.textContent = t.textContent || "";
    t.replaceWith(p);
  }
}

function stripMarkdownFences(s: string) {
  s = s.replace(/```(?:[^\n`]*)?\n?([\s\S]*?)\n?```/g, "$1");
  s = s.replace(/~~~(?:[^\n~]*)?\n?([\s\S]*?)\n?~~~/g, "$1");
  s = s.replace(/```([\s\S]*?)```/g, "$1");
  return s;
}

export function cleanHtmlResponse(input: string): string {
  let s = (input ?? "").trim();
  s = stripMarkdownFences(s);
  if (!s) return "";

  // --> INI BAGIAN PENTINGNYA <--
  // Baris-baris ini mengubah format Markdown menjadi tag HTML
  // Mengubah **teks tebal** menjadi <strong>teks tebal</strong>
  s = s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Mengubah *teks miring* menjadi <em>teks miring</em>
  s = s.replace(/\*(.*?)\*/g, "<em>$1</em>");

  if (!looksLikeHtml(s)) {
    return s
      .split(/\n{2,}/g)
      .map((part) => `<p>${escapeHtml(part)}</p>`)
      .join("\n");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(s, "text/html");

  unwrapOuterDiv(doc);
  for (const ch of [...doc.body.childNodes]) sanitizeTree(ch, doc);
  wrapOrphansIntoP(doc);

  return doc.body.innerHTML.trim();
}
