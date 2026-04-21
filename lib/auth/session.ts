import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export interface PatronageSession {
  wallet?: string;
  role?: "holder" | "creator";
  creatorId?: string;
  issuedAt?: number;
}

export const sessionOptions: SessionOptions = {
  password: (() => {
    try {
      return env.SESSION_SECRET;
    } catch {
      return "patronage_dev_session_secret_rotate_me_in_production_000000000000";
    }
  })(),
  cookieName: "patronage.session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export async function getSession(): Promise<PatronageSession> {
  const c = await cookies();
  const session = await getIronSession<PatronageSession>(c, sessionOptions);
  return session;
}

export async function setSession(data: PatronageSession) {
  const c = await cookies();
  const session = await getIronSession<PatronageSession>(c, sessionOptions);
  Object.assign(session, data);
  await session.save();
}

export async function clearSession() {
  const c = await cookies();
  const session = await getIronSession<PatronageSession>(c, sessionOptions);
  session.destroy();
}
