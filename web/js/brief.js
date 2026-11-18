import { api } from "./api.js";
import { $, esc } from "./util.js";
import { state } from "./state.js";

export function renderBrief() {
  if (state.briefMode === "product") return renderProductBrief();
  const missing = state.config?.missing || [];
  $("#main").innerHTML = `
    ${missing.length ? `<div class="banner">Missing in <b>.env</b>: ${missing.join(", ")}. Fill them in and restart the app.</div>` : ""}
    <div class="panel">
      <div class="step-head"><div class="num" style="background:var(--accent);color:#fff">1</div><h2>What should this reel be about?</h2></div>
      <div class="hint">Give me a topic. I will imagine a full 2-hour story around it, then pick the one gripping minute for your reel. You read it, ask for changes in a chat, and only then I write the script.</div>
      <form id="storyForm">
        <label>Topic</label>
        <textarea name="topic" rows="3" required placeholder="e.g. A lighthouse keeper who can hear the sea talk back"></textarea>
        <div class="row">
          <div><label>Voice-over language</label><select name="language"><option>Hinglish</option><option>English</option></select></div>
          <div><label>Reel length (seconds of voice-over, 20 to 57. End card adds 3s)</label><input type="number" name="duration" value="55" min="20" max="57"></div>
        </div>
        <div class="row">
          <div><label>Your page name (optional, shown on the end card)</label><input type="text" name="brand"></div>
          <div><label>Call to action (optional)</label><input type="text" name="cta" placeholder="e.g. Follow for part 2"></div>
        </div>
        <label>Anything else the writer should know? (optional)</label>
        <input type="text" name="notes" placeholder="e.g. keep it mysterious, no happy ending">
        <div class="actions"><button class="primary" type="submit">Write my story →</button>
          <button type="button" data-action="productMode">I want a product ad instead</button></div>
      </form>
    </div>`;
  $("#storyForm").onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    form.set("mode", "story");
    const button = event.target.querySelector("button.primary");
    button.disabled = true;
    try {
      const { id } = await api("POST", "/api/projects", form);
      await api("POST", `/api/projects/${id}/story/generate`);
      location.hash = id;
    } catch {
      button.disabled = false;
    }
  };
}

function renderProductBrief() {
  const missing = state.config?.missing || [];
  const render = state.config?.render;
  const renderNote =
    render && !render.node
      ? "Node.js was not found. Install it from nodejs.org, then restart the app."
      : render && !render.installed
        ? "Video templates are not installed yet. Run: cd remotion &amp;&amp; npm install"
        : "";
  $("#main").innerHTML = `
    ${missing.length ? `<div class="banner">Missing in <b>.env</b>: ${missing.join(", ")}. Fill them in and restart the app.</div>` : ""}
    ${renderNote ? `<div class="banner">${renderNote}</div>` : ""}
    <div class="panel">
      <div class="step-head"><div class="num" style="background:var(--accent);color:#fff">1</div><h2>Tell me about the reel</h2></div>
      <form id="briefForm">
        <div class="row">
          <div><label>Brand</label><input type="text" name="brand" value="Onomie" required></div>
          <div><label>Product</label><input type="text" name="product" value="Pet carrier backpack for small pets" required></div>
        </div>
        <label>Real product features (one per line. Only these will be mentioned)</label>
        <textarea name="features" rows="4">Clear bubble dome window
Breathable mesh and air-vent holes
Expandable side panel
Padded adjustable straps with back support
Reinforced safety zippers</textarea>
        <div class="row">
          <div><label>Pets / story theme</label><input type="text" name="pets" value="Bruno the dog, Mishti the cat, Bunty the rabbit, and their human Aria"></div>
          <div><label>Voice-over language</label><select name="language"><option>Hinglish</option><option>English</option></select></div>
        </div>
        <div class="row">
          <div><label>Tone</label><input type="text" name="tone" value="Emotional, funny, then joyful. Warm like a friend talking"></div>
          <div><label>Voice-over length (seconds, max 27. End card adds 3s)</label><input type="number" name="duration" value="26" min="10" max="27"></div>
        </div>
        <div class="row">
          <div><label>Tagline</label><input type="text" name="tagline" value="Chalo, saath chalein."></div>
          <div><label>Call to action</label><input type="text" name="cta" value="Shop now, link in bio"></div>
        </div>
        <div class="row">
          <div><label>Brand colour</label><input type="color" name="color" value="#ff8a3d"></div>
          <div><label>Extra notes (optional)</label><input type="text" name="notes" placeholder="e.g. mention it is lightweight"></div>
        </div>
        <label>Product photos (they appear in the reel, so use clean photos of your own bag)</label>
        <input type="file" name="images" accept="image/*" multiple>
        <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" name="use_saved" value="1" checked> If I upload nothing, use the saved sample photos</label>
        <div class="actions"><button class="primary" type="submit">Create &amp; write the script →</button>
          <button type="button" data-action="storyMode">← Back to story reels</button></div>
      </form>
    </div>`;
  $("#briefForm").onsubmit = async (event) => {
    event.preventDefault();
    const button = event.target.querySelector("button");
    button.disabled = true;
    try {
      const { id } = await api("POST", "/api/projects", new FormData(event.target));
      await api("POST", `/api/projects/${id}/script/generate`);
      location.hash = id;
    } catch {
      button.disabled = false;
    }
  };
}

export { esc };
