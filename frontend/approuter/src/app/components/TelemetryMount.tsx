// frontend/approuter/src/app/components/TelemetryMount.tsx
"use client";
import { useEffect } from "react";
import { track } from "@/app/utils/telemetry";

export default function TelemetryMount({
  event,
  meta,
}: {
  event: string;
  meta?: Record<string, any>;
}) {
  useEffect(() => {
    track(event, meta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
