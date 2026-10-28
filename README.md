# Ohviana Web

The Ohviana website: the trek marketplace (explore, trek and organizer pages, checkout, My
bookings) and the organizer and admin consoles. Next.js, talking to the Ohviana API in
**ohviana-apis**.

## Layout

```
src/          Next.js app (app router)
public/       Static files
packages/
  contracts/  Zod request/response schemas (copy of ohviana-apis, see below)
  shared/     Domain enums, money helpers, error codes (copy of ohviana-apis)
e2e/          Playwright browser tests (desktop + mobile), against the web app and the API
```

`packages/contracts` and `packages/shared` are **synced copies**; their source of truth is
ohviana-apis. Don't edit them here. After the API's contract changes:

```bash
npm run sync:contracts         # copies from ../ohviana-apis (or OHVIANA_APIS_DIR)
npm run sync:contracts:check   # exits 1 if the copy is out of date (CI runs this)
```

## Getting started

Run the API first (in ohviana-apis: `npm run dev:api`), then:

```bash
cp .env.example .env   # NEXT_PUBLIC_API_BASE_URL=http://localhost:4000 for a local API
npm install
npm run dev            # http://localhost:3000
```

## Scripts

| Command                  | What it does                                                        |
| ------------------------ | ------------------------------------------------------------------- |
| `npm run dev`            | development server on port 3000                                     |
| `npm run build`          | production build (`.next`)                                          |
| `npm run check`          | format check, lint, typecheck, unit tests                           |
| `npm test`               | unit tests (Vitest)                                                 |
| `npm run e2e`            | browser tests; needs ohviana-apis next to this repo and a seeded DB |
| `npm run sync:contracts` | refresh `packages/contracts` and `packages/shared` from the API     |

## Deploying

A plain Next.js app at the repository root, deployed as its own Vercel project (framework
Next.js, no root directory; `vercel.json` pins functions to Mumbai, `bom1`, next to the API and
database). The API is a separate Vercel project from ohviana-apis, at `https://api.ohviana.com`.

Set these in Vercel → Project → Settings → Environment Variables (Production):

| Variable                               | Production value                       |
| -------------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`             | `https://api.ohviana.com`              |
| `NEXT_PUBLIC_SITE_URL`                 | `https://ohviana.com`                  |
| `NEXT_PUBLIC_AUTH_MODE`                | `password`                             |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://<project-ref>.supabase.co`    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key (never the secret) |

They are built into the site, so redeploy after changing them. The site never holds database or
API secrets. Photos over 4 MB are shrunk in the browser before upload, because Vercel refuses
request bodies over 4.5 MB.
