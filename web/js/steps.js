/** HTML for each step panel. Pure functions: state in, markup out. */
import { chip, esc, spinner, stageClass } from "./util.js";

const TEMPLATE_LABELS = {
  hook: "Big text (hook)",
  full: "Full-screen photo",
  card: "Photo card",
  feature: "Photo + feature chips",
  clip: "Your own clip",
};
const MOTIONS = ["zoom-in", "zoom-out", "pan-left", "pan-right", "pan-up"];

const options = (items, selected, label = (x) => x) =>
  items.map((x) => `<option value="${esc(x)}" ${x === selected ? "selected" : ""}>${esc(label(x))}</option>`).join("");

export const isStory = (P) => P.brief.mode === "story";

export function currentStep(P) {
  const a = P.approved;
  return a.story === false ? 1 : !a.script ? 2 : !a.voice ? 3 : !a.scenes ? 4 : 5;
}

// ------------------------------------------------------------------ 1. story (story reels only)
export function storyPanel(P) {
  if (!isStory(P)) return "";
  const busy = P.running.includes("story");
  const S = P.story, A = P.approved;
  const status = busy || S.status === "running" ? chip("writing...", "run")
    : A.story ? chip("approved", "ok")
    : S.status === "done" ? chip("needs your approval", "run")
    : S.status === "error" ? chip("failed", "bad") : chip("not started");
  let html = `<div class="${stageClass(A.story, currentStep(P) === 1, false)}"><div class="step-head"><div class="num">${A.story ? "✓" : 1}</div><h2>Story</h2>${status}</div>
    <div class="hint">Topic: <b>${esc(P.brief.topic)}</b></div>`;
  if (S.status === "error") html += `<div class="err">${esc(S.error)}</div>`;
  const d = S.data;
  if (d) {
    html += `<div class="story">
      <h3>${esc(d.title)}</h3>
      <p class="logline">${esc(d.logline)}</p>
      <h4>🎬 The full story (the 2-hour version)</h4><p>${esc(d.full_story)}</p>
      <h4>⏱ What your reel shows (the one-minute cut)</h4><p>${esc(d.reel_cut)}</p></div>`;
  }
  if (busy || S.status === "running") html += spinner("The story writer is working...");
  if (S.messages.length) {
    html += `<div class="chat">${S.messages.map((m) => `<div class="msg ${m.role}"><b>${m.role === "user" ? "You" : "Writer"}</b> ${esc(m.text)}</div>`).join("")}</div>`;
  }
  if (d && !A.story) {
    html += `<label>Not quite right? Tell the writer what to change</label>
      <textarea id="storyMsg" rows="2" placeholder="e.g. make the ending sadder, give the hero a younger sister, start with the storm"></textarea>
      <div class="actions"><button data-action="storySend" ${busy ? "disabled" : ""}>💬 Send to writer</button>
        <button data-action="storyGen" ${busy ? "disabled" : ""}>↻ Different story</button>
        <button class="approve" data-action="storyApprove" ${busy ? "disabled" : ""}>✓ Love it, write the script</button></div>`;
  } else if (A.story) {
    html += `<div class="hint">Changing the story later throws away the script, voice-over and scenes built from it.</div>
      <div class="actions"><button data-action="storyReopen">✎ Change the story</button></div>`;
  } else if (!busy) {
    html += `<div class="actions"><button data-action="storyGen">Write the story</button></div>`;
  }
  return html + `</div>`;
}

// ------------------------------------------------------------------ summary
export function summaryPanel(P) {
  const b = P.brief;
  if (isStory(P)) {
    return `<div class="panel step done"><div class="step-head"><div class="num">✓</div><h2>${esc((P.story.data && P.story.data.title) || b.topic)}</h2>
      ${chip(esc(b.language))}${chip(b.duration + "s voice-over")}</div></div>`;
  }
  return `<div class="panel step done"><div class="step-head"><div class="num">✓</div><h2>${esc(b.brand)}: ${esc(b.product)}</h2>
    ${chip(esc(b.language))}${chip(b.duration + "s voice-over")}</div>
    <div class="hint">${esc((b.features || "").split("\n").filter(Boolean).join(" · "))}</div></div>`;
}

