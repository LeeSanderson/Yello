# Spec Development Guidelines

This document provides guidelines for creating comprehensive feature specifications that include proper testing requirements.

## Spec Creation Requirements

### Task Planning Standards
When creating implementation plans for specs, follow these mandatory requirements:

1. **Every implementation task MUST be followed by a corresponding unit test task**
2. **Test tasks must include verification that tests pass**
3. **Integration tests must be included for API endpoints**
4. **End-to-end tests must be included for complete workflows**
5. **Test tasks must reference the same requirements as implementation tasks**

### Task Structure Template
Use this structure for all implementation tasks:

```markdown
- [ ] X.Y Implement [functionality]
  - Write [specific functionality] implementation
  - Handle [specific scenarios and edge cases]
  - _Requirements: [requirement references]_

- [ ] X.Z Write unit tests for [functionality]
  - Test [specific functionality] with valid inputs
  - Test [specific functionality] with invalid inputs
  - Test error handling scenarios
  - Run tests to verify [functionality] works correctly
  - **Run full test suite to catch any regressions**
  - Fix any failing tests before proceeding
  - _Requirements: [same requirement references as implementation]_
```

### Required Test Categories

#### Unit Tests (Mandatory for all tasks)
- Must test individual functions, classes, and methods in isolation
- Must include happy path, edge cases, and error conditions
- Must verify functionality works correctly before moving to next task
- Must be placed immediately after the implementation task they test

#### Integration Tests (Mandatory for API endpoints)
- Must test interactions between components
- Must test database operations with proper setup/teardown
- Must test authentication and authorization scenarios
- Must test error handling and proper HTTP status codes

#### End-to-End Tests (Mandatory for complete workflows)
- Must test complete user workflows from start to finish
- Must test realistic user scenarios
- Must verify the entire system works together correctly

### Test Verification Requirements
Every test task must include:
- Specific test scenarios to be covered
- "Run tests to verify [functionality] works correctly" as a requirement
- Reference to the same requirements as the implementation task
- Clear success criteria for test completion

### Quality Assurance
- Tests must be written using the project's testing framework (Bun for backend, Vitest for frontend)
- Tests must achieve reasonable code coverage (aim for 80%+)
- Tests must be maintainable and follow project conventions
- Tests must run quickly and reliably

## Implementation Workflow

### Task Execution Order
1. **Check for existing components** from previous tasks in the same feature
2. Implement functionality (reusing existing components where possible)
3. Write and run unit tests immediately
4. **Run full test suite** to catch any regressions
5. Verify all tests pass before proceeding
6. Move to next implementation task
7. Repeat cycle

### Component Reuse Requirements
Before implementing any new functionality, **MUST** check for and reuse existing components from previous tasks within the same feature:

#### Pre-Implementation Component Check
- **Scan previous tasks**: Review all completed tasks in the current feature specification
- **Identify reusable components**: Look for services, utilities, types, middleware, or UI components that can be reused
- **Check existing implementations**: Examine actual code files created in previous tasks
- **Avoid duplication**: Never recreate functionality that already exists in the current feature

#### Reuse Priority Order
1. **Exact match**: Use existing component as-is if it meets current requirements
2. **Extension**: Extend existing component with additional functionality rather than creating new one
3. **Composition**: Combine existing components to create new functionality
4. **New implementation**: Only create new components when no existing ones can be reused or extended

#### Component Discovery Process
When starting a new task:
1. Review the feature's task list to identify previously implemented components
2. Check the actual codebase for files created in previous tasks
3. Examine existing services, types, utilities, and middleware
4. Look for patterns that can be extended or composed
5. Document which existing components will be reused in the task implementation

#### Documentation Requirements
For each task that reuses components:
- List which existing components are being reused
- Explain how existing components are being extended or composed
- Document any modifications made to existing components
- Ensure tests cover both new functionality and integration with existing components

### Test-First Approach (Recommended)
- Consider writing tests before or alongside implementation
- Use tests to drive the design of the implementation
- Ensure tests fail initially, then pass after implementation
- Test integration with existing components from previous tasks

### Continuous Verification
- Run tests after each implementation step
- **Run full test suite after completing each task** to catch regressions
- Fix any failing tests before proceeding to next task
- Maintain test suite health throughout development
- Verify existing component integrations continue to work

### Regression Testing Requirements
**MANDATORY**: After completing each task (implementation + unit tests), run the complete test suite:

#### Full Test Suite Execution
- **Backend tests**: Run `bun test` in server directory to test all backend functionality
- **Frontend tests**: Run `bun test` in client directory to test all frontend functionality  
- **Integration tests**: Run all API and cross-component integration tests
- **Shared code tests**: Run tests for shared utilities and types

#### Regression Detection
- **Identify failures**: Any test that was previously passing but now fails indicates a regression
- **Root cause analysis**: Determine if failure is due to current task changes or existing issues
- **Fix immediately**: Address all regressions before proceeding to next task
- **Document fixes**: Record what caused the regression and how it was resolved

#### Test Suite Health
- **Monitor performance**: Ensure test execution time doesn't degrade significantly
- **Check coverage**: Verify code coverage doesn't decrease with new changes
- **Update tests**: Modify existing tests if legitimate changes require test updates
- **Add missing tests**: Identify and add tests for any uncovered edge cases discovered

## Documentation Requirements

### Test Documentation
- Document complex test scenarios and their purpose
- Explain any special test setup or teardown requirements
- Document test data factories and utilities used

### Requirement Traceability
- Ensure every requirement has corresponding tests
- Link test tasks to specific requirement numbers
- Verify test coverage addresses all acceptance criteria

