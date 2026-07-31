// Persistent storage layer.
//
// Route logic never touches storage details: it works against the in-memory
// working set in state.js, and every mutation calls persist(). This module
// decides where that data actually lives, selected by environment:
//
//   1. Upstash Redis (Vercel / any deploy) — set UPSTASH_REDIS_REST_URL and
//      UPSTASH_REDIS_REST_TOKEN (or the KV_REST_API_* aliases Vercel KV
//      injects). Plain REST via fetch — no extra dependency.
//   2. JSON file (local dev, default)     — server/data/db.json, inspectable
//      and survives restarts.
//   3. Memory (fallback)                  — file system read-only and no KV
//      configured (e.g. bare Vercel): data lives for the warm instance and
//      re-seeds on cold start, exactly like the pre-Phase-3 behavior.
//
// The write path is debounced write-behind: mutations mark the DB dirty and a
// short timer flushes the full snapshot. The dataset is a demo-scale single
// document, so snapshot writes are simpler and safer than per-key diffs.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_PATH = path.join(__dirname, "data", "db.json");
const REDIS_KEY = "tcan:db";
const FLUSH_MS = 400;

// ── Backends ────────────────────────────────────────────────────────────────

const fileBackend = {
  name: "file",
  async read() {
    if (!fs.existsSync(FILE_PATH)) return null;
    return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
  },
  async write(db) {
    fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
    const tmp = FILE_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, FILE_PATH); // atomic-ish swap so a crash never truncates
  },
};

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

const upstashBackend = {
  name: "upstash",
  async read() {
    const { url, token } = redisEnv();
    const res = await fetch(`${url}/get/${REDIS_KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`upstash GET ${res.status}`);
    const body = await res.json();
    return body.result ? JSON.parse(body.result) : null;
  },
  async write(db) {
    const { url, token } = redisEnv();
    const res = await fetch(`${url}/set/${REDIS_KEY}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(JSON.stringify(db)), // SET value is a JSON string
    });
    if (!res.ok) throw new Error(`upstash SET ${res.status}`);
  },
};

const memoryBackend = {
  name: "memory",
  async read() {
    return null;
  },
  async write() {},
};

function pickBackend() {
  if (redisEnv()) return upstashBackend;
  return fileBackend; // degrades to memory automatically if writes fail
}

let backend = pickBackend();
export const storageMode = () => backend.name;

// ── Load / persist ──────────────────────────────────────────────────────────

// The empty database shape. state.js seeds `accounts` on first run.
export function emptyDb() {
  return {
    version: 1,
    seedVersion: 0, // bumped by state.js when the seed set is (re)written
    accounts: [],
    log: [],
    tasks: [],
    digest: null,
    dashboards: [], // user-created insight dashboards (definitions only)
    reports: [], // saved drill-down reports (definitions only)
    refreshedAt: {}, // insights: id -> last-refresh ISO timestamp
  };
}

export async function loadDb() {
  try {
    const db = await backend.read();
    if (db && typeof db === "object") return { ...emptyDb(), ...db };
  } catch (err) {
    console.error(`store: ${backend.name} read failed (${err.message}) — starting from seed`);
  }
  return emptyDb();
}

let flushTimer = null;
let pendingDb = null;
let warnedReadOnly = false;

async function flush() {
  flushTimer = null;
  const db = pendingDb;
  pendingDb = null;
  if (!db) return;
  try {
    await backend.write(db);
  } catch (err) {
    if (backend === fileBackend) {
      // Read-only filesystem (serverless) — fall back to memory-only quietly.
      if (!warnedReadOnly) {
        warnedReadOnly = true;
        console.error(`store: file write failed (${err.message}) — running memory-only; configure Upstash for durable deploys`);
      }
      backend = memoryBackend;
    } else {
      console.error(`store: ${backend.name} write failed: ${err.message}`);
    }
  }
}

// Debounced write-behind. Callers pass the live DB object; we snapshot it at
// flush time (the object is mutated in place by state.js, so the latest state
// always wins — exactly what we want for a single-document store).
export function persistDb(db) {
  pendingDb = db;
  if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS);
  return Promise.resolve();
}

// Immediate flush — used by routes that want durability before responding
// (e.g. account creation) and by tests.
export async function persistDbNow(db) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  pendingDb = db;
  await flush();
}
