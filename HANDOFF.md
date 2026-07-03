# Zehut — Project Handoff

This document is everything a new developer needs to take ownership of Zehut and run,
deploy, and maintain it. It assumes you are also using **Claude Code**.

---

## 1. What this project is

Zehut is a **content aggregator** built with **Next.js 16 (App Router)**, **React 19**,
**TypeScript 5**, **Tailwind CSS 4**, and **MongoDB** (via Mongoose).

It scrapes content from six platforms — **YouTube, Instagram, X/Twitter, Facebook,
Telegram, Spotify** — stores it in MongoDB, renders it in a public feed, and lets users
**download** the underlying media through a resilient multi-tier resolver chain.
An **admin panel** (`/admin`) manages content, background fetch jobs, and download analytics.

Hosting is **Vercel**. The download system depends on a **self-hosted cobalt instance on
Fly.io** and a **Cloudflare R2** bucket used as a media cache.

---

## 2. Tech stack & versions

| Thing | Version / Notes |
|---|---|
| Runtime | Node 24 (`node -v` = v24.11.1) |
| Package manager | **Bun** 1.3.x (`bun.lock` is the lockfile — do **not** use npm/yarn) |
| Framework | Next.js `16.1.1`, App Router, Server Components by default |
| UI | React `19.2.3`, Tailwind CSS v4, Phosphor icons |
| DB | MongoDB via `mongoose` `9.x` |
| Scraping | `cheerio`, `puppeteer`, `playwright`, `telegraf` (Telegram), `googleapis` (YouTube) |
| Storage | `@aws-sdk/client-s3` pointed at Cloudflare R2 |
| Lint | ESLint 9 (`bun run lint`) |

---

## 3. Repository layout

```
app/
  page.tsx              # public feed
  admin/                # admin UI: content, downloads (stats), jobs  (basic-auth)
  admin-login/
  api/
    content/            # CRUD + list for scraped content
    download/           # media download endpoint + /stream proxy
    admin/downloads/    # download analytics stats endpoint
    cron/               # scheduled scrape jobs (protected by CRON_SECRET)
    fetch/ share/ tags/ visitor/
lib/
  db/
    connection.ts       # mongoose singleton
    models/             # content, download-event, fetchJob, share, visitor
  scrapers/             # base-scraper + one per platform (youtube, instagram, x,
                        #   facebook, telegram, spotify)
  downloads/            # download resolver system (see §6)
    router.ts           # tiered resolver chain + circuit breaker + event logging
    detect-platform.ts
    circuit-breaker.ts
    r2-cache.ts         # Cloudflare R2 cache read/write
    resolvers/          # cobalt, yt-dlp, rapidapi, spotify-rss, types
  tagging/ hooks/ utils/
infra/
  cobalt/               # self-hosted cobalt-api Fly.io app (Dockerfile, fly.toml)
scripts/
  r2-lifecycle.mjs      # R2 bucket lifecycle maintenance
  cdp-driver.mjs        # Chrome DevTools Protocol driver for scraping
```

---

## 4. First-time setup

```bash
git clone https://github.com/eladcandroid/zehut.git
cd zehut
bun install

cp .env.local.example .env.local
# fill in .env.local — see §5. Get the real secret values from Elad.

bun run dev      # http://localhost:3000
```

Other commands:

```bash
bun run build    # production build
bun run start    # run production build
bun run lint     # ESLint
```

You need a MongoDB to point `MONGODB_URI` at — either a local `mongod` or the shared
Atlas cluster (ask Elad for the connection string).

---

## 5. Environment variables

All vars are documented in **`.env.local.example`**. Secrets are **not** in git — get the
real values from the previous owner. Summary of what each group is for:

- **Core** — `MONGODB_URI`, `NEXT_PUBLIC_SITE_URL`.
- **Admin/cron** — `ADMIN_USER`, `ADMIN_PASS` (basic-auth on `/admin`), `CRON_SECRET`
  (guards the cron scrape routes).
