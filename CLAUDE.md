# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application using the App Router, React 19, TypeScript 5, and Tailwind CSS 4.

## Development Commands

```bash
bun run dev      # Start development server on port 3000
bun run build    # Production build
bun run start    # Run production server
bun run lint     # Run ESLint
```

Note: This project uses Bun as the package manager (see `bun.lock`).

## Architecture

- **App Router**: All routes are in `/app` directory using file-based routing
- **Server Components**: Default for all components unless marked with `'use client'`
- **Styling**: Tailwind CSS v4 with CSS variables for theming (supports dark mode via system preference)
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google`
- **Path Aliases**: `@/*` maps to project root

## Key Files

- `app/layout.tsx` - Root layout with metadata, fonts, and global styles
- `app/page.tsx` - Home page component
- `app/globals.css` - Tailwind imports and CSS variable definitions
- `next.config.ts` - Next.js configuration (TypeScript-based)
- `eslint.config.mjs` - ESLint flat config with Next.js rules
