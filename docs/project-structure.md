# Project structure

Broadway Web is a Next.js App Router app that serves OTA pages inside a React Native WebView. Routes live in `src/app`. Screen UI and feature logic live in `src/features`.

## Layout

```
src/
├── app/                      # Routes only — no screen UI
│   ├── layout.tsx            # Root layout, RN bridge, mobile chrome
│   ├── globals.css
│   ├── page.tsx              # /
│   ├── home/page.tsx         # /home
│   ├── sale/page.tsx         # /sale
│   ├── search/page.tsx       # /search
│   ├── terms/page.tsx        # /terms
│   └── about/page.tsx        # /about
│
├── features/                 # One folder per screen
│   ├── home/index.tsx
│   ├── sale/index.tsx
│   └── ...
│
├── components/               # Shared UI (used by 2+ screens)
│   └── layout/
│
├── lib/                      # External systems
│   └── bridge/               # React Native WebView messages
│
└── types/
    └── bridge.ts             # Shared RN message contract
```

| Folder | Owns | Do not put here |
| --- | --- | --- |
| `app/` | URL, metadata, server data loading, `loading.tsx` / `error.tsx` | Banners, cards, grids, hooks |
| `features/<screen>/` | Screen UI, local components, local API, local types | Code a second screen needs |
| `components/` | Reusable UI | Screen-specific widgets |
| `lib/` | Bridge, HTTP client, analytics | Feature UI |
| `types/` | Contracts used across features (start with the RN bridge) | Sale-only or home-only models |

Import alias: `@/*` maps to `src/*`.

```ts
import HomeScreen from '@/features/home';
import { useRNBridge } from '@/lib/bridge';
import { MobileContainer } from '@/components/layout';
```

## How responsibility is split

A page is a thin server entry. The feature owns what the user sees.

```tsx
// src/app/sale/page.tsx
import SaleScreen from '@/features/sale';

export default function SalePage() {
  return <SaleScreen />;
}
```

```tsx
// src/features/sale/index.tsx
export default function SaleScreen() {
  return <div>Sale</div>;
}
```

When a screen grows, add files **inside that feature** only:

```
features/sale/
├── index.tsx              # public screen (imported by app/sale/page.tsx)
├── components/            # Sale-only UI
│   └── VoucherCard.tsx
├── api.ts                 # Sale-only requests
└── types.ts               # Sale-only types
```

Do not create `components/`, `api.ts`, or `types.ts` until the screen needs them.

## Scaling rules

1. New file goes in the screen that uses it.
2. Second screen needs the same thing → move it to `components/`, `lib/`, or `utils/`.
3. Third screen needs the same domain model (Product, Voucher) → then consider `src/entities/<name>/`.
4. Do not add empty layers. Create these only when a real file needs them:

   | Folder | Add when |
   | --- | --- |
   | `lib/http.ts` | You have a shared fetch/axios client |
   | `lib/analytics/` | Mixpanel / Firebase is wired |
   | `store/` | Two WebView screens share client state |
   | `services/` | The same API module is used by 3+ screens |
   | `utils/` | A helper is used in more than one place |

Cart and user mostly live in the native app. Prefer the RN bridge (`useRNBridge`) over a global store until two web routes truly share client state.

Avoid extra barrel `index.ts` files. Keep the feature public API (`features/sale/index.tsx`) and import shared UI from its folder (`@/components/layout`).

---

## Add a new route

Example: `/deals`.

### 1. Create the feature screen

`src/features/deals/index.tsx`

```tsx
export default function DealsScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
      <h1 className="text-2xl font-bold text-slate-100">Deals</h1>
      <p className="text-sm text-slate-400 mt-2">Route: /deals</p>
    </div>
  );
}
```

### 2. Create the route

`src/app/deals/page.tsx`

```tsx
import DealsScreen from '@/features/deals';

export default function DealsPage() {
  return <DealsScreen />;
}
```

The folder name under `app/` **is** the URL. `app/deals/page.tsx` → `/deals`.

### 3. Optional route files

| File | Purpose |
| --- | --- |
| `app/deals/loading.tsx` | Instant fallback while the page (or its data) loads |
| `app/deals/error.tsx` | Error boundary for this route |
| `app/deals/not-found.tsx` | Missing resource on this route |

```tsx
// src/app/deals/loading.tsx
export default function DealsLoading() {
  return <p className="p-6 text-slate-400">Loading deals…</p>;
}
```

The new route is wrapped automatically by `app/layout.tsx` (RN bridge + `MobileContainer`). You do not add it to a router config.

### Dynamic URL segments

`app/deals/[id]/page.tsx` → `/deals/abc`.

