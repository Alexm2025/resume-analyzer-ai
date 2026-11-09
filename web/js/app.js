import { analyzeResume, buildHighlights, quickRewrite, gradeFor } from "./analyzer.js";
import { extractText, ACCEPTED } from "./parser.js";
import { reports, settings, uid } from "./store.js";
import { loadPrompts, runAction, aiMode } from "./ai.js";
import { SAMPLE_RESUME, SAMPLE_JD } from "./sample.js";

const app = document.getElementById("app");

/* ---------------- Utilities ---------------- */
const ICONS = {
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  paste: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  cube: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  wand: '<path d="m15 4 5 5M3 21l12-12M14 3l1 1M20 9l1 1M18 2v2M22 6h-2M9 4v2M6 7H4"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toneFor = (score) => (score >= 80 ? "great" : score >= 70 ? "good" : score >= 55 ? "warn" : "bad");
const pct = (n) => `${Math.round(n * 100)}%`;
const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const fmtTime = (ts) => new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const CATEGORY_LABEL = { impact: "Impact", structure: "Structure", ats: "ATS", style: "Style", skills: "Skills", match: "Job match" };

function toast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `${type === "success" ? icon("check") : type === "error" ? icon("alert") : icon("info")}<span>${esc(message)}</span>`;
  $("#toasts").appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, type === "error" ? 5200 : 3000);
}

function download(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard", "success");
  } catch {
    toast("Couldn’t access the clipboard", "error");
  }
}

function safeName(name) {
  return (name || "resume").replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "resume";
}

function countUp(el, to, ms = 1100) {
  const start = performance.now();
  const from = 0;
  const step = (t) => {
    const p = Math.min(1, (t - start) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function ringSvg(r, stroke) {
  const c = 2 * Math.PI * r;
  const size = (r + stroke) * 2;
  return {
    c,
    html: `<svg viewBox="0 0 ${size} ${size}"><circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"/><circle class="bar" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}"/></svg>`,
  };
}

function animateIn(root) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      $$("[data-ring]", root).forEach((el) => {
        const bar = $(".bar", el);
        const c = Number(bar.getAttribute("stroke-dasharray"));
        bar.style.strokeDashoffset = String(c * (1 - Number(el.dataset.ring) / 100));
      });
      $$("[data-meter]", root).forEach((el) => (el.style.width = `${el.dataset.meter}%`));
      $$("[data-count]", root).forEach((el) => countUp(el, Number(el.dataset.count)));
    });
  });
}

function updateHistoryCount() {
  const n = reports.all().length;
  const el = $("#historyCount");
  el.hidden = n === 0;
  el.textContent = n;
}

/* ---------------- Theme & settings ---------------- */
function effectiveTheme() {
  const t = document.documentElement.getAttribute("data-theme");
  if (t) return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme(theme) {
  if (theme === "light" || theme === "dark") document.documentElement.setAttribute("data-theme", theme);
  else document.documentElement.removeAttribute("data-theme");
}
$("#themeToggle").addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  settings.set({ theme: next });
});

const dialog = $("#settingsDialog");
async function refreshAiStatus() {
  const el = $("#aiStatus");
  const m = await aiMode();
  el.innerHTML =
    m.mode === "browser" ? `<span class="led on"></span> AI on: using your OpenAI key (${esc(m.model)})`
      : m.mode === "server" ? `<span class="led on"></span> AI on: provided by this server (${esc(m.model || "default model")})`
        : `<span class="led"></span> AI off: add a key below to enable AI rewrites`;
}
function openSettings() {
  const s = settings.get();
  $("#openaiKey").value = s.openaiKey || "";
  $("#model").value = s.model || "gpt-5-mini";
  $("#themeSelect").value = s.theme || "system";
  refreshAiStatus();
  dialog.showModal();
}
$("#settingsBtn").addEventListener("click", openSettings);
dialog.addEventListener("close", () => {
  if (dialog.returnValue !== "save") return;
  const next = settings.set({
    openaiKey: $("#openaiKey").value.trim(),
    model: $("#model").value.trim() || "gpt-5-mini",
    theme: $("#themeSelect").value,
  });
  applyTheme(next.theme);
  toast("Settings saved", "success");
  if (currentView === "report" && ui.tab === "ai") renderPanel();
});
$("#clearData").addEventListener("click", () => {
  if (!confirm("Delete all saved reports and your API key from this browser?")) return;
  reports.clear();
  settings.set({ openaiKey: "" });
  dialog.close();
  updateHistoryCount();
  toast("All local data deleted", "success");
  location.hash = "#/";
  route();
});

/* ---------------- Loading overlay ---------------- */
const LOAD_STEPS = ["Reading your resume", "Detecting sections", "Running 30+ checks", "Building your report"];
function showLoading() {
  const el = document.createElement("div");
  el.className = "loading-overlay";
  el.id = "loading";
  el.innerHTML = `<div class="card loading-card" role="status"><div class="spinner"></div><h3>Analyzing your resume</h3>
    <ol class="load-steps">${LOAD_STEPS.map((s) => `<li><span class="dot"></span>${s}</li>`).join("")}</ol></div>`;
  document.body.appendChild(el);
  return {
    step(i) {
      $$(".load-steps li", el).forEach((li, j) => {
        li.className = j < i ? "done" : j === i ? "active" : "";
        if (j < i) li.querySelector(".dot").innerHTML = icon("check");
      });
    },
    close() {
      el.remove();
    },
  };
}

async function runAnalysis({ text, file, name, jobDescription = "", source, parentId = null }) {
  const loader = showLoading();
  try {
    loader.step(0);
    let pageCount = null;
    if (file) {
      const res = await extractText(file);
      text = res.text;
      pageCount = res.pageCount;
    }
    await sleep(280);
    loader.step(1);
    await sleep(280);
    loader.step(2);
    const analysis = analyzeResume(text, { jobDescription, pageCount });
    await sleep(320);
    loader.step(3);
    const prev = parentId ? reports.get(parentId) : reports.all().find((r) => r.name === name);
    const report = {
      id: uid(),
      name,
      createdAt: Date.now(),
      text,
      jobDescription,
      pageCount,
      analysis,
      aiResults: [],
      source,
      prevScore: prev ? prev.analysis.score : null,
    };
    reports.save(report);
    updateHistoryCount();
    await sleep(220);
    loader.close();
    ui.tab = "overview";
    location.hash = `#/report/${report.id}`;
  } catch (err) {
    loader.close();
    toast(err.message || "Something went wrong while analyzing.", "error");
  }
}

