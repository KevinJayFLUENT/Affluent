export async function fetchTargets() {
  const res = await fetch("/api/targets");
  return res.json();
}

export async function enrichTarget(targetId) {
  const res = await fetch("/api/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId }),
  });
  return res.json();
}

export async function simulateReply(targetId) {
  const res = await fetch("/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId }),
  });
  return res.json();
}

export async function toggleTask(taskId, done) {
  const res = await fetch("/api/task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, done }),
  });
  return res.json();
}

export async function runDigest() {
  const res = await fetch("/api/digest", { method: "POST" });
  return res.json();
}

export async function generateBrief(targetId) {
  const res = await fetch("/api/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId }),
  });
  return res.json();
}

export async function executeAction(payload) {
  const res = await fetch("/api/act", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Insights: persistent Reports & Dashboards ──────────────────────────────
export async function listInsights() {
  const res = await fetch("/api/insights/dashboards");
  return res.json();
}

function selectionsToQuery(selections = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(selections)) {
    if (v != null && v !== "" && v !== "__all__") params.set(k, v);
  }
  const q = params.toString();
  return q ? `?${q}` : "";
}

export async function openDashboard(id, selections = {}) {
  const res = await fetch(`/api/insights/dashboards/${id}${selectionsToQuery(selections)}`);
  if (!res.ok) throw new Error("failed to open dashboard");
  return res.json();
}

export async function buildDashboard(prompt) {
  const res = await fetch("/api/insights/dashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "build failed");
  return res.json();
}

export async function refreshDashboard(id, selections = {}) {
  const res = await fetch(`/api/insights/dashboards/${id}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selections }),
  });
  return res.json();
}

export async function deleteDashboard(id) {
  const res = await fetch(`/api/insights/dashboards/${id}`, { method: "DELETE" });
  return res.json();
}

export async function fetchReport(payload) {
  const res = await fetch("/api/insights/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function saveReport(payload) {
  const res = await fetch("/api/insights/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function openSavedReport(id) {
  const res = await fetch(`/api/insights/reports/${id}`);
  return res.json();
}

export async function deleteReport(id) {
  const res = await fetch(`/api/insights/reports/${id}`, { method: "DELETE" });
  return res.json();
}

// POST-based SSE consumer: /api/analyze streams trace + analysis events.
export async function analyzeTarget(targetId, { onTrace, onAnalysis }, force = false) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId, force }),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let gotAnalysis = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop();
    for (const frame of frames) {
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (!data) continue;
      const parsed = JSON.parse(data);
      if (event === "trace") onTrace?.(parsed);
      if (event === "analysis") {
        gotAnalysis = true;
        onAnalysis?.(parsed);
      }
    }
  }
  // Stream cut off (e.g. serverless timeout) — let the caller fall back.
  if (!gotAnalysis) throw new Error("analysis stream ended early");
}
