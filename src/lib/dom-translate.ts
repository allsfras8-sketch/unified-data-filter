import extra from "./i18n-en.json";

/**
 * Whole-page English translator. Walks text nodes and UI attributes, swapping
 * known Arabic strings for English, and restores originals when switching back.
 */
const ATTRS = ["placeholder", "title", "aria-label"] as const;
const origText = new WeakMap<Text, string>();
const origAttr = new WeakMap<Element, Record<string, string>>();
const AR = /[\u0600-\u06FF]/;

let dict: Record<string, string> = {};
let keys: string[] = [];

export function setDictionary(base: Record<string, string>) {
  dict = { ...(extra as Record<string, string>), ...base };
  keys = Object.keys(dict)
    .filter((k) => k.length >= 3)
    .sort((a, b) => b.length - a.length);
}

function translate(s: string): string {
  const trimmed = s.trim();
  if (!trimmed || !AR.test(trimmed)) return s;
  const exact = dict[trimmed];
  if (exact) return s.replace(trimmed, exact);
  let out = s;
  for (const k of keys) {
    if (out.includes(k)) out = out.split(k).join(dict[k]!);
    if (!AR.test(out)) break;
  }
  return out;
}

function skip(el: Element | null) {
  return !!el?.closest("script,style,textarea,[data-no-translate]");
}

function applyNode(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    const t = root as Text;
    if (skip(t.parentElement)) return;
    const cur = t.data;
    if (!AR.test(cur)) return;
    if (!origText.has(t)) origText.set(t, cur);
    const next = translate(cur);
    if (next !== cur) t.data = next;
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (skip(el)) return;
  const all = [el, ...Array.from(el.querySelectorAll("*"))];
  for (const e of all) {
    for (const a of ATTRS) {
      const v = e.getAttribute(a);
      if (v && AR.test(v)) {
        const rec = origAttr.get(e) ?? {};
        rec[a] ??= v;
        origAttr.set(e, rec);
        e.setAttribute(a, translate(v));
      }
    }
  }
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) applyNode(n);
}

function restore(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const o = origText.get(n as Text);
    if (o !== undefined) {
      (n as Text).data = o;
      origText.delete(n as Text);
    }
  }
  for (const e of [root, ...Array.from(root.querySelectorAll("*"))]) {
    const rec = origAttr.get(e);
    if (rec) {
      for (const [a, v] of Object.entries(rec)) e.setAttribute(a, v);
      origAttr.delete(e);
    }
  }
}

let observer: MutationObserver | null = null;

export function startTranslating() {
  if (typeof document === "undefined" || observer) return;
  applyNode(document.body);
  document.title = translate(document.title);
  observer = new MutationObserver((muts) => {
    observer?.disconnect();
    for (const m of muts) {
      if (m.type === "characterData") {
        origText.delete(m.target as Text);
        applyNode(m.target);
      } else if (m.type === "attributes") {
        const e = m.target as Element;
        const rec = origAttr.get(e);
        if (rec && m.attributeName) delete rec[m.attributeName];
        applyNode(e);
      } else m.addedNodes.forEach(applyNode);
    }
    observer?.observe(document.body, OPTS);
  });
  observer.observe(document.body, OPTS);
}

const OPTS: MutationObserverInit = {
  subtree: true,
  childList: true,
  characterData: true,
  attributes: true,
  attributeFilter: [...ATTRS],
};

export function stopTranslating() {
  observer?.disconnect();
  observer = null;
  if (typeof document !== "undefined") restore(document.body);
}
