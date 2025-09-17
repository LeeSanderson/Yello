---
inclusion: always
---

# Yellow - Product Requirements & Development Guidelines

Yellow is a multi-tenant project and task management platform that helps teams organize work, collaborate, and track progress across projects within shared workspaces.

## Core Product Requirements

### Multi-Tenancy & Security
- Implement strict data isolation between workspaces using tenant-scoped queries
- All database operations must include workspace/tenant context
- Never expose data across workspace boundaries
- Use workspace-scoped API endpoints (e.g., `/api/workspaces/{id}/projects`)

### User Management & Access Control
- Users are global entities that can belong to multiple workspaces
- Three role levels per workspace: **admin** (full workspace control), **member** (create/edit), **guest** (read-only)
- Memberships define the relationship between users and workspaces with specific roles
- Implement role-based middleware for all protected routes using membership context
- Admins can manage workspace settings and user permissions within their workspace
- Members can create projects and tasks, assign work within their workspace
- Guests have read-only access to assigned projects/tasks within their workspace

### Core Entities & Relationships
```
User (global entity)
├── Memberships
│   └── Workspace + Role
└── Personal Activity Feed (across all workspaces)

Workspace (tenant boundary)
├── Memberships (User + Role)
├── Projects
│   └── Tasks
│       ├── Assignees (Users via Memberships)
│       ├── Due dates
│       └── Status (todo, in-progress, done, blocked)
└── Workspace-scoped data
```

### Task Management Conventions
- Task statuses: `todo`, `in-progress`, `done`, `blocked`
- Always include created/updated timestamps
- Support multiple assignees per task
- Due dates are optional but should include timezone handling
- Task updates trigger activity feed entries

### Activity Feed Requirements
- Track project creation, task creation/updates, assignments across all user's workspaces
- Include actor (who), action (what), timestamp (when), workspace context (where), and target (what was affected)
- Activity feed is user-specific and aggregates events from all workspaces the user belongs to
- Each activity entry includes workspace information for proper context and filtering
- Implement real-time updates where possible
- Support filtering by workspace, project, or activity type

## Development Guidelines

### API Design Patterns
- Use RESTful conventions with workspace scoping
- Always validate workspace access before data operations
- Return consistent error formats with appropriate HTTP status codes
- Implement pagination for list endpoints (projects, tasks, activities)

### Data Validation
- Validate all user inputs at API boundaries
- Ensure user has valid membership in workspace before allowing operations
- Validate role permissions through membership context for destructive actions
- Sanitize user-generated content (project names, task descriptions)
- Verify user membership exists and is active before workspace operations

### Performance Considerations
- Index database queries by workspace_id + relevant fields for workspace-scoped data
- Index membership queries by user_id + workspace_id for access control
- Index activity feed queries by user_id + timestamp for efficient user feed retrieval
- Implement caching for frequently accessed workspace data and user memberships
- Use database transactions for multi-table operations (especially membership changes)
- Consider read replicas for activity feed queries across multiple workspaces

### Security Requirements
- Authenticate all API requests using global user identity
- Authorize based on user's membership in specific workspace and associated role
- Use HTTPS for all communications
- Implement rate limiting per user across all workspaces
- Log security-relevant events (failed auth, permission denials, membership changes)
- Ensure membership validation occurs before any workspace-scoped operations
- Protect against cross-workspace data leakage through membership verification