/* ---------------- Home ---------------- */
const home = { mode: "file", file: null, text: "", jd: "" };

function renderHome() {
  app.innerHTML = `
  <section class="hero">
    <div class="container hero-grid">
      <div>
        <span class="eyebrow">${icon("shield")} Free · Private · No sign-up</span>
        <h1>Beat the ATS.<br><span class="grad">Land the interview.</span></h1>
        <p class="hero-lead">Get an instant resume score with line-by-line feedback, keyword gaps for the exact job you want, and AI rewrites that stay true to your experience.</p>
        <div class="hero-points">
          <span>${icon("check")} 30+ recruiter-grade checks</span>
          <span>${icon("check")} Job description matching</span>
          <span>${icon("check")} Live score as you edit</span>
          <span>${icon("check")} AI rewrites &amp; cover letters</span>
        </div>
        <div class="hero-stats">
          <div><strong>&lt; 2s</strong><span>to a full report</span></div>
          <div><strong>6</strong><span>scoring categories</span></div>
          <div><strong>0</strong><span>files uploaded to a server</span></div>
        </div>
      </div>
      <div class="card upload-card">
        <div class="seg" role="tablist" aria-label="Input method">
          <button role="tab" data-mode="file" aria-selected="${home.mode === "file"}">${icon("upload")} Upload file</button>
          <button role="tab" data-mode="paste" aria-selected="${home.mode === "paste"}">${icon("paste")} Paste text</button>
        </div>
        <div id="inputArea"></div>
        <details class="jd-toggle" ${home.jd ? "open" : ""}>
          <summary>${icon("target")} Target a specific job <span class="tag-new">Recommended</span> <span class="chev">${icon("chev")}</span></summary>
          <div class="jd-body">
            <textarea id="jdInput" rows="5" placeholder="Paste the job description to see your match score and missing keywords…">${esc(home.jd)}</textarea>
            <button class="btn btn-ghost btn-sm" type="button" id="sampleJd" style="align-self:flex-start">Use an example job</button>
          </div>
        </details>
        <div class="upload-actions">
          <button class="btn btn-primary btn-lg btn-block" id="analyzeBtn">${icon("bolt")} Analyze my resume</button>
          <div class="sample-link">No resume handy? <button type="button" id="trySample">Try a sample resume ${icon("arrow")}</button></div>
          <div class="privacy-note">${icon("lock")} Processed locally in your browser. Nothing is uploaded.</div>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <span class="eyebrow">${icon("layers")} Everything in one report</span>
        <h2>Know exactly what to fix, and why</h2>
        <p>Not just a number. Every issue comes with evidence from your resume and a concrete fix.</p>
      </div>
      <div class="features">
        ${feature("chart", "fi-indigo", "Six-part score", "Impact, structure, ATS readiness, writing style, skills and job match, weighted like a recruiter would.")}
        ${feature("eye", "fi-green", "Highlighted resume", "See weak phrases, clichés, passive voice, metrics and strong verbs marked right in your text.")}
        ${feature("target", "fi-blue", "Job match & gaps", "Paste a job post to see matched and missing keywords, degree checks and a match score.")}
        ${feature("edit", "fi-amber", "Live editor", "Edit your resume and watch the score update as you type, then save it as a new version.")}
        ${feature("wand", "fi-red", "Instant bullet fixer", "One-click rewrites for weak bullets, no AI key needed. Flags bullets that need a metric.")}
        ${feature("spark", "fi-indigo", "AI studio", "Rewrite bullets, tailor to a job, generate a cover letter or interview prep. No made-up facts.")}
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:8px">
    <div class="container">
      <div class="section-head"><h2>Three steps. Two minutes.</h2></div>
      <div class="steps">
        <div class="card step"><h3>Drop your resume</h3><p>PDF, DOCX or plain text. Optionally paste the job you’re applying for.</p></div>
        <div class="card step"><h3>Review the report</h3><p>Prioritized issues, highlighted text, keyword gaps and a section-by-section breakdown.</p></div>
        <div class="card step"><h3>Fix &amp; re-score</h3><p>Use the live editor, bullet fixer or AI studio, then track your progress in History.</p></div>
      </div>
    </div>
  </section>`;

  renderInputArea();
  $$(".seg button").forEach((b) =>
    b.addEventListener("click", () => {
      home.mode = b.dataset.mode;
      $$(".seg button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      renderInputArea();
    }),
  );
  $("#jdInput").addEventListener("input", (e) => (home.jd = e.target.value));
  $("#sampleJd").addEventListener("click", () => {
    home.jd = SAMPLE_JD;
    $("#jdInput").value = SAMPLE_JD;
  });
  $("#trySample").addEventListener("click", () =>
    runAnalysis({ text: SAMPLE_RESUME, name: "Sample – Jordan Rivera", jobDescription: home.jd || SAMPLE_JD, source: "sample" }),
  );
  $("#analyzeBtn").addEventListener("click", () => {
    if (home.mode === "file") {
      if (!home.file) {
        toast("Choose a resume file first, or try the sample.", "error");
        return;
      }
      runAnalysis({ file: home.file, name: home.file.name, jobDescription: home.jd, source: "file" });
    } else {
      if (home.text.trim().split(/\s+/).length < 30) {
        toast("Paste your full resume text (at least a few lines).", "error");
        return;
      }
      runAnalysis({ text: home.text, name: "Pasted resume", jobDescription: home.jd, source: "paste" });
    }
  });
}

function feature(ic, cls, title, body) {
  return `<div class="card feature"><div class="feature-icon ${cls}">${icon(ic)}</div><h3>${title}</h3><p>${body}</p></div>`;
}

function renderInputArea() {
  const area = $("#inputArea");
  if (home.mode === "paste") {
    area.innerHTML = `<label class="sr-only" for="pasteInput">Resume text</label><textarea id="pasteInput" rows="10" placeholder="Paste your resume text here…">${esc(home.text)}</textarea>`;
    $("#pasteInput").addEventListener("input", (e) => (home.text = e.target.value));
    return;
  }
  area.innerHTML = `
    <label class="dropzone" id="dropzone" tabindex="0">
      <input type="file" id="fileInput" accept="${ACCEPTED}" hidden>
      ${home.file ? fileChip(home.file) : `
        <span class="dropzone-icon">${icon("upload")}</span>
        <strong>Drop your resume here</strong>
        <span class="hint">or <u>browse files</u> · PDF, DOCX, TXT · up to 10 MB</span>`}
    </label>`;
  const dz = $("#dropzone");
  const input = $("#fileInput");
  input.addEventListener("change", () => input.files[0] && setFile(input.files[0]));
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });
  ["dragenter", "dragover"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add("drag");
    }),
  );
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove("drag")));
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  });
  const rm = $("#removeFile");
  if (rm)
    rm.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      home.file = null;
      renderInputArea();
    });
}

