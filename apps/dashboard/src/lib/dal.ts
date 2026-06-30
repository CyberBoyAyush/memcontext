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

interface ProfileResponse {
  user: User | null;
}

async function getCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function getSession(): Promise<Session | null> {
  const cookieHeader = await getCookieHeader();

  if (!cookieHeader) {
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: {
        cookie: cookieHeader,
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

  const cookieHeader = await getCookieHeader();
  const profile = await fetch(`${API_URL}/api/user/profile`, {
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  })
    .then((res) => (res.ok ? (res.json() as Promise<ProfileResponse>) : null))
    .catch(() => null);

  if (profile?.user?.role !== "admin") {
    redirect("/dashboard?error=access_denied");
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: profile.user.role,
    },
  };
}
