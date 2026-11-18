import { actions } from "./actions.js";
import { boot } from "./poll.js";
import { state } from "./state.js";

// One click listener for every button that has a data-action attribute.
document.addEventListener("click", (event) => {
  const el = event.target.closest("[data-action]");
  const handler = el && actions[el.dataset.action];
  if (handler && !el.disabled) handler(el);
});

window.addEventListener("hashchange", () => {
  state.pid = location.hash.slice(1) || null;
  state.project = null;
  boot();
});

boot();