function fileChip(f) {
  const ext = (f.name.split(".").pop() || "").toUpperCase().slice(0, 4);
  return `<div class="file-chip"><span class="fi">${esc(ext)}</span><div class="meta"><strong>${esc(f.name)}</strong><span>${(f.size / 1024).toFixed(0)} KB · ready to analyze</span></div>
    <button class="icon-btn" id="removeFile" type="button" aria-label="Remove file">${icon("x")}</button></div>`;
}

function setFile(f) {
  if (!/\.(pdf|docx|txt|md)$/i.test(f.name)) {
    toast("Please choose a PDF, DOCX or TXT file.", "error");
    return;
  }
  home.file = f;
  renderInputArea();
}

/* ---------------- Report ---------------- */
const ui = { tab: "overview", issueFilter: "all", hlOff: new Set(), aiAction: "rewrite_bullets", aiOutput: null, aiSource: null, aiBusy: false, compare: false };
let currentReport = null;

function renderReport(id) {
  const r = reports.get(id);
  if (!r) {
    app.innerHTML = `<div class="container page"><div class="card empty"><div class="feature-icon fi-amber">${icon("alert")}</div><h2>Report not found</h2><p>It may have been deleted, or it was saved in a different browser.</p><a class="btn btn-primary" href="#/">Analyze a resume</a></div></div>`;
    return;
  }
  if (currentReport?.id !== r.id) {
    ui.aiOutput = null;
    ui.aiSource = null;
    ui.compare = false;
  }
  currentReport = r;
  const a = r.analysis;
  const tone = a.grade.tone;
  const ring = ringSvg(80, 14);
  const delta = r.prevScore != null ? a.score - r.prevScore : null;
  const crit = a.issues.filter((i) => i.severity === "critical").length;
  const summaryLine = crit
    ? `${crit} critical issue${crit > 1 ? "s" : ""} holding your score back. Fix ${crit > 1 ? "these" : "it"} first.`
    : a.issues.length
      ? `No critical issues. ${a.issues.length} improvement${a.issues.length > 1 ? "s" : ""} will take it further.`
      : "Excellent. No issues found.";

  app.innerHTML = `
  <div class="container report">
    <div class="report-head">
      <div class="report-title">
        <a class="back" href="#/history">${icon("back")} All reports</a>
        <h1>${esc(r.name)}</h1>
        <div class="report-meta">
          <span>${icon("clock")} ${fmtTime(r.createdAt)}</span>
          <span>${icon("file")} ${a.stats.wordCount} words · ~${a.stats.estPages} page${a.stats.estPages > 1 ? "s" : ""}</span>
          ${r.jobDescription ? `<span>${icon("target")} Job match ${a.jobMatch?.score ?? 0}%</span>` : ""}
        </div>
      </div>
      <div class="report-actions">
        <button class="btn btn-secondary btn-sm" data-act="edit">${icon("edit")} Edit &amp; re-score</button>
        <button class="btn btn-secondary btn-sm" data-act="print">${icon("printer")} Export PDF</button>
        <button class="btn btn-ghost btn-sm" data-act="json" title="Download JSON">${icon("download")} JSON</button>
        <button class="btn btn-ghost btn-sm danger" data-act="delete" aria-label="Delete report">${icon("trash")}</button>
      </div>
    </div>

    <div class="overview-grid">
      <div class="card score-card tone-${tone}">
        <div class="ring" data-ring="${a.score}">${ring.html}
          <div class="ring-label"><strong data-count="${a.score}">0</strong><span>out of 100</span></div>
        </div>
        <div class="grade-pill">Grade ${a.grade.letter} · ${a.grade.label}</div>
        <p class="score-summary">${summaryLine}</p>
        ${delta != null && delta !== 0 ? `<div class="delta ${delta > 0 ? "up" : "down"}">${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)} points vs previous version</div>` : ""}
      </div>
      <div>
        <div class="cat-grid">
          ${a.categories.map((c) => `
            <div class="cat tone-${toneFor(c.score)}">
              <div class="cat-top"><span>${c.label}</span><strong>${c.score}</strong></div>
              <div class="meter"><i data-meter="${c.score}"></i></div>
              <p>${c.blurb}</p>
            </div>`).join("")}
          ${a.jobMatch ? "" : `
            <button class="cat cat-cta" data-act="addjd" type="button">
              <div class="cat-top"><span>Job match</span><strong style="color:var(--accent-text)">${icon("plus")}</strong></div>
              <div class="meter"></div>
              <p>Add a job post to see your match score and missing keywords.</p>
            </button>`}
        </div>
        <div class="stat-row">
          ${stat(a.stats.bulletCount, "bullet points")}
          ${stat(a.stats.bulletCount ? pct(a.stats.quantRatio) : "–", "quantified")}
          ${stat(a.stats.bulletCount ? pct(a.stats.actionRatio) : "–", "start with a verb")}
          ${stat(a.stats.skillsCount, "skills detected")}
          ${stat(`${Math.max(1, Math.round(a.stats.readingTimeSec / 60))} min`, "reading time")}
        </div>
      </div>
    </div>

    <div class="tabs" role="tablist" aria-label="Report sections">
      ${tabBtn("overview", "Overview")}
      ${tabBtn("issues", "Issues", a.issues.length, crit > 0)}
      ${tabBtn("resume", "Highlighted resume")}
      ${tabBtn("editor", "Live editor")}
      ${tabBtn("keywords", r.jobDescription ? "Job match & skills" : "Keywords & bullets")}
      ${tabBtn("ai", "AI studio")}
    </div>
    <div id="panel" class="tab-panel" role="tabpanel"></div>
  </div>`;

  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      ui.tab = t.dataset.tab;
      $$(".tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
      renderPanel();
    }),
  );
  $$("[data-act]").forEach((b) => b.addEventListener("click", () => reportAction(b.dataset.act)));
  animateIn(app);
  renderPanel();
}

