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

// POST-based SSE consumer: /api/analyze streams trace + analysis events.
export async function analyzeTarget(targetId, { onTrace, onAnalysis }) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId }),
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
