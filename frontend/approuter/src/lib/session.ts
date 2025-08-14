import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE = "aiimpact_session";

export async function getSessionId() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function getOrCreateSessionId() {
  const jar = await cookies();
  let val = jar.get(COOKIE)?.value;
  if (!val) {
    val = randomUUID();
    jar.set(COOKIE, val, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return val;
}