function stat(value, label) {
  return `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
}

function tabBtn(key, label, count, bad) {
  return `<button class="tab" role="tab" data-tab="${key}" aria-selected="${ui.tab === key}">${label}${count != null ? ` <span class="count ${bad ? "bad" : ""}">${count}</span>` : ""}</button>`;
}

function reportAction(act) {
  const r = currentReport;
  if (act === "edit") {
    ui.tab = "editor";
    $$(".tab").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.tab === "editor")));
    renderPanel();
    $("#panel").scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (act === "addjd") {
    switchTab("keywords");
    setTimeout(() => $("#jdEdit")?.focus(), 350);
  } else if (act === "print") {
    window.print();
  } else if (act === "json") {
    download(`${safeName(r.name)}_report.json`, JSON.stringify({ name: r.name, createdAt: new Date(r.createdAt).toISOString(), ...r.analysis }, null, 2), "application/json");
  } else if (act === "delete") {
    if (!confirm(`Delete “${r.name}”?`)) return;
    reports.remove(r.id);
    updateHistoryCount();
    toast("Report deleted", "success");
    location.hash = "#/history";
  }
}

function renderPanel() {
  const panel = $("#panel");
  if (!panel) return;
  const fn = { overview: panelOverview, issues: panelIssues, resume: panelResume, editor: panelEditor, keywords: panelKeywords, ai: panelAi }[ui.tab] || panelOverview;
  fn(panel, currentReport);
}

function panelOverview(panel, r) {
  const a = r.analysis;
  const top = a.issues.filter((i) => i.severity !== "tip").slice(0, 4);
  const c = a.contact;
  const contactRows = [
    ["Email", c.email],
    ["Phone", c.phone],
    ["LinkedIn", c.linkedin],
    ["GitHub / portfolio", c.github || c.website],
    ["Location", c.location],
  ];
  panel.innerHTML = `
  <div class="two-col-wide">
    <div class="stack">
      <div class="card card-pad">
        <div class="card-head"><div><div class="card-title">${icon("bolt")} Top priorities</div><div class="card-sub">The fixes that will move your score the most.</div></div>
        ${a.issues.length > top.length ? `<button class="btn btn-ghost btn-sm" data-goto="issues">All ${a.issues.length} issues ${icon("arrow")}</button>` : ""}</div>
        ${top.length ? top.map((i, n) => `
          <div class="priority"><span class="num">${n + 1}</span><div><strong>${esc(i.title)}</strong><p>${esc(i.fix)}</p></div>
          <span class="sev sev-${i.severity}" style="margin-left:auto">${i.severity}</span></div>`).join("")
          : `<div class="priority"><span class="num ic-good">${icon("check")}</span><div><strong>Nothing urgent</strong><p>Check the Issues tab for polish tips.</p></div></div>`}
      </div>
      <div class="card card-pad">
        <div class="card-head"><div><div class="card-title">${icon("layers")} Sections detected</div><div class="card-sub">Standard headings help ATS software map your resume.</div></div></div>
        <div class="sections-grid">
          ${a.sections.filter((s) => s.present || s.tier !== "optional").map((s) => `
            <div class="sec-pill ${s.present ? "on" : "off"} ${s.tier === "core" ? "core" : ""}"><span class="ic">${icon(s.present ? "check" : s.tier === "core" ? "x" : "plus")}</span>${s.label}
            <small>${s.present ? `${s.wordCount}w` : s.tier === "core" ? "missing" : "optional"}</small></div>`).join("")}
        </div>
      </div>
    </div>
    <div class="stack">
      <div class="card card-pad">
        <div class="card-head"><div><div class="card-title">${icon("star")} What’s working</div></div></div>
        <ul class="list-plain">
          ${a.strengths.length ? a.strengths.map((s) => `<li class="check-item"><span class="ic ic-good">${icon("check")}</span><span>${esc(s)}</span></li>`).join("")
            : `<li class="check-item"><span class="ic ic-muted">${icon("info")}</span><span>Fix the top priorities and your strengths will show up here.</span></li>`}
        </ul>
      </div>
      <div class="card card-pad">
        <div class="card-head"><div><div class="card-title">${icon("scan")} Contact details</div><div class="card-sub">What an ATS will extract from your header.</div></div></div>
        <ul class="list-plain">
          ${contactRows.map(([k, v]) => `<li class="check-item"><span class="ic ${v ? "ic-good" : k === "Location" ? "ic-muted" : "ic-warn"}">${icon(v ? "check" : k === "Location" ? "info" : "alert")}</span>
            <span>${k}<small>${v ? esc(v) : k === "Location" ? "Optional, but helps with local roles" : "Not found"}</small></span></li>`).join("")}
        </ul>
      </div>
    </div>
  </div>`;
  $$("[data-goto]", panel).forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.goto)));
}
ICONS.star = '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>';

function switchTab(tab) {
  ui.tab = tab;
  $$(".tab").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.tab === tab)));
  renderPanel();
  $(".tabs").scrollIntoView({ behavior: "smooth", block: "start" });
}

function panelIssues(panel, r) {
  const a = r.analysis;
  const counts = { all: a.issues.length, critical: 0, warning: 0, tip: 0 };
  a.issues.forEach((i) => counts[i.severity]++);
  const list = ui.issueFilter === "all" ? a.issues : a.issues.filter((i) => i.severity === ui.issueFilter);
  panel.innerHTML = `
    <div class="filters" role="group" aria-label="Filter issues">
      ${["all", "critical", "warning", "tip"].map((f) => `<button class="chip-btn" data-f="${f}" aria-pressed="${ui.issueFilter === f}">${f === "all" ? "All" : f[0].toUpperCase() + f.slice(1) + "s"} <span>${counts[f]}</span></button>`).join("")}
    </div>
    ${list.length ? list.map((i, n) => `
      <details class="issue" ${n === 0 ? "open" : ""}>
        <summary><span class="sev sev-${i.severity}">${i.severity}</span><div><div class="issue-title">${esc(i.title)}</div><div class="issue-cat">${CATEGORY_LABEL[i.category] || i.category}</div></div><span class="chev">${icon("chev")}</span></summary>
        <div class="issue-body">
          <p>${esc(i.detail)}</p>
          <div class="fix">${icon("check")}<span><b>How to fix:</b> ${esc(i.fix)}</span></div>
          ${i.evidence?.length ? (i.evidence.every((e) => e.length < 28)
            ? `<div class="evidence-chips">${i.evidence.map((e) => `<span class="chip ${i.category === "match" ? "bad" : ""}">${esc(e)}</span>`).join("")}</div>`
            : `<div class="evidence">${i.evidence.map((e) => `<q>${esc(e)}</q>`).join("")}</div>`) : ""}
        </div>
      </details>`).join("")
      : `<div class="card empty"><div class="feature-icon fi-green">${icon("check")}</div><h2>Nothing here</h2><p>No ${ui.issueFilter === "all" ? "" : ui.issueFilter + " "}issues found.</p></div>`}`;
  $$("[data-f]", panel).forEach((b) =>
    b.addEventListener("click", () => {
      ui.issueFilter = b.dataset.f;
      panelIssues(panel, r);
    }),
  );
}

const HL_TYPES = [
  ["weak", "Weak phrase", "--hl-weak"],
  ["buzz", "Cliché", "--hl-buzz"],
  ["pronoun", "Pronoun", "--hl-pronoun"],
  ["passive", "Passive voice", "--hl-passive"],
  ["metric", "Metric", "--hl-metric"],
  ["verb", "Action verb", "--hl-verb"],
  ["keyword", "Job keyword", "--hl-keyword"],
];

function highlightHtml(text, spans) {
  let out = "";
  let i = 0;
  for (const s of spans) {
    out += esc(text.slice(i, s.start));
    out += `<mark class="${s.type}" title="${esc(s.title)}">${esc(text.slice(s.start, s.end))}</mark>`;
    i = s.end;
  }
  return out + esc(text.slice(i));
}

function panelResume(panel, r) {
  const spans = buildHighlights(r.text, r.analysis);
  const counts = {};
  spans.forEach((s) => (counts[s.type] = (counts[s.type] || 0) + 1));
  const types = HL_TYPES.filter(([k]) => counts[k]);
  panel.innerHTML = `
    <div class="legend" role="group" aria-label="Toggle highlights">
      ${types.map(([k, label, v]) => `<button data-hl="${k}" aria-pressed="${!ui.hlOff.has(k)}"><i style="background:var(${v})"></i>${label} <span class="muted">${counts[k]}</span></button>`).join("")}
    </div>
    <div class="doc ${[...ui.hlOff].map((k) => "off-" + k).join(" ")}" id="doc">${highlightHtml(r.text, spans)}</div>
    <p class="hint" style="margin-top:10px">Hover a highlight for a tip. This is the text an ATS extracts from your file. If it looks scrambled, the ATS sees it that way too.</p>`;
  $$("[data-hl]", panel).forEach((b) =>
    b.addEventListener("click", () => {
      const k = b.dataset.hl;
      ui.hlOff.has(k) ? ui.hlOff.delete(k) : ui.hlOff.add(k);
      b.setAttribute("aria-pressed", String(!ui.hlOff.has(k)));
      $("#doc").classList.toggle("off-" + k, ui.hlOff.has(k));
    }),
  );
}

function panelEditor(panel, r) {
  panel.innerHTML = `
    <div class="editor-grid">
      <div>
        <label class="sr-only" for="editor">Resume text</label>
        <textarea id="editor" spellcheck="true">${esc(r.text)}</textarea>
        <p class="hint" style="margin-top:8px">Tip: keep one section heading per line (e.g. EXPERIENCE) and start bullets with “•” or “-”.</p>
      </div>
      <div class="card card-pad live-panel" id="live"></div>
    </div>`;
  const ed = $("#editor");
  let timer;
  const update = () => {
    const a = analyzeResume(ed.value, { jobDescription: r.jobDescription });
    const d = a.score - r.analysis.score;
    const crit = a.issues.filter((i) => i.severity === "critical").length;
    $("#live").innerHTML = `
      <div class="card-title" style="margin-bottom:12px">${icon("bolt")} Live score</div>
      <div class="live-score tone-${a.grade.tone}"><strong>${a.score}</strong>
        <div><div style="font-weight:700">Grade ${a.grade.letter}</div><div class="delta ${d > 0 ? "up" : d < 0 ? "down" : ""}" style="margin:0">${d === 0 ? "No change yet" : `${d > 0 ? "▲ +" : "▼ "}${d} vs saved`}</div></div></div>
      <div class="live-cats">${a.categories.map((c) => `<div class="row tone-${toneFor(c.score)}"><span>${c.label}</span><div class="meter"><i style="width:${c.score}%"></i></div><b>${c.score}</b></div>`).join("")}</div>
      <p class="hint" style="margin:14px 0">${crit} critical · ${a.issues.length - crit} other issues</p>
      <button class="btn btn-primary btn-block" id="saveVersion" ${ed.value.trim() === r.text.trim() ? "disabled" : ""}>${icon("check")} Save as new version</button>
      <button class="btn btn-ghost btn-block btn-sm" id="resetEditor" style="margin-top:6px">${icon("refresh")} Reset changes</button>`;
    $("#saveVersion").addEventListener("click", () =>
      runAnalysis({ text: ed.value, name: r.name, jobDescription: r.jobDescription, source: "edit", parentId: r.id }),
    );
    $("#resetEditor").addEventListener("click", () => {
      ed.value = r.text;
      update();
    });
  };
  ed.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(update, 220);
  });
  update();
}

function panelKeywords(panel, r) {
  const a = r.analysis;
  const jm = a.jobMatch;
  const ring = ringSvg(34, 9);
  const groups = Object.entries(a.skills.byGroup);
  const flagged = a.bullets.filter((b) => !b.actionVerb || !b.quantified || b.weak.length);
  panel.innerHTML = `
  <div class="two-col">
    <div class="card card-pad">
      <div class="card-head"><div><div class="card-title">${icon("target")} Job match</div><div class="card-sub">${jm ? "Keywords from the job description found in your resume." : "Paste a job description to see how well you match."}</div></div></div>
      ${jm ? `
        <div class="match-head tone-${toneFor(jm.score)}">
          <div class="mini-ring" data-ring="${jm.score}">${ring.html}<b>${jm.score}</b></div>
          <div><div style="font-weight:700">${jm.score >= 75 ? "Strong match" : jm.score >= 50 ? "Partial match" : "Weak match"}</div>
          <div class="card-sub">${jm.matched.length} of ${jm.matched.length + jm.missing.length} keywords found${jm.yearsRequired ? ` · asks for ${jm.yearsRequired}+ years` : ""}${jm.degreeRequired ? ` · degree ${jm.degreeFound ? "✓" : "not found"}` : ""}</div></div>
        </div>
        <div class="sub-h">${icon("x")} Missing keywords</div>
        <div class="chips">${jm.missing.length ? jm.missing.map((k) => `<span class="chip bad">${esc(k.term)}</span>`).join("") : `<span class="muted">None, great coverage.</span>`}</div>
        <div class="sub-h">${icon("check")} Matched keywords</div>
        <div class="chips">${jm.matched.map((k) => `<span class="chip good">${esc(k.term)}</span>`).join("") || `<span class="muted">No matches yet.</span>`}</div>
        <details class="jd-toggle"><summary>${icon("edit")} Edit job description <span class="chev">${icon("chev")}</span></summary>
          <div class="jd-body"><textarea id="jdEdit" rows="7">${esc(r.jobDescription)}</textarea><button class="btn btn-secondary btn-sm" id="jdApply" style="align-self:flex-start">${icon("refresh")} Update match</button></div></details>`
        : `<div class="jd-body"><textarea id="jdEdit" rows="8" placeholder="Paste the job description here…"></textarea>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="jdApply">${icon("target")} Check my match</button><button class="btn btn-ghost btn-sm" id="jdSample">Use an example job</button></div></div>`}
    </div>
    <div class="card card-pad">
      <div class="card-head"><div><div class="card-title">${icon("layers")} Skills detected</div><div class="card-sub">${a.stats.skillsCount} skills recognized across ${groups.length} categories.</div></div></div>
      ${groups.length ? groups.map(([g, list]) => `<div class="skill-group"><h4>${g}</h4><div class="chips">${list.map((s) => `<span class="chip accent">${esc(s)}</span>`).join("")}</div></div>`).join("")
        : `<p class="muted">No recognizable skills yet. Add a Skills section listing your tools and technologies.</p>`}
    </div>
  </div>
  <div class="card card-pad" style="margin-top:16px">
    <div class="card-head"><div><div class="card-title">${icon("wand")} Bullet-by-bullet check</div><div class="card-sub">${a.bullets.length} bullets analyzed · ${flagged.length} could be stronger. Click <b>Fix</b> for an instant rewrite (no AI needed).</div></div></div>
    ${a.bullets.length ? `<div class="table-wrap"><table class="bullets-table">
      <thead><tr><th>Bullet</th><th>Verb</th><th>Metric</th><th></th></tr></thead>
      <tbody>${a.bullets.map((b, i) => `
        <tr><td>${esc(b.text)}${b.weak.length ? `<div class="chips" style="margin-top:6px">${b.weak.map((w) => `<span class="chip bad">${esc(w)}</span>`).join("")}</div>` : ""}</td>
          <td class="flag">${b.actionVerb ? `<span class="tick" title="Starts with an action verb">${icon("check")}</span>` : `<span class="cross" title="Doesn't start with an action verb">${icon("x")}</span>`}</td>
          <td class="flag">${b.quantified ? `<span class="tick" title="Includes a number">${icon("check")}</span>` : `<span class="cross" title="No metric">${icon("x")}</span>`}</td>
          <td class="flag">${!b.actionVerb || b.weak.length || !b.quantified ? `<button class="btn btn-ghost btn-sm" data-fix="${i}">Fix</button>` : ""}</td></tr>
        <tr class="fix-row" id="fix-${i}" hidden><td colspan="4"></td></tr>`).join("")}</tbody></table></div>`
      : `<p class="muted">No bullet points detected. Break your experience into bullets that start with “•” or “-”.</p>`}
  </div>`;
  animateIn(panel);
  const applyJd = async (jd) => {
    const analysis = analyzeResume(r.text, { jobDescription: jd, pageCount: r.pageCount });
    const updated = reports.update(r.id, { jobDescription: jd, analysis });
    toast(jd ? `Job match: ${analysis.jobMatch?.score ?? 0}%` : "Job description removed", "success");
    currentReport = updated;
    ui.tab = "keywords";
    renderReport(r.id);
  };
  $("#jdApply")?.addEventListener("click", () => applyJd($("#jdEdit").value.trim()));
  $("#jdSample")?.addEventListener("click", () => applyJd(SAMPLE_JD));
  $$("[data-fix]", panel).forEach((btn) =>
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.fix);
      const row = $(`#fix-${i}`);
      if (!row.hidden) {
        row.hidden = true;
        return;
      }
      const fix = quickRewrite(a.bullets[i].text);
      row.querySelector("td").innerHTML = `<div class="rewrite"><div class="after">${icon("arrow")} ${esc(fix.rewritten)}${fix.needsMetric ? ` <span class="chip" style="margin-left:4px">+ add [metric]</span>` : ""}</div>
        <div class="notes">${fix.changes.map(esc).join(" · ")}</div>
        <div><button class="btn btn-secondary btn-sm" data-copy>${icon("copy")} Copy</button></div></div>`;
      row.querySelector("[data-copy]").addEventListener("click", () => copyText(fix.rewritten));
      row.hidden = false;
    }),
  );
}

