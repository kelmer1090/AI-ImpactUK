// frontend/approuter/src/app/utils/telemetry.ts
export function setTelemetryConsent(consented: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem("aiuk_telemetry", consented ? "true" : "false");
}

function sessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "aiuk_sid";
  const s = sessionStorage.getItem(key);
  if (s) return s;
  const v = Math.random().toString(36).slice(2, 10);
  sessionStorage.setItem(key, v);
  return v;
}

function sanitizeMeta(meta: Record<string, any>) {
  const allow = new Set([
    "projectId",
    "modelType",
    "processesPersonalData",
    "hasSpecialCategoryData",
    "format",
    "action",
  ]);
  const out: Record<string, any> = {};
  for (const k of Object.keys(meta || {})) {
    if (!allow.has(k)) continue;
    const v = (meta as any)[k];
    if (typeof v === "boolean" || v == null) out[k] = v;
    else if (k === "projectId") out[k] = Number.isFinite(Number(v)) ? Number(v) : 0;
    else out[k] = String(v).slice(0, 32).replace(/[^a-zA-Z0-9\-_.:]/g, "");
  }
  return out;
}

export function track(
  event: string,
  meta: Record<string, any> = {},
  requireConsent = true
) {
  try {
    if (typeof window === "undefined") return;
    const consented = localStorage.getItem("aiuk_telemetry") === "true";
    if (requireConsent && !consented) return;

    const payload = {
      event,
      ts: new Date().toISOString(),
      session: sessionId(),
      screen: { w: window.innerWidth || 0, h: window.innerHeight || 0 },
      meta: sanitizeMeta(meta),
      consented,
    };

    // fire-and-forget
    fetch("http://localhost:8000/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // OK for link clicks/navigation
    }).catch(() => {});
  } catch {
    /* no-op */
  }
}
