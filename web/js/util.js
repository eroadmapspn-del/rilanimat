export const $ = (selector) => document.querySelector(selector);

export const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const chip = (text, kind = "") => `<span class="chip ${kind}">${text}</span>`;

export const spinner = (text) => `<div class="hint"><span class="spinner"></span>${text}</div>`;

export function stageClass(done, current, locked) {
  return `panel step ${done ? "done" : ""} ${current ? "current" : ""} ${locked ? "locked" : ""}`;
}

export function toast(message, ok = false) {
  const el = $("#toast");
  el.textContent = message;
  el.style.display = "block";
  el.style.background = ok ? "var(--ok)" : "var(--bad)";
  clearTimeout(el._hide);
  el._hide = setTimeout(() => (el.style.display = "none"), 6000);
}
