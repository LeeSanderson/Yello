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
- Three role levels: **admin** (full workspace control), **member** (create/edit), **guest** (read-only)
- Implement role-based middleware for all protected routes
- Admins can manage workspace settings and user permissions
- Members can create projects and tasks, assign work
- Guests have read-only access to assigned projects/tasks

### Core Entities & Relationships
```
Workspace (tenant boundary)
├── Users (with roles)
├── Projects
│   └── Tasks
│       ├── Assignees (Users)
│       ├── Due dates
│       └── Status (todo, in-progress, done, blocked)
└── Activity Feed
```

### Task Management Conventions
- Task statuses: `todo`, `in-progress`, `done`, `blocked`
- Always include created/updated timestamps
- Support multiple assignees per task
- Due dates are optional but should include timezone handling
- Task updates trigger activity feed entries

### Activity Feed Requirements
- Track project creation, task creation/updates, assignments
- Include actor (who), action (what), timestamp (when), and context (where)
- Scope activity to workspace level
- Implement real-time updates where possible

## Development Guidelines

### API Design Patterns
- Use RESTful conventions with workspace scoping
- Always validate workspace access before data operations
- Return consistent error formats with appropriate HTTP status codes
- Implement pagination for list endpoints (projects, tasks, activities)

### Data Validation
- Validate all user inputs at API boundaries
- Ensure workspace membership before allowing operations
- Validate role permissions for destructive actions
- Sanitize user-generated content (project names, task descriptions)

### Performance Considerations
- Index database queries by workspace_id + relevant fields
- Implement caching for frequently accessed workspace data
- Use database transactions for multi-table operations
- Consider read replicas for activity feed queries

### Security Requirements
- Authenticate all API requests
- Authorize based on workspace membership and role
- Use HTTPS for all communications
- Implement rate limiting per workspace
- Log security-relevant events (failed auth, permission denials)