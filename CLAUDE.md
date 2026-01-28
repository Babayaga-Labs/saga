# Saga Development Guidelines

## Project Structure

```
/app                    # Next.js App Router pages and API routes
  /api                  # API route handlers
  /auth                 # Auth callback routes
  /(routes)             # Page routes
/components             # React components
  /auth                 # Auth-related components
  /providers            # Context providers (PostHog, Auth)
  /ui                   # Reusable UI components
/lib                    # Utilities and services
  /supabase             # Supabase client (client.ts, server.ts, auth.ts)
  analytics.ts          # PostHog wrapper with typed events
/public                 # Static assets
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database/Auth**: Supabase (PostgreSQL + Google OAuth)
- **Analytics**: PostHog
- **LLM**: AI SDK with Azure OpenAI / Anthropic
- **State**: Zustand for global state, React Context for scoped state

## Code Conventions

### TypeScript

- Use strict TypeScript - no `any` unless absolutely necessary
- Define interfaces for all API request/response shapes
- Export types from a central location when shared across files
- Use `type` for unions/intersections, `interface` for object shapes

```typescript
// Good
interface User {
  id: string;
  email: string;
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

// Avoid
const data: any = await fetch(...);
```

### React Components

- Use functional components with hooks
- Colocate component-specific types in the same file
- Use `'use client'` directive only when needed (hooks, browser APIs)
- Prefer composition over prop drilling

```typescript
// Component file structure
'use client';

import { useState } from 'react';

interface Props {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: Props) {
  // ...
}
```

### File Naming

- Components: PascalCase (`MyComponent.tsx`)
- Utilities/hooks: camelCase (`useAuth.ts`, `formatDate.ts`)
- API routes: `route.ts` in descriptive folders (`/api/game/start/route.ts`)
- Types: camelCase with descriptive names (`user-types.ts`)

## API Design

### Route Handlers

- Use Next.js App Router conventions (`route.ts`)
- Always validate request body with explicit type checks
- Return consistent error shapes
- Use appropriate HTTP status codes

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.requiredField) {
      return NextResponse.json(
        { error: 'Missing required field' },
        { status: 400 }
      );
    }

    // Process...
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Streaming Responses (LLM)

For LLM responses, use Server-Sent Events (SSE):

```typescript
import { StreamingTextResponse } from 'ai';

export async function POST(request: NextRequest) {
  const stream = await generateStream(prompt);
  return new StreamingTextResponse(stream);
}
```

## Supabase Patterns

### Client-Side (Browser)

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data, error } = await supabase.from('table').select('*');
```

### Server-Side (API Routes, Server Components)

```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### Auth Flow

1. User clicks sign in → `signInWithGoogle()` from `lib/supabase/auth.ts`
2. Redirects to Google → back to `/auth/callback`
3. Callback exchanges code for session
4. Middleware refreshes session on each request

## Environment Variables

Required in `.env.local`:

```bash
# LLM
LLM_PROVIDER=azure|openai|anthropic
LLM_API_KEY=xxx
LLM_MODEL=model-name

# Image Generation (optional)
IMAGE_PROVIDER=fal
IMAGE_API_KEY=xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Server-side only

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Site URL (for OAuth redirects in production)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

**Rules:**
- `NEXT_PUBLIC_*` variables are exposed to the browser - never put secrets here
- Server-only secrets (like `SUPABASE_SERVICE_ROLE_KEY`) should never have `NEXT_PUBLIC_` prefix

## Analytics

Use the typed analytics wrapper for consistency:

```typescript
import { analytics } from '@/lib/analytics';

// Track events
analytics.track('button_clicked', { buttonId: 'submit' });

// Identify users (on sign in)
analytics.identify(userId, { email, name });

// Reset on sign out
analytics.reset();
```

Add typed event helpers for important events:

```typescript
// lib/analytics.ts
export const analytics = {
  // ... base methods

  // Typed helpers
  featureUsed: (feature: string, metadata?: object) => {
    posthog.capture('feature_used', { feature, ...metadata });
  },
};
```

## Error Handling

- Always handle errors gracefully - never let them crash the app
- Log errors with context for debugging
- Show user-friendly error messages
- Use error boundaries for component-level failures

```typescript
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', { error, context: relevantData });
  // Show user-friendly message, not raw error
  setError('Something went wrong. Please try again.');
}
```

## Performance

- Use `loading.tsx` for route-level loading states
- Implement proper loading skeletons, not spinners
- Lazy load heavy components with `dynamic()`
- Optimize images with `next/image`
- Avoid unnecessary re-renders (memo, useMemo, useCallback when appropriate)

## Security

- Never trust client input - validate everything server-side
- Use Supabase RLS (Row Level Security) for data access control
- Sanitize user input before using in LLM prompts
- Rate limit expensive operations (LLM calls, auth attempts)
- Never expose service role keys to the client

## Testing Locally

```bash
# Start dev server
npm run dev

# Server runs at http://localhost:3000
```

## Common Pitfalls

1. **Forgetting `'use client'`** - Components using hooks or browser APIs need this directive
2. **Mixing client/server Supabase clients** - Use `client.ts` in components, `server.ts` in API routes
3. **Not awaiting `cookies()`** - In Next.js 14+, `cookies()` is async
4. **Hardcoding URLs** - Use `getSiteOrigin()` for OAuth redirects to work in all environments
5. **Not handling loading states** - Always show feedback during async operations
6. **Leaking secrets** - Double-check env var names before adding `NEXT_PUBLIC_`

## Git Workflow

- Create feature branches from `main`
- Use descriptive commit messages
- PR into `main` for review
- Squash merge to keep history clean

## Deployment

- **Vercel**: Connect repo, add environment variables, deploy
- **Supabase**: Configure Google OAuth redirect URLs for production domain
- **PostHog**: Works automatically with env vars
