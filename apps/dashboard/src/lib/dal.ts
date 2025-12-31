import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
}

interface Session {
  user: User;
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("better-auth.session_token");

  if (!sessionCookie) {
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: {
        cookie: `better-auth.session_token=${sessionCookie.value}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data as Session;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/legend");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard?error=access_denied");
  }

  return session;
}
