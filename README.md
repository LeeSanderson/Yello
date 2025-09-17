# 🟡 Yellow

Multi-tenant project and task management platform that helps teams organize work, collaborate, and track progress across projects within shared workspaces.

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) (latest version)

### Installation

1. Install dependencies for all workspaces:
```bash
bun install
```

2. Install dependencies for each workspace:
```bash
cd server && bun install
cd ../client && bun install
cd ..
```

3. Start development servers:
```bash
bun run dev
```

This will start:
- Backend API server on http://localhost:3000
- Frontend client on http://localhost:5173

### Individual Services

**Backend only:**
```bash
bun run dev:server
```

**Frontend only:**
```bash
bun run dev:client
```

## Project Structure

- `server/` - Backend API (Bun + Hono + TypeScript)
- `client/` - Frontend (Vite + React + TypeScript)
- `shared/` - Shared types and utilities
- `.kiro/` - Kiro configuration and steering rules

## API Endpoints

- `GET /api/hello` - Hello world endpoint
- `GET /api/health` - Health check

## Development

The project uses a monorepo structure with separate backend and frontend applications. Both share TypeScript types from the `shared/` directory.

### Tech Stack
- **Backend**: Bun, Hono, TypeScript
- **Frontend**: Vite, React, TypeScript
- **Shared**: TypeScript types and utilities