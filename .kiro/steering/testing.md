# Testing Guidelines

This document outlines testing standards and practices for the Yellow project to ensure code quality, reliability, and maintainability.

## Core Testing Principles

### Test-Driven Development (TDD)
- Write tests for all new functionality before or alongside implementation
- Each task in spec implementation plans MUST include corresponding unit tests
- Tests should be written to verify the code works as expected before moving to the next task
- Run tests after implementation to ensure functionality works correctly

### Testing Hierarchy
1. **Unit Tests**: Test individual functions, classes, and components in isolation
2. **Integration Tests**: Test interactions between components and external systems
3. **End-to-End Tests**: Test complete user workflows and system behavior

## Testing Requirements for Specs

### Task Planning Requirements
- Every implementation task MUST have a corresponding unit test task
- Unit test tasks should immediately follow the implementation task they test
- Test tasks must include "Run tests to verify [functionality] works correctly" as a requirement
- **Test tasks MUST include "Run full test suite to catch any regressions" as a requirement**
- Integration tests should be included for API endpoints and cross-component interactions

### Test Task Format
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
  - _Requirements: [same requirement references]_
```

## Testing Standards by Technology

### Backend Testing (Bun + TypeScript)
- **Test Runner**: Use Bun's built-in test runner (`bun test`)
- **Test Files**: Place tests adjacent to source files with `.test.ts` suffix
- **Mocking**: Use Bun's built-in mocking capabilities
- **Database Testing**: Use test database or in-memory database for isolation

### Frontend Testing (React + TypeScript)
- **Test Runner**: Vitest (configured with Vite)
- **Testing Library**: React Testing Library for component tests
- **Test Files**: Place tests adjacent to components with `.test.tsx` suffix
- **Mocking**: Use Vitest's mocking capabilities for API calls

### Shared Code Testing
- **Location**: Tests in `shared/` directory should mirror source structure
- **Coverage**: All shared utilities and types should have comprehensive tests
- **Cross-platform**: Tests should work in both Node.js and browser environments

## Regression Testing Requirements

### Mandatory Full Test Suite Execution
After completing each task (implementation + unit tests), **MUST** run the complete test suite to catch regressions:

#### Test Suite Coverage
- **Backend tests**: Execute `bun test` in server/ directory
- **Frontend tests**: Execute `bun test` in client/ directory  
- **Shared code tests**: Execute tests for shared/ utilities and types
- **Integration tests**: Run all API and cross-component tests
- **End-to-end tests**: Execute complete workflow tests when applicable

#### Regression Detection Protocol
1. **Baseline establishment**: Ensure all tests pass before starting new task
2. **Post-implementation verification**: Run full suite after completing task
3. **Failure analysis**: Identify any tests that were passing but now fail
4. **Immediate resolution**: Fix all regressions before proceeding to next task
5. **Documentation**: Record regression causes and fixes for future reference

#### Regression Categories
- **Breaking changes**: New code breaks existing functionality
- **Interface changes**: Modified APIs break dependent code
- **Data model changes**: Database or type changes affect existing code
- **Dependency conflicts**: New dependencies conflict with existing ones
- **Configuration issues**: Environment or build changes affect tests

#### Resolution Requirements
- **Root cause identification**: Determine why regression occurred
- **Minimal fix approach**: Make smallest change necessary to resolve issue
- **Test updates**: Update tests only if legitimate changes require it
- **Verification**: Ensure fix doesn't introduce new regressions
- **Documentation**: Document what caused regression and how it was fixed

## Test Categories and Requirements

### Unit Tests (Required for all tasks)
- **Scope**: Test individual functions, classes, methods in isolation
- **Coverage**: Aim for 80%+ code coverage on new functionality
- **Scenarios**: Test happy path, edge cases, error conditions
- **Isolation**: Mock external dependencies and database calls
- **Performance**: Tests should run quickly (< 100ms per test)

### Integration Tests (Required for API endpoints)
- **Scope**: Test interactions between components, database operations, API endpoints
- **Database**: Use test database with proper setup/teardown
- **Authentication**: Test with various authentication states
- **Error Handling**: Test error scenarios and proper HTTP status codes
- **Data Validation**: Test input validation and sanitization

### End-to-End Tests (Required for complete workflows)
- **Scope**: Test complete user workflows from frontend to backend
- **Browser**: Use Playwright or similar for browser automation
- **API**: Test complete API workflows with real HTTP requests
- **Data**: Use realistic test data and scenarios

## Testing Best Practices

### Test Structure
- **Arrange**: Set up test data and mocks
- **Act**: Execute the functionality being tested
- **Assert**: Verify the expected outcomes
- **Cleanup**: Clean up resources and reset state

### Test Naming
- Use descriptive test names that explain the scenario
- Format: `should [expected behavior] when [condition]`
- Example: `should return user data when valid token is provided`

### Test Data
- Use factory functions or fixtures for consistent test data
- Avoid hardcoded values that might break over time
- Use realistic data that represents actual usage

### Mocking Guidelines
- Mock external dependencies (APIs, databases, file system)
- Don't mock the code you're testing
- Use type-safe mocks that match the real interfaces
- Reset mocks between tests to avoid interference

### Error Testing
- Test all error conditions and edge cases
- Verify proper error messages and status codes
- Test error handling doesn't leak sensitive information
- Ensure graceful degradation for non-critical failures

## Test Execution and CI/CD

### Local Development
- Run tests before committing code
- Use watch mode during development for immediate feedback
- Fix failing tests before implementing new features

### Continuous Integration
- All tests must pass before merging code
- Run tests on multiple environments (Node.js versions, browsers)
- Generate and track code coverage reports
- Fail builds on test failures or coverage drops

### Test Commands
```bash
# Backend tests
cd server && bun test

