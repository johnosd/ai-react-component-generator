# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server (Turbopack) at http://localhost:3000
npm run build        # Production build
npm run start        # Start production server

# Database
npm run setup        # Install deps + generate Prisma client + run migrations
npm run db:reset     # Reset SQLite database (destructive)
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>  # Create and apply a new migration

# Testing
npm run test         # Run all tests
npx vitest run src/path/to/__tests__/file.test.ts  # Run a single test file
```

## Environment Variables

Required in `.env`:
```
ANTHROPIC_API_KEY=   # If omitted, falls back to MockLanguageModel
JWT_SECRET=          # Secret for JWT signing
```

## Architecture Overview

**UIGen** is an AI-powered React component generator. Users describe components in natural language; Claude AI generates them with live preview.

### Request Flow

1. User sends message → `ChatContext` (`src/lib/contexts/chat-context.tsx`) calls `useChat` (Vercel AI SDK)
2. `POST /api/chat` receives messages + serialized `VirtualFileSystem` state
3. Server streams response from `claude-haiku-4-5` (or `MockLanguageModel` if no API key)
4. AI emits **tool calls** (`str_replace_editor`, `file_manager`) to create/edit files
5. Client processes tool calls → `FileSystemContext` updates the in-memory `VirtualFileSystem`
6. `PreviewFrame` (iframe) re-renders: Babel transforms JSX, import map resolves `@/` aliases
7. On stream finish: saves messages + file system to Prisma (authenticated users only)

### Key Abstractions

**`VirtualFileSystem`** (`src/lib/file-system.ts`)
In-memory file tree (Map-based). Supports create, read, update, delete, rename, and text editor operations (`str_replace`, `insert`). Serializes to JSON for persistence and for sending to the AI in each request.

**`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`)
React context wrapping `VirtualFileSystem`. Handles incoming tool call results from the AI, triggers preview refresh, and auto-selects the active file (`App.jsx` preferred).

**`ChatContext`** (`src/lib/contexts/chat-context.tsx`)
Wraps `useChat` from the Vercel AI SDK. Serializes the current file system into each request body. Delegates tool call execution to `FileSystemContext`.

**JSX Transformer** (`src/lib/transform/jsx-transformer.ts`)
Uses Babel standalone to transform JSX → JS on the client. Builds an ES module import map so the iframe can resolve `@/` local imports. Generates a complete HTML document injected into `PreviewFrame`.

**AI Tools** (`src/lib/tools/`)
- `str_replace_editor`: `create`, `str_replace`, `view` commands for file editing
- `file_manager`: `rename`, `delete` commands

### Authentication

JWT cookies (7-day expiry) via `jose`. Passwords hashed with `bcrypt`. Server actions in `src/actions/` handle sign-up/in/out. `src/middleware.ts` protects `/api/projects` and `/api/filesystem` routes.

Anonymous users: work stored in `localStorage` via `src/lib/anon-work-tracker.ts` and migrated to a new project on sign-in.

### Database

SQLite via Prisma. Schema in `prisma/schema.prisma`. Prisma client generated to `src/generated/prisma/`.

- `User`: `id`, `email`, `password` (hashed), relations to `Project[]`
- `Project`: stores `messages` (JSON string) and `data` (serialized `VirtualFileSystem` JSON)

### Route Structure

| Route | Purpose |
|---|---|
| `/` | Root: anonymous workspace or redirects authenticated users to their project |
| `/[projectId]` | Project workspace: chat panel + code editor + live preview |
| `/api/chat` | Streaming AI endpoint (POST) |

### Path Alias

`@/*` maps to `./src/*` throughout the codebase.

## Code Style

Use comments sparingly. Only comment complex code.

# the database schema is defined int the @prisma/schema.prisma file. Reference it anytime you need to undertand the structure of data stored in the database
