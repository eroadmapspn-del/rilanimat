import { $ } from "./util.js";
import { state } from "./state.js";
import { reelPanel, scenesPanel, scriptPanel, storyPanel, summaryPanel, voicePanel } from "./steps.js";

const PANELS = ["summary", "story", "script", "voice", "scenes", "reel"];
const cache = {};

const isEditing = (el) => {
  const a = document.activeElement;
  return a && el.contains(a) && ["INPUT", "TEXTAREA", "SELECT"].includes(a.tagName);
};

/** Make sure the page has one container per panel. Called when switching projects. */
export function resetPanels() {
  PANELS.forEach((name) => delete cache[name]);
  $("#main").innerHTML = PANELS.map((n) => `<div id="panel-${n}"></div>`).join("");
}

/**
 * Update only the panels whose markup changed, and never while you are typing in them.
 * (Re-rendering identical markup would restart audio and video that is playing.)
 */
export function renderProject() {
  const P = state.project;
  if (!P || !$("#panel-summary")) return;
  const html = {
    summary: summaryPanel(P),
    story: storyPanel(P),
    script: scriptPanel(P),
    voice: voicePanel(P, state.config),
    scenes: scenesPanel(P),
    reel: reelPanel(P),
  };
  for (const name of PANELS) {
    const el = $(`#panel-${name}`);
    if (cache[name] === html[name] || isEditing(el)) continue;
    cache[name] = html[name];
    el.innerHTML = html[name];
  }
  const log = $("#log");
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  log.textContent = (P.logs || []).join("\n") || "Nothing yet.";
  if (atBottom) log.scrollTop = log.scrollHeight;
}
