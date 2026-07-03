# Zehut

A content aggregator built with **Next.js 16** (App Router), **React 19**, **TypeScript**,
**Tailwind CSS 4**, and **MongoDB**. It scrapes YouTube, Instagram, X, Facebook, Telegram,
and Spotify, renders a public feed, and lets users download the underlying media through a
multi-tier resolver chain. Includes an admin panel and download analytics.

## Quick start

```bash
bun install
cp .env.local.example .env.local   # then fill in values
bun run dev                        # http://localhost:3000
```

This project uses **Bun** (`bun.lock`) — not npm/yarn.

## Commands

```bash
bun run dev      # dev server
bun run build    # production build
bun run start    # run production build
bun run lint     # ESLint
```

## Documentation

- **[HANDOFF.md](./HANDOFF.md)** — full onboarding: architecture, env vars, external
  services, deployment, and how the download system works. **Read this first.**
- `CLAUDE.md` — conventions for working in this repo with Claude Code.
- `infra/cobalt/README.md` — the self-hosted cobalt download backend on Fly.io.