```tsx
import { notFound } from 'next/navigation';
import DealScreen from '@/features/deals';
import { getDeal } from '@/features/deals/api';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DealPage({ params }: PageProps) {
  const { id } = await params;
  const deal = await getDeal(id);

  if (!deal) notFound();

  return <DealScreen deal={deal} />;
}
```

In Next.js 16, `params` and `searchParams` are **promises**. Always `await` them.

---

## Add a route that loads data from an API

Prefer fetching in the **page** (Server Component) and passing data into the feature. The page owns the request. The feature owns rendering.

### 1. Feature-local types and API

`src/features/deals/types.ts`

```ts
export type Deal = {
  id: string;
  title: string;
  discount: string;
};
```

`src/features/deals/api.ts`

```ts
import type { Deal } from './types';

const API_BASE_URL = process.env.API_BASE_URL;

export async function getDeals(): Promise<Deal[]> {
  const response = await fetch(`${API_BASE_URL}/deals`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to load deals (${response.status})`);
  }

  return response.json();
}
```

In Next.js 16, `fetch` is **not cached by default**. That is usually what you want for sale/home payloads. To cache later, use the `use cache` directive — do not add it until you need it.

When a second feature needs the same HTTP helper (base URL, auth header, error mapping), extract `src/lib/http.ts`. Until then, keep `fetch` in the feature `api.ts`.

### 2. Fetch in the page, render in the feature

`src/app/deals/page.tsx`

```tsx
import DealsScreen from '@/features/deals';
import { getDeals } from '@/features/deals/api';

export default async function DealsPage() {
  const deals = await getDeals();
  return <DealsScreen deals={deals} />;
}
```

`src/features/deals/index.tsx`

```tsx
import type { Deal } from './types';

type DealsScreenProps = {
  deals: Deal[];
};

export default function DealsScreen({ deals }: DealsScreenProps) {
  if (deals.length === 0) {
    return <p className="p-6 text-slate-400">No deals right now.</p>;
  }

  return (
    <ul className="flex flex-col gap-3 p-6">
      {deals.map((deal) => (
        <li key={deal.id} className="rounded-xl bg-[var(--bg-card)] p-4">
          <p className="font-semibold text-slate-100">{deal.title}</p>
          <p className="text-sm text-slate-400">{deal.discount}</p>
        </li>
      ))}
    </ul>
  );
}
```

Add `src/app/deals/loading.tsx` so the WebView shows a fallback instead of a blank screen while `getDeals()` runs.

### 3. When the API needs the RN user token

The React Native host sends user data through the bridge (`SET_USER_DATA`). That is **client-only**, so the page cannot read the token on the server.

Fetch inside the feature as a Client Component:

`src/features/deals/index.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRNBridge } from '@/lib/bridge';
import { getDeals } from './api';
import type { Deal } from './types';

export default function DealsScreen() {
  const { user } = useRNBridge();
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user.token) return;

    let cancelled = false;

    getDeals(user.token)
      .then((data) => {
        if (!cancelled) setDeals(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load deals');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user.token]);

  if (!user.token) return <p className="p-6 text-slate-400">Waiting for session…</p>;
  if (error) return <p className="p-6 text-red-400">{error}</p>;
  if (!deals) return <p className="p-6 text-slate-400">Loading deals…</p>;

  return (
    <ul className="flex flex-col gap-3 p-6">
      {deals.map((deal) => (
        <li key={deal.id}>{deal.title}</li>
      ))}
    </ul>
  );
}
```

Pass the token from the feature into `api.ts`. Do not put the token in `types/bridge.ts` beyond the existing `UserContextData` shape.

Use this client path only when the server cannot see the credential. If the API is public or the server has its own auth, stay on the async page + `getDeals()` pattern.

### 4. Checklist for a data route

- [ ] `src/features/<name>/index.tsx` — screen
- [ ] `src/features/<name>/api.ts` — requests for this screen only
- [ ] `src/features/<name>/types.ts` — response shapes for this screen only
- [ ] `src/app/<name>/page.tsx` — fetch (server) or render the client screen
- [ ] `src/app/<name>/loading.tsx` — fallback while data loads
- [ ] `src/app/<name>/error.tsx` — failed request UI (optional, add when you need it)

Do not add `services/deals.service.ts` or `types/models.ts` for a single screen.

---

## Existing routes

| URL | App file | Feature |
| --- | --- | --- |
| `/` | `app/page.tsx` | `features/home` |
| `/home` | `app/home/page.tsx` | `features/home` |
| `/sale` | `app/sale/page.tsx` | `features/sale` |
| `/search` | `app/search/page.tsx` | `features/search` |
| `/terms` | `app/terms/page.tsx` | `features/terms` |
| `/about` | `app/about/page.tsx` | `features/about` |
