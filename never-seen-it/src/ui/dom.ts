// Tiny DOM helpers. No framework (spec §10.1): render functions build
// nodes, screens replace the #ui subtree wholesale.

export function h(
  tag: string, attrs: Record<string, string> = {}, ...children: (Node | string)[]
): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) el.append(c);
  return el;
}

export function button(
  label: string, cls: string, onClick: () => void, attrs: Record<string, string> = {},
): HTMLElement {
  const b = h("button", { class: cls, type: "button", ...attrs }, label);
  b.addEventListener("click", onClick);
  return b;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${s}s`;
}
