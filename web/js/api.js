import { toast } from "./util.js";

/** Call the backend. Shows the server's error message as a toast and throws on failure. */
export async function api(method, url, body) {
  const options = { method, headers: {} };
  if (body instanceof FormData) options.body = body;
  else if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    toast(json.error || `Error ${response.status}`);
    throw new Error(json.error || response.status);
  }
  return json;
}
