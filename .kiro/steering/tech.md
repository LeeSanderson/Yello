# Technology Stack

This document outlines the technical foundation and conventions for the Yellow project.

## Build System & Tools
- **Package Manager**: Bun (primary), with workspace support for monorepo
- **Runtime**: Bun for backend, Node.js compatible
- **Build Tool**: Vite for frontend bundling and development
- **Concurrent Execution**: concurrently for running multiple services

## Tech Stack

### Backend (server/)
- **Language**: TypeScript
- **Runtime**: Bun
- **Framework**: Hono (lightweight web framework)
- **Database**: TBD (PostgreSQL recommended for multi-tenancy)
- **Testing**: Bun's built-in test runner

### Frontend (client/)
- **Language**: TypeScript
- **Framework**: React 18
- **Build Tool**: Vite
- **Bundler**: Vite (Rollup-based)
- **Styling**: CSS (with potential for CSS modules or styled-components)
- **State Management**: TBD (Zustand recommended for simplicity)

### Shared
- **Language**: TypeScript
- **Type Definitions**: Shared interfaces and types
- **Utilities**: Common helper functions

### Development Tools
- **TypeScript**: Strict type checking across all packages
- **Hot Reloading**: Vite HMR for frontend, Bun watch mode for backend
- **CORS**: Configured for local development
- **Path Mapping**: Absolute imports with @ alias

## Common Commands

```bash
# Install all dependencies
bun install

# Install workspace dependencies
cd server && bun install
cd client && bun install

# Development (runs both server and client)
bun run dev

# Individual services
bun run dev:server    # Backend only (port 3000)
bun run dev:client    # Frontend only (port 5173)

# Build
bun run build        # Build both
bun run build:server # Backend build
bun run build:client # Frontend build

# Backend specific
cd server
bun run dev          # Development with watch mode
bun run build        # Build to dist/
bun run start        # Run built version

# Frontend specific
cd client
bun run dev          # Vite dev server
bun run build        # Production build
bun run preview      # Preview production build
```

## Development Guidelines

### Code Organization
- Use feature-based folder structure where appropriate
- Implement barrel exports (index.ts) for clean imports
- Separate concerns: controllers → services → repositories
- Keep business logic in services, UI logic in components

### TypeScript Best Practices
- Enable strict mode in all tsconfig.json files
- Use shared types from `shared/` directory
- Implement proper error handling with typed errors
- Use absolute imports with path mapping (@/ aliases)

### API Development
- Use RESTful conventions with workspace scoping
- Implement proper CORS for cross-origin requests
- Validate inputs at API boundaries
- Return consistent error formats

### Frontend Development
- Use React functional components with hooks
- Implement proper loading and error states
- Use TypeScript interfaces for props and state
- Follow React best practices for performance

### Performance Considerations
- Leverage Bun's fast startup times
- Use Vite's HMR for instant feedback
- Implement proper code splitting for production
- Consider lazy loading for large components

### Security
- Validate all user inputs
- Implement proper authentication middleware
- Use HTTPS in production
- Sanitize user-generated content

## Environment Configuration
- Use `.env` files for environment-specific settings
- Keep sensitive data out of version control
- Configure different environments (development, staging, production)
- Use environment variables for API URLs and database connections

## Deployment
- **Backend**: TBD (Docker containers recommended)
- **Frontend**: TBD (Static hosting like Vercel, Netlify)
- **Database**: TBD (PostgreSQL on cloud provider)
- **CI/CD**: TBD (GitHub Actions recommended)