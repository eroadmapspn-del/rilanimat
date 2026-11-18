/** Button handlers, looked up by each button's data-action attribute. */
import { api } from "./api.js";
import { renderBrief } from "./brief.js";
import { refresh } from "./poll.js";
import { state } from "./state.js";
import { $, toast } from "./util.js";

const url = (path) => `/api/projects/${state.pid}/${path}`;
const post = (path, body) => api("POST", url(path), body).then(refresh);

// Pick a file with a temporary input, because the page re-renders while polling.
function pickFile(accept, multiple, callback) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = !!multiple;
  input.style.display = "none";
  input.onchange = () => {
    const files = [...input.files];
    input.remove();
    if (files.length) callback(files);
  };
  document.body.appendChild(input);
  input.click();
}

async function upload(path, field, files, okMessage) {
  const form = new FormData();
  files.forEach((f) => form.append(field, f));
  toast("Uploading...", true);
  try {
    await api("POST", url(path), form);
    toast(okMessage, true);
  } catch {
    return;
  }
  refresh();
}

const AUDIO = "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus";
const VIDEO = "video/*,.mp4,.mov,.webm,.mkv";
const IMAGE = "image/*,.jpg,.jpeg,.png,.webp";

function collectScript() {
  const data = JSON.parse(JSON.stringify(state.project.script.data));
  data.voice_style = $("#voiceStyle").value;
  document.querySelectorAll(".scene-edit").forEach((el) => {
    const scene = data.scenes[+el.dataset.i];
    scene.vo_text = el.querySelector(".vo").value;
    scene.headline = el.querySelector(".headline").value;
  });
  return data;
}

function collectLook() {
  return [...document.querySelectorAll(".look")].map((el) => ({
    id: +el.dataset.id,
    template: el.querySelector(".template").value,
    image: el.querySelector(".image").value,
    motion: el.querySelector(".motion").value,
    headline: el.querySelector(".headline").value,
    bullets: el.querySelector(".bullets").value.split(",").map((b) => b.trim()).filter(Boolean),
    sticker: el.querySelector(".sticker").value.trim(),
  }));
}

const saveScript = () => api("PUT", url("script"), collectScript());
const saveLook = () => api("PUT", url("scenes/plan"), { scenes: collectLook() });

export const actions = {
  newReel: () => {
    state.briefMode = "story";
    if (location.hash) location.hash = "";
    else renderBrief();
  },
  productMode: () => { state.briefMode = "product"; renderBrief(); },
  storyMode: () => { state.briefMode = "story"; renderBrief(); },

  storyGen: () => {
    if (confirm("Throw this story away and write a completely new one?")) post("story/generate");
  },
  storySend: async () => {
    const box = $("#storyMsg");
    const message = box.value.trim();
    if (!message) return;
    box.value = "";
    box.blur(); // the page does not redraw a box you are typing in
    await post("story/revise", { message });
  },
  storyApprove: () => post("story/approve"),
  storyReopen: () => {
    if (confirm("Reopen the story? The script, voice-over and scenes will be cleared.")) post("story/reopen");
  },

  scriptGen: () => {
    if (!state.project.script.data || confirm("Replace the current script with a new one?")) post("script/generate");
  },
  scriptSave: async () => { await saveScript(); toast("Saved", true); refresh(); },
  scriptApprove: async () => { await saveScript(); post("script/approve"); },

  voiceGen: () => post("voice/generate", { voice: $("#voiceSel").value }),
  voiceUpload: () => pickFile(AUDIO, false, (f) => upload("voice/upload", "file", f, "Voice-over uploaded")),
  voiceApprove: () => post("voice/approve"),

  sceneUpload: (el) => pickFile(VIDEO, false, (f) => upload(`scenes/${el.dataset.id}/upload`, "file", f, `Scene ${el.dataset.id} uploaded`)),
  sceneRemoveClip: (el) => api("DELETE", url(`scenes/${el.dataset.id}/clip`)).then(refresh),
  scenesUploadMany: () => pickFile(VIDEO, true, (f) => upload("scenes/upload-many", "files", f, "Clips uploaded")),
  addPhotos: () => pickFile(IMAGE, true, (f) => upload("images", "files", f, "Photos added")),
  scenesSave: async () => { await saveLook(); toast("Saved", true); refresh(); },
  scenesApprove: async () => { await saveLook(); post("scenes/approve"); },

  buildDraft: () => post("final/build", { draft: true }),
  buildFinal: () => post("final/build", { draft: false }),
  copyCaption: () => navigator.clipboard.writeText($("#capText").value).then(() => toast("Caption copied", true)),
};
