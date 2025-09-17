# 🟡 Yellow

Multi-tenant project and task management platform that helps teams organize work, collaborate, and track progress across projects within shared workspaces.

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) (latest version)
- [Podman](https://podman.io/) (for local database)
- [Node.js](https://nodejs.org/) (for cross-platform scripts)

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

3. Start development (automatically starts database):
```bash
bun run dev
```

The `bun run dev` command will automatically:
- Check if the database is running
- Start the database if needed (using Podman)
- Wait for the database to be ready
- Start both server and client development servers

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

## Database Management

**Development with auto-database:**
```bash
bun run dev         # Start everything (database + servers)
```

**Development servers only:**
```bash
bun run dev:only    # Start servers without database check
```

**Manual database management:**
```bash
bun run db:start    # Start PostgreSQL with Podman
bun run db:stop     # Stop the database container
bun run db:reset    # Remove container and data (fresh start)
bun run db:check    # Check if database is running
bun run db:studio   # Open Drizzle Studio (database GUI)
```

## API Endpoints

- `GET /api/hello` - Hello world endpoint
- `GET /api/health` - Health check (includes database status)
- `GET /api/users` - List all users
- `GET /api/workspaces` - List all workspaces
- `GET /api/projects` - List all projects
- `GET /api/tasks` - List all tasks

## Development

The project uses a monorepo structure with separate backend and frontend applications. Both share TypeScript types from the `shared/` directory.

### Tech Stack
- **Backend**: Bun, Hono, TypeScript
- **Frontend**: Vite, React, TypeScript
- **Shared**: TypeScript types and utilities