// ------------------------------------------------------------------ 2. script
export function scriptPanel(P) {
  const busy = P.running.includes("script");
  const S = P.script, A = P.approved;
  const scenes = S.data ? S.data.scenes : [];
  const status = busy || S.status === "running" ? chip("writing...", "run")
    : A.script ? chip("approved", "ok")
    : S.status === "done" ? chip("needs your approval", "run")
    : S.status === "error" ? chip("failed", "bad") : chip("not started");
  const locked = A.story === false;
  let html = `<div class="${stageClass(A.script, currentStep(P) === 2, locked)}"><div class="step-head"><div class="num">${A.script ? "✓" : 2}</div><h2>Script</h2>${locked ? chip("waiting for the story") : status}</div>`;
  if (S.status === "error") html += `<div class="err">${esc(S.error)}</div>`;
  if (busy || S.status === "running") html += spinner("Gemini is writing your script...");
  if (S.data && !busy) {
    html += `<label>Narrator style</label><input type="text" id="voiceStyle" value="${esc(S.data.voice_style)}">`;
    html += scenes.map((s, i) => `<div class="scene-edit" data-i="${i}">
      <h4>Scene ${s.id} ${chip(esc(s.name))}</h4>
      <label>Voice-over text</label><textarea class="vo" rows="2">${esc(s.vo_text)}</textarea>
      ${s.vo_roman ? `<div class="roman">${esc(s.vo_roman)}</div>` : ""}
      ${s.visual_note ? `<div class="hint">🎞 ${esc(s.visual_note)}</div>` : ""}
      <label>Big headline on screen (2-5 words)</label><input type="text" class="headline" value="${esc(s.headline)}"></div>`).join("");
    html += `<div class="hint">Caption: ${esc(S.data.caption || "")}<br>${esc((S.data.hashtags || []).join(" "))}</div>`;
  }
  html += `<div class="actions">
    <button data-action="scriptGen" ${busy || locked ? "disabled" : ""}>${S.data ? "↻ Write a new script" : "Write script"}</button>
    ${S.data ? `<button data-action="scriptSave" ${busy ? "disabled" : ""}>Save edits</button>` : ""}
    ${S.data && !A.script ? `<button class="approve" data-action="scriptApprove">✓ Approve script</button>` : ""}
    ${A.script ? '<span class="hint">Changing the spoken words later resets the voice-over.</span>' : ""}</div></div>`;
  return html;
}

// ------------------------------------------------------------------ 3. voice
export function voicePanel(P, config) {
  const busy = P.running.includes("voice");
  const V = P.voice, A = P.approved;
  const locked = !A.script;
  const max = isStory(P) ? config.storyMaxVoiceSeconds : config.maxVoiceSeconds;
  const status = busy || V.status === "running" ? chip("generating...", "run")
    : A.voice ? chip("approved", "ok")
    : V.status === "done" ? chip("needs your approval", "run")
    : V.status === "error" ? chip("failed", "bad") : chip("waiting");
  let html = `<div class="${stageClass(A.voice, currentStep(P) === 3, locked)}"><div class="step-head"><div class="num">${A.voice ? "✓" : 3}</div><h2>Voice-over</h2>${status}</div>`;
  if (V.status === "error") html += `<div class="err">${esc(V.error)}</div>`;
  html += `<div class="row"><div><label>Voice</label><select id="voiceSel" ${locked ? "disabled" : ""}>${options(config.voices, V.voice || config.voices[0])}</select></div>
    <div style="align-self:end;display:flex;gap:8px;flex-wrap:wrap">
      <button data-action="voiceGen" ${locked || busy ? "disabled" : ""}>${V.file ? "↻ Generate again" : "Generate voice-over"}</button>
      <button data-action="voiceUpload" ${locked || busy ? "disabled" : ""}>⬆ Upload my own voice-over</button></div></div>`;
  if (busy) html += `<div style="margin-top:10px">${spinner("Recording the narration...")}</div>`;
  if (V.file) {
    html += `<audio controls src="/files/${P.id}/${V.file}"></audio>
      <div class="hint">${V.source === "uploaded" ? "Your uploaded recording. " : ""}${V.duration.toFixed(1)}s long${
        V.duration > max + 0.5 ? `. ⚠ Longer than ${max}s, so the reel will pass ${max + 3}s.` : `. The reel will be about ${(V.duration + 3).toFixed(0)}s with the 3s end card.`}</div>
      ${V.source === "uploaded" ? '<div class="hint">Scene timing follows the words in your script, so edit the script text to match what you recorded.</div>' : ""}`;
    if (!A.voice) html += `<div class="actions"><button class="approve" data-action="voiceApprove">✓ Approve voice-over</button></div>`;
  }
  return html + `</div>`;
}

// ------------------------------------------------------------------ 4. scenes
function thumb(P, s) {
  const clip = P.scenes[s.id];
  if (s.template === "clip" && clip?.file) return `<video src="/files/${P.id}/${clip.file}" muted loop playsinline controls></video>`;
  if (s.image && s.template !== "hook") return `<img src="/files/${P.id}/images/${encodeURIComponent(s.image)}" alt="">`;
  return `<span>Text on colour</span>`;
}

