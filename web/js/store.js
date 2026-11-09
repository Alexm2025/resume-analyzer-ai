// Local persistence. Everything stays in this browser; nothing is uploaded.
const KEYS = { reports: "ra.reports.v2", settings: "ra.settings.v1" };
const MAX_REPORTS = 30;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// In-memory fallback so the app still works when storage is blocked.
let memoryReports = null;

export const reports = {
  all() {
    return memoryReports || read(KEYS.reports, []);
  },
  get(id) {
    return this.all().find((r) => r.id === id) || null;
  },
  save(report) {
    const list = this.all().filter((r) => r.id !== report.id);
    list.unshift(report);
    let trimmed = list.slice(0, MAX_REPORTS);
    // If storage is full, drop the oldest until it fits.
    while (!write(KEYS.reports, trimmed) && trimmed.length > 1) trimmed = trimmed.slice(0, -1);
    if (!write(KEYS.reports, trimmed)) memoryReports = trimmed;
    return report;
  },
  update(id, patch) {
    const r = this.get(id);
    if (!r) return null;
    return this.save({ ...r, ...patch, updatedAt: Date.now() });
  },
  remove(id) {
    const list = this.all().filter((r) => r.id !== id);
    if (!write(KEYS.reports, list)) memoryReports = list;
  },
  clear() {
    memoryReports = null;
    try {
      localStorage.removeItem(KEYS.reports);
    } catch {
      /* ignore */
    }
  },
};

export const settings = {
  get() {
    return { theme: "system", model: "gpt-5-mini", openaiKey: "", ...read(KEYS.settings, {}) };
  },
  set(patch) {
    const next = { ...this.get(), ...patch };
    write(KEYS.settings, next);
    return next;
  },
};

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
