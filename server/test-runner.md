# Test Runner Guide

## Running Tests

### All Tests
```bash
bun test --run
```

### Watch Mode (for development)
```bash
bun test:watch
```

### Specific Test Files
```bash
bun test src/utils/jwt.test.ts --run
bun test src/utils/password.test.ts --run
```

### Test Coverage
```bash
bun test --coverage
```

## Test Structure

Tests are located alongside their source files:
- `src/utils/jwt.test.ts` - JWT utility tests
- `src/utils/password.test.ts` - Password utility tests

## Test Environment

Tests use Bun's built-in test runner with:
- Environment variable mocking
- Async/await support
- Comprehensive assertion library
- Fast execution times

## Writing New Tests

Follow the existing patterns:
1. Use `describe` blocks for grouping related tests
2. Use `beforeEach`/`afterEach` for setup/cleanup
3. Mock environment variables when needed
4. Test both success and error cases
5. Include edge cases and boundary conditions