export function scenesPanel(P) {
  const A = P.approved, V = P.voice;
  const locked = !A.voice;
  const scenes = P.script.data ? P.script.data.scenes : [];
  const images = P.brief.images || [];
  const status = A.scenes ? chip("approved", "ok") : locked ? chip("waiting") : chip("needs your approval", "run");
  let html = `<div class="${stageClass(A.scenes, currentStep(P) === 4, locked)}"><div class="step-head"><div class="num">${A.scenes ? "✓" : 4}</div><h2>Scenes (look of each part)</h2>${status}</div>
    ${isStory(P) ? "" : `<div class="banner">Your photos appear <b>directly in the reel</b>. Use clean photos of your own Onomie bag with no other brand's name or logo visible.</div>`}
    <div class="hint">Choose how each scene looks. Every scene lasts as long as the words it speaks. Optionally upload your own clip for any scene.</div>`;
  if (P.slots) {
    const total = V.duration + 3;
    html += `<div class="timeline">${scenes.map((s, i) =>
      `<div class="seg done" style="width:${P.slots[i] / total * 100}%" title="${esc(s.name)}: ${P.slots[i].toFixed(1)}s">${s.id}</div>`).join("")}
      <div class="seg end" style="width:${3 / total * 100}%">end</div></div>
      <div class="tl-scale"><span>0s</span><span>voice-over ${V.duration.toFixed(1)}s</span><span>${total.toFixed(0)}s</span></div>`;
  }
  html += `<div class="grid" style="margin-top:14px">` + scenes.map((s, i) => {
    const hasClip = P.scenes[s.id]?.status === "done";
    const templates = ["hook", "full", "card", "feature", ...(hasClip ? ["clip"] : [])];
    const dis = locked ? "disabled" : "";
    return `<div class="look" data-id="${s.id}"><div class="thumb">${thumb(P, s)}</div>
      <div class="meta"><b>Scene ${s.id}</b><span class="hint">${P.slots ? P.slots[i].toFixed(1) + "s" : ""}${hasClip ? " · clip" : ""}</span></div>
      <label>Layout</label><select class="template" ${dis}>${options(templates, s.template, (t) => TEMPLATE_LABELS[t])}</select>
      <label>Photo</label><select class="image" ${dis}><option value="">(none)</option>${options(images, s.image)}</select>
      <label>Camera motion</label><select class="motion" ${dis}>${options(MOTIONS, s.motion)}</select>
      <label>Headline</label><input type="text" class="headline" value="${esc(s.headline)}" ${dis}>
      <label>Feature chips (comma separated)</label><input type="text" class="bullets" value="${esc((s.bullets || []).join(", "))}" ${dis}>
      <label>Emoji sticker</label><input type="text" class="sticker" value="${esc(s.sticker)}" maxlength="4" ${dis}>
      <div class="actions" style="margin-top:8px"><button class="small" data-action="sceneUpload" data-id="${s.id}" ${dis}>⬆ Upload clip</button>
      ${hasClip ? `<button class="small" data-action="sceneRemoveClip" data-id="${s.id}">Remove clip</button>` : ""}</div></div>`;
  }).join("") + `</div>`;
  html += `<div class="actions">
    <button data-action="addPhotos" ${locked ? "disabled" : ""}>＋ Add product photos</button>
    <button data-action="scenesUploadMany" ${locked ? "disabled" : ""}>⬆ Upload all clips (fills scenes in file-name order)</button>
    <button data-action="scenesSave" ${locked ? "disabled" : ""}>Save changes</button>
    ${!A.scenes ? `<button class="approve" data-action="scenesApprove" ${locked ? "disabled" : ""}>✓ Approve scenes</button>` : ""}</div></div>`;
  return html;
}

// ------------------------------------------------------------------ 5. reel
export function reelPanel(P) {
  const F = P.final, S = P.script;
  const locked = !P.approved.scenes;
  const busy = P.running.includes("final") || F.status === "running";
  const status = busy ? chip(`rendering ${F.progress || 0}%`, "run") : F.status === "done" ? chip(F.draft ? "draft ready" : "ready", "ok")
    : F.status === "error" ? chip("failed", "bad") : chip("waiting");
  let html = `<div class="${stageClass(F.status === "done" && !F.draft, currentStep(P) === 5, locked)}"><div class="step-head"><div class="num">${F.status === "done" && !F.draft ? "✓" : 5}</div><h2>Final reel</h2>${status}</div>`;
  if (F.status === "error") html += `<div class="err">${esc(F.error)}</div>`;
  if (busy) html += `${spinner("Remotion is rendering your reel (captions, motion, voice-over). The first render also downloads a browser, which can take a few minutes.")}<div class="bar"><div style="width:${F.progress || 0}%"></div></div>`;
  html += `<div class="actions">
    <button data-action="buildDraft" ${locked || busy ? "disabled" : ""}>⚡ Quick draft preview</button>
    <button class="primary" data-action="buildFinal" ${locked || busy ? "disabled" : ""}>${F.file && !F.draft ? "↻ Render again" : "Render final reel"}</button></div>`;
  if (F.file && !busy) {
    html += `<div class="final-wrap" style="margin-top:14px"><video class="final" controls src="/files/${P.id}/${F.file}"></video>
      <div class="caption-box">${F.draft ? '<div class="hint">This is a small, low-quality draft. Render the final reel to download it.</div>'
        : `<a href="/files/${P.id}/${F.file.split("?")[0]}" download="reel.mp4"><button class="approve">⬇ Download reel.mp4</button></a>`}
      <label>Caption</label><textarea id="capText" rows="4" readonly>${esc((S.data.caption || "") + "\n\n" + (S.data.hashtags || []).join(" "))}</textarea>
      <div class="actions"><button data-action="copyCaption">Copy caption</button></div></div></div>`;
  }
  return html + `</div>`;
}