function defaultSource(r, def) {
  const sec = (k) => r.analysis.sections.find((s) => s.key === k)?.text || "";
  if (def.source === "bullets") {
    const weak = r.analysis.bullets.filter((b) => !b.actionVerb || !b.quantified || b.weak.length);
    const list = (weak.length ? weak : r.analysis.bullets).slice(0, 12);
    return list.map((b) => `- ${b.text}`).join("\n") || sec("experience") || r.text.slice(0, 2000);
  }
  if (def.source === "summary") return sec("summary") || r.text.slice(0, 1200);
  if (def.source === "projects") return sec("projects") || r.text.slice(0, 2000);
  return r.text;
}

async function panelAi(panel, r) {
  panel.innerHTML = `<div class="shimmer"><i style="width:60%"></i><i></i><i style="width:80%"></i></div>`;
  let prompts;
  try {
    prompts = await loadPrompts();
  } catch (e) {
    panel.innerHTML = `<div class="card empty"><h2>AI studio unavailable</h2><p>${esc(e.message)}</p></div>`;
    return;
  }
  const mode = await aiMode();
  if (ui.tab !== "ai" || currentReport?.id !== r.id) return;
  const def = prompts.actions[ui.aiAction];
  if (ui.aiSource == null) ui.aiSource = defaultSource(r, def);
  const isFull = def.source === "full" && !["cover_letter", "interview_prep"].includes(ui.aiAction);

  panel.innerHTML = `
    ${mode.mode === "none" ? `
      <div class="ai-banner"><div class="feature-icon fi-indigo">${icon("key")}</div>
        <div><strong>Connect AI to unlock rewrites</strong><p>Add your own OpenAI API key. It stays in this browser and is sent only to OpenAI. Meanwhile, the instant <b>Bullet fixer</b> in the Keywords tab works without a key.</p></div>
        <button class="btn btn-primary btn-sm" id="openSettings">${icon("key")} Add API key</button></div>` : `
      <div class="ai-banner"><div class="feature-icon fi-green">${icon("spark")}</div>
        <div><strong>AI is ready</strong><p>${mode.mode === "server" ? "Running through this app’s server." : `Using your key with ${esc(mode.model)}.`} Outputs never invent facts; placeholders like [X%] mark where you should add real numbers.</p></div></div>`}
    <div class="action-grid" role="group" aria-label="AI actions">
      ${Object.entries(prompts.actions).map(([k, d]) => `
        <button class="action-card" data-action="${k}" aria-pressed="${k === ui.aiAction}">
          <span class="top">${icon(d.icon)} ${esc(d.label)}${d.needsJD ? `<span class="badge">needs job</span>` : ""}</span>
          <p>${esc(d.description)}</p></button>`).join("")}
    </div>
    <div class="two-col">
      <div class="card card-pad">
        <div class="card-head"><div><div class="card-title">${icon("file")} Input</div><div class="card-sub">Pre-filled from your resume. Edit freely.</div></div>
          <button class="btn btn-ghost btn-sm" id="resetSource">${icon("refresh")} Reset</button></div>
        <textarea id="aiSource" rows="12">${esc(ui.aiSource)}</textarea>
        ${def.needsJD || r.jobDescription ? `<div class="field" style="margin-top:12px"><label for="aiJd">Job description${def.needsJD ? "" : " (optional)"}</label><textarea id="aiJd" rows="4" placeholder="Paste the job description…">${esc(r.jobDescription)}</textarea></div>` : ""}
        <button class="btn btn-primary btn-block" id="aiRun" style="margin-top:14px" ${ui.aiBusy ? "disabled" : ""}>${icon("spark")} ${ui.aiBusy ? "Generating…" : `Generate: ${esc(def.label)}`}</button>
      </div>
      <div class="card card-pad">
        <div class="card-head"><div><div class="card-title">${icon("spark")} Result</div><div class="card-sub">${ui.aiOutput ? "Review carefully before using." : "Your AI output will appear here."}</div></div>
          ${ui.aiOutput ? `<button class="btn btn-ghost btn-sm" id="toggleCompare">${icon("layers")} ${ui.compare ? "Hide" : "Compare"}</button>` : ""}</div>
        <div id="aiOut">${aiOutputHtml(def)}</div>
        ${ui.aiOutput ? `<div class="output-actions">
          <button class="btn btn-secondary btn-sm" id="aiCopy">${icon("copy")} Copy</button>
          <button class="btn btn-secondary btn-sm" id="aiDownload">${icon("download")} Download .txt</button>
          ${isFull ? `<button class="btn btn-primary btn-sm" id="aiAnalyze">${icon("bolt")} Score this version</button>` : ""}
        </div>` : ""}
      </div>
    </div>
    ${r.aiResults?.length ? `<details class="past-results card card-pad"><summary>${icon("clock")} Previous generations (${r.aiResults.length})</summary>
      <div style="margin-top:10px">${r.aiResults.map((x, i) => `<div class="past-item"><b>${esc(prompts.actions[x.action]?.label || x.action)}</b><button class="btn btn-ghost btn-sm" data-past="${i}">View</button><span>${fmtTime(x.at)}</span></div>`).join("")}</div></details>` : ""}`;

  $("#openSettings")?.addEventListener("click", openSettings);
  $$("[data-action]", panel).forEach((b) =>
    b.addEventListener("click", () => {
      if (ui.aiBusy) return;
      ui.aiAction = b.dataset.action;
      ui.aiSource = defaultSource(r, prompts.actions[ui.aiAction]);
      ui.aiOutput = null;
      ui.compare = false;
      panelAi(panel, r);
    }),
  );
  $("#aiSource").addEventListener("input", (e) => (ui.aiSource = e.target.value));
  $("#resetSource").addEventListener("click", () => {
    ui.aiSource = defaultSource(r, def);
    $("#aiSource").value = ui.aiSource;
  });
  $("#toggleCompare")?.addEventListener("click", () => {
    ui.compare = !ui.compare;
    panelAi(panel, r);
  });
  $("#aiCopy")?.addEventListener("click", () => copyText(ui.aiOutput));
  $("#aiDownload")?.addEventListener("click", () => download(`${safeName(r.name)}_${ui.aiAction}.txt`, ui.aiOutput));
  $("#aiAnalyze")?.addEventListener("click", () =>
    runAnalysis({ text: ui.aiOutput, name: r.name, jobDescription: $("#aiJd")?.value.trim() || r.jobDescription, source: "ai", parentId: r.id }),
  );
  $$("[data-past]", panel).forEach((b) =>
    b.addEventListener("click", () => {
      const x = r.aiResults[Number(b.dataset.past)];
      ui.aiAction = x.action;
      ui.aiSource = x.input;
      ui.aiOutput = x.output;
      panelAi(panel, r);
      $(".action-grid").scrollIntoView({ behavior: "smooth" });
    }),
  );
  $("#aiRun").addEventListener("click", async () => {
    const jd = $("#aiJd")?.value.trim() ?? r.jobDescription;
    if (mode.mode === "none") {
      openSettings();
      return;
    }
    ui.aiBusy = true;
    ui.aiOutput = null;
    panelAi(panel, r);
    try {
      const out = await runAction(ui.aiAction, ui.aiSource, jd);
      ui.aiOutput = out;
      const list = [{ action: ui.aiAction, input: ui.aiSource, output: out, at: Date.now() }, ...(r.aiResults || [])].slice(0, 15);
      currentReport = reports.update(r.id, { aiResults: list }) || r;
      toast("Done! Review the result.", "success");
    } catch (e) {
      if (e.code === "NO_AI") openSettings();
      toast(e.message, "error");
    } finally {
      ui.aiBusy = false;
      if (ui.tab === "ai" && $("#panel")) panelAi($("#panel"), currentReport);
    }
  });
}

