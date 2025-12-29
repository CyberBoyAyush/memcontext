# AGENTS.md - Dashboard (apps/dashboard)

## Structure

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx      # Login form
│   │   │   └── signup/page.tsx     # Signup form
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   │   ├── page.tsx            # Dashboard overview
│   │   │   ├── memories/page.tsx   # Memories list
│   │   │   ├── api-keys/page.tsx   # API keys management
│   │   │   └── settings/page.tsx   # User settings
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Redirect to /dashboard
│   │   └── globals.css             # Design system CSS
│   ├── components/
│   │   ├── ui/                     # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── label.tsx
│   │   └── sidebar.tsx             # Dashboard sidebar
│   ├── lib/
│   │   ├── queries/                # TanStack Query definitions
│   │   │   ├── memories.ts
│   │   │   └── api-keys.ts
│   │   ├── api.ts                  # API client
│   │   ├── auth-client.ts          # Better Auth client
│   │   ├── dal.ts                  # Data Access Layer
│   │   └── utils.ts                # Utility functions
│   ├── providers/
│   │   └── query-provider.tsx      # TanStack Query provider
│   └── middleware.ts               # Route protection
├── components.json                 # shadcn/ui config
├── next.config.ts
└── package.json
```

## Commands

```bash
pnpm dev                            # Start dev server (port 3020)
pnpm build                          # Build for production
pnpm lint                           # Run ESLint
```

## Architecture

### Data Fetching Pattern

All data fetching uses TanStack Query:

```typescript
// Define query options
export const memoriesQueryOptions = queryOptions({
  queryKey: ["memories"],
  queryFn: () => api.get<MemoriesResponse>("/api/memories"),
});

// Use in components
const { data, isLoading } = useQuery(memoriesQueryOptions);
```

### Mutations

```typescript
export function useDeleteMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/memories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });
}
```

### API Client

```typescript
// lib/api.ts - handles credentials automatically
export const api = {
  get: <T>(path: string) =>
    fetch(API_URL + path, { credentials: "include" }).then((r) =>
      r.json(),
    ) as Promise<T>,
  post: <T>(path: string, data: unknown) =>
    fetch(API_URL + path, {
      method: "POST",
      body: JSON.stringify(data),
      credentials: "include",
    }).then((r) => r.json()) as Promise<T>,
  // ...
};
```

### Authentication

Uses Better Auth client:

```typescript
import { signIn, signOut, signUp, useSession } from "@/lib/auth-client";

// In components
const { data: session } = useSession();

// Login
await signIn.email({ email, password });

// Signup
await signUp.email({ email, password, name });

// Logout
await signOut();
```

## Route Protection

Middleware protects dashboard routes:

```typescript
// middleware.ts
const protectedRoutes = ["/dashboard", "/memories", "/api-keys", "/settings"];
const authRoutes = ["/login", "/signup"];

// Redirects unauthenticated users to /login
// Redirects authenticated users away from auth pages
```

## UI Components

All components use CSS variables from globals.css:

- `--background`, `--foreground`
- `--surface`, `--surface-elevated`
- `--border`, `--ring`
- `--foreground-muted`, `--foreground-subtle`

### Creating New Components

```typescript
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  children: React.ReactNode;
}

export function MyComponent({ className, children }: Props) {
  return (
    <div className={cn("base-styles", className)}>
      {children}
    </div>
  );
}
```

## Page Patterns

### Dashboard Page

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["key"],
    queryFn: () => api.get<Response>("/api/endpoint"),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Title</h1>
        <p className="text-foreground-muted mt-1">Description</p>
      </div>
      {/* Content */}
    </div>
  );
}
```

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3020
```

## Design System

- Forced dark theme (no light mode toggle)
- Uses custom CSS variables matching website aesthetic
- Animations: `animate-fade-in`, `animate-slide-up`
- Rounded corners: `rounded-xl` for cards, `rounded-lg` for inputs
- Mobile-first with responsive breakpoints

## Common Imports

```typescript
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Utils
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// TanStack Query
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Icons (lucide-react)
import { Loader2, Plus, Trash2 } from "lucide-react";
```
