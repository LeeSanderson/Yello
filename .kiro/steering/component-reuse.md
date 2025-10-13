# Component Reuse Guidelines

This document provides detailed guidelines for identifying, evaluating, and reusing components from previous tasks within the same feature specification.

## Core Principles

### Reuse Before Create
- **Always check first**: Before implementing any new functionality, scan previous tasks for reusable components
- **Prefer extension over creation**: Extend existing components rather than creating new ones when possible
- **Compose when appropriate**: Combine existing components to create new functionality
- **Document reuse decisions**: Clearly document which components are being reused and why

### Component Discovery Process

#### Step 1: Task History Review
Before starting any implementation task:
1. **Read all previous tasks** in the current feature specification
2. **Identify implemented components** from task descriptions and requirements
3. **Note component types**: Services, types, utilities, middleware, UI components, hooks
4. **Map component relationships**: Understand how existing components interact

#### Step 2: Codebase Inspection
After reviewing task history:
1. **Examine actual files** created in previous tasks
2. **Check component interfaces** and public APIs
3. **Review component documentation** and comments
4. **Understand component capabilities** and limitations
5. **Identify extension points** where components can be enhanced

#### Step 3: Reuse Evaluation
For each potential reusable component:
1. **Assess compatibility**: Does the component meet current requirements?
2. **Evaluate extensibility**: Can the component be extended for new requirements?
3. **Consider composition**: Can multiple components be combined effectively?
4. **Check dependencies**: Are component dependencies compatible with new requirements?

## Reuse Strategies

### Direct Reuse
Use existing component as-is when:
- Component exactly matches current requirements
- No modifications are needed
- Component interface is sufficient
- Dependencies are compatible

**Implementation approach:**
- Import and use existing component directly
- Add integration tests to verify compatibility
- Document the reuse decision in task description

### Component Extension
Extend existing component when:
- Core functionality matches but additional features are needed
- Component has clear extension points
- New functionality is logically related to existing functionality
- Extension maintains backward compatibility

**Implementation approaches:**
- Add new methods to existing classes
- Extend interfaces with additional properties
- Add new validation rules to existing schemas
- Enhance existing middleware with additional checks

### Component Composition
Compose multiple components when:
- Multiple existing components together provide needed functionality
- Components have compatible interfaces
- Composition creates logical higher-level abstraction
- Individual components remain reusable

**Implementation approaches:**
- Create facade that orchestrates multiple components
- Build higher-level services that use multiple lower-level services
- Compose UI components into more complex components
- Chain middleware components together

### Selective Reuse
Reuse parts of components when:
- Only specific functionality from component is needed
- Component is too large or complex for direct reuse
- Specific utilities or helpers can be extracted
- Type definitions can be reused independently

**Implementation approaches:**
- Extract and reuse utility functions
- Reuse type definitions and interfaces
- Reuse validation schemas
- Reuse configuration objects

## Component Categories

### Backend Components

#### Services
- **User management services**: Registration, authentication, profile management
- **Data access services**: Repository patterns, database operations
- **Business logic services**: Validation, processing, transformation
- **External integration services**: API clients, third-party integrations

#### Middleware
- **Authentication middleware**: JWT validation, session management
- **Authorization middleware**: Role-based access control, permissions
- **Validation middleware**: Input validation, schema checking
- **Error handling middleware**: Error formatting, logging

#### Types and Schemas
- **Entity interfaces**: User, Project, Task, Workspace definitions
- **Request/Response types**: API contract definitions
- **Validation schemas**: Zod schemas for input validation
- **Configuration types**: Environment, database, API configurations

#### Utilities
- **Cryptographic utilities**: Hashing, encryption, token generation
- **Validation utilities**: Email validation, password strength
- **Date/time utilities**: Formatting, timezone handling
- **Database utilities**: Query builders, transaction helpers

### Frontend Components

#### UI Components
- **Form components**: Input fields, buttons, form containers
- **Layout components**: Headers, sidebars, page layouts
- **Display components**: Cards, lists, tables, modals
- **Navigation components**: Menus, breadcrumbs, pagination