## Component Reuse Patterns

### Service Layer Reuse
When implementing new services, check for existing services that can be:
- **Extended**: Add new methods to existing service classes
- **Composed**: Use existing services as dependencies in new services
- **Inherited**: Create specialized versions of existing base services

Example of service extension:
```markdown
- [ ] 3.1 Extend user service for password reset
  - Reuse existing UserService from task 2.1
  - Add generateResetToken() method to existing UserService
  - Add validateResetToken() method to existing UserService
  - Extend existing password hashing utilities from task 2.1
  - _Requirements: 2.1, 2.2_
  - _Reuses: UserService (task 2.1), password utilities (task 2.1)_
```

### Type Definition Reuse
Always check for existing types before creating new ones:
- **Extend interfaces**: Use existing interfaces as base for new ones
- **Compose types**: Combine existing types to create new composite types
- **Reuse validation schemas**: Extend existing Zod schemas rather than creating new ones

Example of type extension:
```markdown
- [ ] 4.1 Create login request types
  - Reuse existing User interface from task 1.1
  - Extend existing email validation schema from task 2.2
  - Create LoginRequest interface using existing email validation
  - _Requirements: 1.1, 1.2_
  - _Reuses: User interface (task 1.1), email validation (task 2.2)_
```

### Middleware Reuse
Check for existing middleware that can be:
- **Chained**: Combine existing middleware with new functionality
- **Extended**: Add new validation rules to existing middleware
- **Composed**: Use existing middleware as building blocks

Example of middleware composition:
```markdown
- [ ] 5.1 Create protected route middleware
  - Reuse existing JWT validation middleware from task 4.1
  - Reuse existing user context middleware from task 4.2
  - Compose existing middleware into single protected route handler
  - _Requirements: 3.1, 3.2_
  - _Reuses: JWT middleware (task 4.1), user context middleware (task 4.2)_
```

### Frontend Component Reuse
For React components, prioritize reusing existing components:
- **Extend props**: Add new props to existing components
- **Compose components**: Build complex components from existing simple ones
- **Reuse hooks**: Use existing custom hooks in new components

Example of component reuse:
```markdown
- [ ] 6.1 Create login form component
  - Reuse existing Input component from task 5.1
  - Reuse existing Button component from task 5.2
  - Reuse existing form validation hook from task 5.3
  - Compose existing components into LoginForm
  - _Requirements: 1.3, 1.4_
  - _Reuses: Input (task 5.1), Button (task 5.2), useFormValidation (task 5.3)_
```

## Common Patterns

### Service Layer Testing
```markdown
- [ ] 2.1 Implement user registration service
  - Write user registration logic with email uniqueness validation
  - Implement password hashing before database storage
  - Create user creation with proper error handling
  - _Requirements: 1.1, 1.2, 1.5, 4.1, 4.2_

- [ ] 2.2 Write unit tests for user registration service
  - Test registration with valid user data
  - Test email uniqueness validation
  - Test password hashing integration
  - Test error handling for invalid inputs
  - Run tests to verify registration service works correctly
  - _Requirements: 1.1, 1.2, 1.5, 4.1, 4.2_
```

### API Endpoint Testing
```markdown
- [ ] 5.1 Create user registration endpoint
  - Implement POST /api/auth/register route handler
  - Integrate input validation and registration service
  - Return appropriate success and error responses
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 5.2 Write unit tests for user registration endpoint
  - Test registration endpoint with valid user data
  - Test registration endpoint with invalid email formats
  - Test registration endpoint with weak passwords
  - Test registration endpoint with duplicate emails
  - Run tests to verify registration endpoint works correctly
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
```

### Middleware Testing
```markdown
- [ ] 4.1 Implement JWT authentication middleware
  - Write middleware to extract and validate JWT tokens from requests
  - Attach user context to authenticated requests
  - Handle token expiration and invalid token scenarios
  - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4_

- [ ] 4.2 Write unit tests for JWT authentication middleware
  - Test token extraction from Authorization header
  - Test user context attachment for valid tokens
  - Test error handling for expired and invalid tokens
  - Test middleware behavior with missing tokens
  - Run tests to verify authentication middleware works correctly
  - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4_
```

## Spec Review Checklist

Before finalizing any spec, verify:
- [ ] Every implementation task has a corresponding test task
- [ ] Test tasks include "Run tests to verify [functionality] works correctly"
- [ ] **Test tasks include "Run full test suite to catch any regressions"**
- [ ] Test tasks reference the same requirements as implementation tasks
- [ ] Integration tests are included for API endpoints
- [ ] End-to-end tests are included for complete workflows
- [ ] Test scenarios cover happy path, edge cases, and error conditions
- [ ] Test tasks are positioned immediately after implementation tasks
- [ ] **Component reuse is documented**: Tasks identify which existing components will be reused
- [ ] **Reuse rationale is clear**: Tasks explain why existing components are suitable for reuse
- [ ] **Extension strategy is defined**: Tasks specify how components will be extended or composed
- [ ] **No unnecessary duplication**: Verify no new components recreate existing functionality
- [ ] **Regression testing is mandatory**: Every task includes full test suite execution

### Component Reuse Verification
For each implementation task, ensure:
- [ ] Previous tasks in the feature have been reviewed for reusable components
- [ ] Existing services, types, utilities, and middleware are identified for potential reuse
- [ ] Task description includes "_Reuses: [component] (task X.Y)_" annotations
- [ ] Extension or composition strategy is clearly defined
- [ ] Tests cover integration with existing components

This ensures comprehensive testing coverage, reliable feature development, and efficient code reuse.