import "dotenv/config";
import { ensureBrowser } from "@remotion/renderer";
import { processNext, recoverStale } from "./render-job";

/** Run with:  npm run worker   (one process renders one video at a time; start more processes for more throughput). */
async function main() {
  console.log("Render worker starting. Checking the headless browser (the first run downloads it)…");
  await ensureBrowser();
  await recoverStale();
  console.log("Waiting for jobs.");
  let stop = false;
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { stop = true; console.log("Stopping after the current job."); });
  while (!stop) {
    const worked = await processNext().catch((e) => { console.error("Worker error:", e); return false; });
    if (!worked) await new Promise((r) => setTimeout(r, 3000));
  }
  process.exit(0);
}

void main();
