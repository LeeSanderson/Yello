# Project Structure

This document defines the organization and folder structure conventions for the Yellow project using Bun/TypeScript with separate backend and frontend applications.

## Root Directory
```
/
├── .kiro/              # Kiro configuration and steering rules
│   └── steering/       # AI assistant guidance documents
├── server/             # Backend API (Bun + TypeScript)
│   ├── src/
│   │   ├── controllers/    # API route handlers
│   │   ├── middleware/     # Authentication, validation, etc.
│   │   ├── models/         # Data models and types
│   │   ├── services/       # Business logic layer
│   │   ├── repositories/   # Data access layer
│   │   ├── utils/          # Shared utilities
│   │   ├── types/          # TypeScript type definitions
│   │   └── index.ts        # Server entry point
│   ├── tests/              # Backend tests
│   ├── package.json        # Backend dependencies
│   └── tsconfig.json       # Backend TypeScript config
├── client/             # Frontend (Vite + React + TypeScript)
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page-level components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client and external services
│   │   ├── stores/         # State management (Zustand/Redux)
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Frontend utilities
│   │   ├── styles/         # CSS/SCSS files
│   │   ├── App.tsx         # Main App component
│   │   └── main.tsx        # React entry point
│   ├── public/             # Static assets
│   ├── tests/              # Frontend tests
│   ├── package.json        # Frontend dependencies
│   ├── tsconfig.json       # Frontend TypeScript config
│   └── vite.config.ts      # Vite configuration
├── shared/             # Shared types and utilities
│   ├── types/              # Common TypeScript types
│   └── utils/              # Shared utility functions
├── docs/               # Documentation
├── scripts/            # Build and deployment scripts
├── package.json        # Root workspace configuration
└── README.md           # Project overview and setup instructions
```

## Backend Structure (server/)
- **controllers/**: Handle HTTP requests, validate input, call services
- **middleware/**: Authentication, authorization, request validation, error handling
- **models/**: Database models, entity definitions, validation schemas
- **services/**: Business logic, orchestrate repository calls
- **repositories/**: Data access layer, database queries, external API calls
- **utils/**: Helper functions, constants, configuration
- **types/**: Backend-specific TypeScript interfaces and types

## Frontend Structure (client/)
- **components/**: Reusable UI components organized by feature or type
- **pages/**: Top-level route components
- **hooks/**: Custom React hooks for state and side effects
- **services/**: API client, HTTP requests, external integrations
- **stores/**: Global state management (Zustand recommended for simplicity)
- **types/**: Frontend-specific TypeScript interfaces
- **utils/**: Frontend helper functions, formatters, validators
- **styles/**: Global styles, theme configuration, CSS modules

## File Naming Conventions
- **TypeScript files**: Use PascalCase for components (`UserProfile.tsx`), camelCase for utilities (`apiClient.ts`)
- **Directories**: Use lowercase with hyphens (`user-management/`)
- **Test files**: Match source file with `.test.ts` or `.spec.ts` suffix
- **Type files**: Use `.types.ts` suffix for type-only files
- **Configuration**: Use descriptive names (`vite.config.ts`, `tsconfig.json`)

## Code Organization Best Practices
- **Barrel exports**: Use `index.ts` files to re-export from directories
- **Absolute imports**: Configure path mapping in `tsconfig.json` for cleaner imports
- **Feature-based grouping**: Group related files by feature when appropriate
- **Separation of concerns**: Keep business logic in services, UI logic in components
- **Type safety**: Share types between frontend and backend via `shared/` directory
- **Environment configuration**: Use `.env` files for environment-specific settings

## Bun-Specific Considerations
- Use `bun install` for dependency management
- Leverage Bun's built-in TypeScript support (no need for ts-node)
- Use `bun run` for script execution
- Take advantage of Bun's fast startup times for development
- Use Bun's built-in test runner for backend tests

## Development Workflow
- **Monorepo setup**: Use workspace configuration in root `package.json`
- **Concurrent development**: Run both server and client in development mode
- **Shared types**: Import common types from `shared/` directory
- **API contracts**: Define API interfaces in shared types for type safety
- **Hot reloading**: Leverage Vite's HMR for frontend, Bun's watch mode for backend