# Frontend tests  
cd client && bun test

# All tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## Security Testing

### Authentication Tests
- Test authentication middleware with various token states
- Test authorization for different user roles
- Test session management and token expiration
- Test password hashing and comparison

### Input Validation Tests
- Test all input validation schemas
- Test SQL injection prevention
- Test XSS prevention
- Test rate limiting and abuse prevention

### Data Protection Tests
- Test that sensitive data is never logged or exposed
- Test proper error messages that don't leak information
- Test data isolation between tenants/workspaces

## Performance Testing

### Unit Test Performance
- Individual tests should complete in < 100ms
- Test suites should complete in < 10 seconds
- Use profiling to identify slow tests

### Load Testing
- Test API endpoints under realistic load
- Test database performance with realistic data volumes
- Test concurrent user scenarios

## Documentation and Maintenance

### Test Documentation
- Document complex test scenarios and their purpose
- Maintain test data factories and utilities
- Document testing patterns and conventions

### Test Maintenance
- Update tests when requirements change
- Remove obsolete tests for removed functionality
- Refactor tests to maintain readability and performance
- Regular review of test coverage and effectiveness

## Spec Implementation Requirements

When creating implementation plans for specs:

1. **Every implementation task MUST be followed by a unit test task**
2. **Test tasks must include verification that tests pass**
3. **Test tasks MUST include full test suite execution to catch regressions**
4. **Integration tests must be included for API endpoints**
5. **End-to-end tests must be included for complete workflows**
6. **Test tasks must reference the same requirements as implementation tasks**
7. **All regressions must be fixed before considering a task complete**
8. **Test execution must be verified before moving to the next implementation step**

### Regression Prevention Workflow
For each task completion:
1. Run unit tests for new functionality
2. **Run complete test suite across all components**
3. Identify and analyze any test failures
4. Fix regressions immediately
5. Re-run full test suite to verify fixes
6. Document any issues and resolutions
7. Proceed to next task only after all tests pass

This ensures that all code is properly tested, verified to work correctly, and doesn't break existing functionality before moving to the next implementation step.