function aiOutputHtml() {
  if (ui.aiBusy) return `<div class="output-box empty"><div class="shimmer"><i style="width:70%"></i><i></i><i style="width:85%"></i><i style="width:55%"></i><i></i></div></div>`;
  if (!ui.aiOutput) return `<div class="output-box empty"><div>${icon("spark")}<br>Pick an action and press Generate.</div></div>`;
  if (ui.compare) return `<div class="compare"><div><h4>Before</h4><div class="output-box">${esc(ui.aiSource)}</div></div><div><h4>After</h4><div class="output-box">${esc(ui.aiOutput)}</div></div></div>`;
  return `<div class="output-box">${esc(ui.aiOutput)}</div>`;
}

/* ---------------- History ---------------- */
function renderHistory() {
  const list = reports.all();
  if (!list.length) {
    app.innerHTML = `<div class="container page"><div class="card empty"><div class="feature-icon fi-indigo">${icon("clock")}</div><h2>No reports yet</h2><p>Your analyses are saved privately in this browser so you can track progress.</p><a class="btn btn-primary" href="#/">${icon("bolt")} Analyze a resume</a></div></div>`;
    return;
  }
  const chrono = [...list].reverse();
  const best = Math.max(...list.map((r) => r.analysis.score));
  const avg = Math.round(list.reduce((s, r) => s + r.analysis.score, 0) / list.length);
  app.innerHTML = `
  <div class="container page">
    <div class="page-head">
      <div><h1>History</h1><p>${list.length} report${list.length > 1 ? "s" : ""} · best score ${best} · average ${avg}</p></div>
      <a class="btn btn-primary" href="#/">${icon("plus")} New analysis</a>
    </div>
    ${chrono.length >= 2 ? `<div class="card trend"><div class="card-title" style="margin-bottom:10px">${icon("chart")} Score over time</div>${trendSvg(chrono)}</div>` : ""}
    <div class="history-list">
      ${list.map((r) => `
        <div class="card h-item tone-${r.analysis.grade.tone}">
          <div class="h-score">${r.analysis.score}</div>
          <div class="h-main"><a href="#/report/${r.id}">${esc(r.name)}</a><span>${fmtTime(r.createdAt)} · ${r.analysis.stats.wordCount} words · ${r.analysis.issues.length} issues</span></div>
          <div class="h-tags">
            ${r.prevScore != null && r.analysis.score !== r.prevScore ? `<span class="chip ${r.analysis.score > r.prevScore ? "good" : "bad"}">${r.analysis.score > r.prevScore ? "+" : ""}${r.analysis.score - r.prevScore}</span>` : ""}
            ${r.jobDescription ? `<span class="chip">${icon("target")} ${r.analysis.jobMatch?.score ?? 0}% match</span>` : ""}
            ${r.source === "sample" ? `<span class="chip">sample</span>` : ""}
          </div>
          <button class="icon-btn" data-del="${r.id}" aria-label="Delete ${esc(r.name)}">${icon("trash")}</button>
        </div>`).join("")}
    </div>
  </div>`;
  $$("[data-del]").forEach((b) =>
    b.addEventListener("click", () => {
      const r = reports.get(b.dataset.del);
      if (!r || !confirm(`Delete “${r.name}”?`)) return;
      reports.remove(r.id);
      updateHistoryCount();
      renderHistory();
    }),
  );
}

