import { api } from "./api.js";
import { renderBrief } from "./brief.js";
import { renderProject, resetPanels } from "./render.js";
import { state } from "./state.js";
import { $, esc } from "./util.js";

export async function loadProjects() {
  const list = await api("GET", "/api/projects");
  $("#projects").innerHTML = list.length
    ? list.map((p) => `<a class="proj ${p.id === state.pid ? "active" : ""}" href="#${p.id}">${esc(p.title)}</a>`).join("")
    : '<div class="hint">None yet</div>';
}

/** Fetch the project, redraw, and poll again (fast while something is running). */
export async function refresh() {
  if (!state.pid) return;
  try {
    state.project = await api("GET", `/api/projects/${state.pid}`);
  } catch {
    return;
  }
  renderProject();
  loadProjects();
  clearTimeout(state.timer);
  state.timer = setTimeout(refresh, state.project.running.length ? 1500 : 5000);
}

export async function boot() {
  clearTimeout(state.timer);
  if (!state.config) state.config = await api("GET", "/api/config");
  loadProjects();
  if (state.pid) {
    resetPanels();
    refresh();
  } else {
    renderBrief();
    $("#log").textContent = "Create a reel to begin.";
  }
}
