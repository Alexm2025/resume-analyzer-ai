// AI provider layer. Uses the Flask backend when available (key stays on the server),
// otherwise the user's own OpenAI key stored in this browser only.
import { settings } from "./store.js";

let promptsPromise = null;
export function loadPrompts() {
  if (!promptsPromise) {
    promptsPromise = fetch("prompts.json").then((r) => {
      if (!r.ok) throw new Error("Could not load AI prompts.");
      return r.json();
    });
  }
  return promptsPromise;
}

let serverStatus = null;
export async function detectServer() {
  if (serverStatus) return serverStatus;
  try {
    const r = await fetch("api/health", { headers: { Accept: "application/json" } });
    serverStatus = r.ok ? await r.json() : { ok: false };
  } catch {
    serverStatus = { ok: false };
  }
  return serverStatus;
}

export async function aiMode() {
  const s = settings.get();
  if (s.openaiKey) return { mode: "browser", model: s.model || "gpt-5-mini" };
  const server = await detectServer();
  if (server.ok && server.ai) return { mode: "server", model: server.model };
  return { mode: "none" };
}

export function buildPrompt(prompts, action, sourceText, jobDescription) {
  const def = prompts.actions[action];
  if (!def) throw new Error("Unknown AI action.");
  const parts = [`Task: ${def.task}`, "", "Constraints:", ...def.constraints.map((c) => `- ${c}`), "", "Resume content:", sourceText.trim()];
  if (jobDescription && jobDescription.trim()) parts.push("", "Job description:", jobDescription.trim());
  return { instructions: prompts.guardrails, input: parts.join("\n") };
}

function cleanOutput(text) {
  return (text || "")
    .replace(/^```[a-z]*\n?|```$/gim, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

export async function runAction(action, sourceText, jobDescription, { signal } = {}) {
  const prompts = await loadPrompts();
  const def = prompts.actions[action];
  if (def.needsJD && !(jobDescription || "").trim()) throw new Error("Add a job description first: this action tailors your resume to a specific role.");
  if (!sourceText.trim()) throw new Error("There’s no text to work with for this action.");
  const mode = await aiMode();
  const max = 16000;
  const src = sourceText.slice(0, max);
  const jd = (jobDescription || "").slice(0, 8000);

  if (mode.mode === "server") {
    const r = await fetch("api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, text: src, job_description: jd }),
      signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `AI request failed (${r.status}).`);
    return cleanOutput(data.text);
  }

  if (mode.mode === "browser") {
    const { instructions, input } = buildPrompt(prompts, action, src, jd);
    const s = settings.get();
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.openaiKey}` },
      body: JSON.stringify({
        model: s.model || "gpt-5-mini",
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input },
        ],
      }),
      signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error?.message || `OpenAI request failed (${r.status}).`;
      if (r.status === 401) throw new Error("Your OpenAI API key was rejected. Check it in Settings.");
      if (r.status === 429) throw new Error("OpenAI rate limit or quota reached. Check your billing, or try again shortly.");
      throw new Error(msg);
    }
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("The model returned an empty response.");
    return cleanOutput(text);
  }

  const err = new Error("AI is not configured. Add your OpenAI API key in Settings to unlock AI rewrites.");
  err.code = "NO_AI";
  throw err;
}