function trendSvg(items) {
  const W = 800, H = 140, P = 28;
  const n = items.length;
  const x = (i) => P + (i * (W - P * 2)) / Math.max(1, n - 1);
  const y = (s) => H - P / 1.4 - ((H - P * 1.6) * s) / 100;
  const pts = items.map((r, i) => [x(i), y(r.analysis.score)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1][0]},${H - P / 1.4} L${pts[0][0]},${H - P / 1.4} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Score trend">
    <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${[0, 50, 100].map((v) => `<line class="grid" x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}"/><text x="0" y="${y(v) + 4}">${v}</text>`).join("")}
    <path class="area" d="${area}"/><path class="line" d="${line}" vector-effect="non-scaling-stroke"/>
    ${pts.map((p, i) => `<circle class="dot" cx="${p[0]}" cy="${p[1]}" r="4" vector-effect="non-scaling-stroke"><title>${esc(items[i].name)}: ${items[i].analysis.score} (${fmtDate(items[i].createdAt)})</title></circle>`).join("")}
  </svg>`;
}

/* ---------------- Router ---------------- */
let currentView = null;
function route() {
  const hash = location.hash || "#/";
  const m = hash.match(/^#\/([^/]*)\/?([^/]*)/) || [];
  const view = m[1] || "home";
  const id = m[2];
  const changed = view !== currentView || view === "report";
  currentView = view;
  $$("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === view || (view === "" && a.dataset.nav === "home")));
  if (view === "report" && id) renderReport(id);
  else if (view === "history") renderHistory();
  else {
    currentView = "home";
    renderHome();
  }
  if (changed) window.scrollTo({ top: 0 });
  app.focus({ preventScroll: true });
}

// Show every section when printing.
window.addEventListener("beforeprint", () => {
  if (currentView !== "report") return;
  const panel = $("#panel");
  panel.dataset.prev = ui.tab;
  const r = currentReport;
  panel.innerHTML = "";
  [["Overview", panelOverview], ["Issues", panelIssues], ["Keywords & bullets", panelKeywords]].forEach(([title, fn], i) => {
    const sec = document.createElement("section");
    sec.style.marginBottom = "18px";
    sec.innerHTML = `<h2 class="${i ? "print-break" : ""}" style="font-size:18px;margin:12px 0">${title}</h2><div></div>`;
    panel.appendChild(sec);
    const prevFilter = ui.issueFilter;
    ui.issueFilter = "all";
    fn(sec.lastElementChild, r);
    ui.issueFilter = prevFilter;
  });
  $$("details", panel).forEach((d) => (d.open = true));
  $$(".meter i, [data-meter]").forEach((el) => el.dataset.meter && (el.style.width = `${el.dataset.meter}%`));
});
window.addEventListener("afterprint", () => {
  if (currentView === "report") renderPanel();
});

window.addEventListener("hashchange", route);
updateHistoryCount();
route();