#### Hooks
- **Data fetching hooks**: API calls, caching, error handling
- **Form management hooks**: Validation, submission, state management
- **Authentication hooks**: Login state, user context, permissions
- **UI state hooks**: Modal state, loading state, error state

#### Services
- **API clients**: HTTP request handling, response processing
- **State management**: Store configuration, action creators
- **Routing services**: Navigation, route protection
- **Utility services**: Local storage, session management

#### Types
- **Component prop types**: Interface definitions for component props
- **State types**: Application state, component state definitions
- **API types**: Request/response interfaces matching backend
- **Event types**: User interaction, system event definitions

## Documentation Requirements

### Task Documentation
When reusing components, include in task description:
- **Reuse annotation**: `_Reuses: [ComponentName] (task X.Y)_`
- **Reuse strategy**: Direct reuse, extension, composition, or selective reuse
- **Modification description**: What changes are being made to existing components
- **Integration points**: How new functionality integrates with existing components

### Code Documentation
When modifying existing components:
- **Update component documentation**: Reflect new functionality and capabilities
- **Add inline comments**: Explain new code and integration points
- **Update type definitions**: Ensure types reflect new functionality
- **Maintain backward compatibility**: Document any breaking changes

### Test Documentation
When testing component reuse:
- **Test existing functionality**: Ensure existing features still work
- **Test new functionality**: Verify new features work correctly
- **Test integration**: Verify new and existing functionality work together
- **Run full test suite**: Execute complete test suite to catch any regressions
- **Document test strategy**: Explain how reuse affects testing approach
- **Document regression fixes**: Record any issues found and how they were resolved

## Quality Assurance

### Compatibility Verification
- **Interface compatibility**: Ensure existing interfaces remain functional
- **Dependency compatibility**: Verify all dependencies are compatible
- **Performance impact**: Assess performance implications of reuse
- **Security considerations**: Ensure reuse doesn't introduce security issues

### Testing Requirements
- **Regression testing**: Verify existing functionality isn't broken by running full test suite
- **Integration testing**: Test new functionality with existing components
- **Unit testing**: Test new functionality in isolation
- **End-to-end testing**: Verify complete workflows still function
- **Full suite execution**: Run complete test suite after each task to catch any regressions early

### Code Quality
- **Maintain consistency**: Follow existing code patterns and conventions
- **Avoid complexity**: Don't over-engineer component extensions
- **Preserve modularity**: Keep components focused and single-purpose
- **Document decisions**: Explain reuse and extension decisions

## Common Anti-Patterns

### Avoid These Mistakes
- **Blind reuse**: Using components without understanding their functionality
- **Over-extension**: Adding unrelated functionality to existing components
- **Tight coupling**: Creating dependencies that make components hard to maintain
- **Breaking changes**: Modifying existing components in ways that break other code
- **Duplicate functionality**: Creating new components that duplicate existing ones
- **Ignoring interfaces**: Bypassing component interfaces to access internal functionality

### Warning Signs
- **Complex modifications**: If extending a component requires major changes, consider creating new one
- **Multiple responsibilities**: If component starts handling unrelated concerns, split it
- **Tight coupling**: If components become too dependent on each other, refactor
- **Performance degradation**: If reuse significantly impacts performance, reconsider approach

## Best Practices

### Planning Phase
- **Map component landscape**: Understand all existing components before starting
- **Identify reuse opportunities**: Look for patterns and commonalities
- **Plan extension strategy**: Design how components will be extended or composed
- **Consider future reuse**: Design new components to be reusable by future tasks

### Implementation Phase
- **Start with existing**: Begin implementation by importing and using existing components
- **Extend incrementally**: Add new functionality step by step
- **Test continuously**: Verify functionality after each modification
- **Run full test suite**: Execute complete test suite after task completion to catch regressions
- **Fix regressions immediately**: Address any test failures before proceeding
- **Document changes**: Keep documentation up to date as you modify components

### Review Phase
- **Verify reuse goals**: Ensure reuse actually provides benefits
- **Check for duplication**: Confirm no functionality is duplicated
- **Validate integration**: Ensure all components work together correctly
- **Plan future reuse**: Consider how current work can be reused by future tasks

This systematic approach to component reuse ensures efficient development, reduces code duplication, and maintains high code quality throughout feature implementation.