- **Platform APIs** — `YOUTUBE_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TWITTER_BEARER_TOKEN`,
  `FB_C_USER`/`FB_XS` (Facebook cookies), `CDP_URL` (remote Chrome for puppeteer).
- **Download resolvers** — `COBALT_URL`/`COBALT_API_KEY` (tier 1), `RAPIDAPI_*` (fallback),
  `YT_PROXY_URL`/`YT_PROXY_SECRET` (optional YouTube proxy).
- **Cloudflare R2** — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET` (download cache).

In production these are set in the **Vercel project settings**, not in a file.

---

## 6. How downloads work (the non-obvious part)

`lib/downloads/router.ts` runs a **tiered resolver chain per platform**:

```
youtube    → cobalt → yt-dlp → rapidapi
instagram  → cobalt → yt-dlp → rapidapi
facebook   → cobalt → yt-dlp → rapidapi
x          → cobalt → yt-dlp
spotify    → spotify-rss
telegram   → (none; handled elsewhere)
```

For each request it walks the chain in order and, per resolver:
- skips it if its **circuit breaker** is open (`circuit-breaker.ts`),
- skips it if a cached 30s **health check** says it's down,
- otherwise tries to resolve; on success returns; on failure records the failure and
  falls through to the next tier.

Every attempt (success or failure) is logged to the **`DownloadEvent`** Mongo collection
(`lib/db/models/download-event.ts`), which powers the `/admin/downloads` stats page.

**Tier 1 = your self-hosted cobalt** on Fly.io (`infra/cobalt/`). If downloads break,
that's the first place to look — see `infra/cobalt/README.md` for deploy + API-key rotation.
Resolved media is cached in **Cloudflare R2** (`r2-cache.ts`) to avoid re-resolving.

---

## 7. External services you must get access to

To fully own the project, get transferred/invited on each of these (ask Elad):

1. **GitHub** — `github.com/eladcandroid/zehut` (repo transfer or collaborator + admin).
2. **Vercel** — project `zehut` under `elad-cohens-projects` (hosting + all prod env vars).
3. **MongoDB Atlas** — the production database cluster.
4. **Cloudflare R2** — the download-cache bucket + API tokens.
5. **Fly.io** — the `zehut-cobalt` app (tier-1 download resolver).
6. **Google Cloud** — the project holding the YouTube Data API key.
7. **Telegram** — the bot (transfer via @BotFather).
8. **RapidAPI** — account for the fallback download providers (optional).
9. **Twitter/X API** — developer account/bearer token (optional, paid tier).

Until these are transferred, the app runs but individual platforms/features that depend on
a given service will fail.

---

## 8. Deployment

- **App**: pushing to `main` auto-deploys via Vercel. Set env vars in Vercel, not in files.
- **Cobalt (download backend)**: deployed separately to Fly.io.
  ```bash
  cd infra/cobalt
  export FLY_API_TOKEN=$(grep '^access_token:' ~/.fly/config.yml | sed 's/^access_token: //')
  fly deploy
  ```
  API-key rotation is documented in `infra/cobalt/README.md`. Note: the cobalt secret files
  (`.jwt-secret`, `keys.json`, `.key-uuid`) are git-ignored — get copies from Elad.

---

## 9. Branches

`main` is production. The remote also has several unmerged feature branches created by an
automated agent (`auto-claude/004-...` through `007-...`) covering admin bulk-select,
nav active state, admin API auth middleware, and a related-videos fix. Review and either
merge or delete them — they are not part of `main` yet.

---

## 10. Notes for working with Claude Code

- The repo has a **`CLAUDE.md`** at the root with project conventions — Claude Code reads it
  automatically. Keep it updated as the architecture changes.
- `.claude/`, `.frame/`, `.skillkit/` are **git-ignored** on purpose — they are local AI
  assistant state, not project files. You'll generate your own.
- There is no automated test suite yet. After changes, verify with `bun run build` and by
  driving the actual flow (scrape → feed → download) locally.

---

*Handoff prepared 2026-07-03.*
