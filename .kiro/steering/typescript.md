# TypeScript Development Guidelines

This document provides detailed TypeScript coding standards and best practices for the Yellow project.

## Core Principles

### Type Safety First
- **Never use `any` type** in production code
- Prefer explicit typing over implicit typing
- Use strict TypeScript configuration
- Implement comprehensive type checking

### Type Assertion Guidelines
- Use specific type assertions instead of `any`: `value as string` not `value as any`
- Only use type assertions when you're certain about the type
- Prefer type guards over type assertions when possible
- Document why type assertions are necessary

## Handling Third-Party Library Issues

### When Library Types Don't Match
Instead of using `any`, try these approaches in order:

1. **Extend existing interfaces with proper types**:
```typescript
interface CustomSignOptions extends Omit<SignOptions, 'expiresIn'> {
  expiresIn: string | number;
}

const options: CustomSignOptions = {
  expiresIn: '24h'
};

// Use specific type assertion instead of any
jwt.sign(payload, secret, options as SignOptions);
```

2. **Create specific interfaces**:
```typescript
interface JWTSignOptions {
  expiresIn: string | number;
  algorithm?: string;
}

const options: JWTSignOptions = {
  expiresIn: '24h'
};
```

2. **Use union types**:
```typescript
type TokenExpiry = string | number | undefined;
const expiresIn: TokenExpiry = '24h';
```

3. **Create custom type definitions**:
```typescript
declare module 'problematic-library' {
  interface SignOptions {
    expiresIn?: string | number;
  }
}
```

4. **Use `unknown` and type guards**:
```typescript
function isValidToken(token: unknown): token is { userId: string; email: string } {
  return typeof token === 'object' && 
         token !== null && 
         'userId' in token && 
         'email' in token;
}
```

### Library Compatibility Issues
- Update library versions to resolve type conflicts
- Use community-maintained type definitions (@types packages)
- Contribute fixes back to DefinitelyTyped when possible
- Create local type declaration files (.d.ts) for missing types

## Error Handling

### Typed Errors
```typescript
class AuthenticationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Usage
throw new AuthenticationError('Invalid token', 'TOKEN_INVALID');
```

### Result Types
```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

function parseToken(token: string): Result<JWTPayload> {
  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## Code Quality Standards

### Interfaces and Types
- Use `interface` for object shapes that might be extended
- Use `type` for unions, primitives, and computed types
- Prefer composition over inheritance
- Use generic constraints when appropriate

### Function Signatures
- Always type function parameters and return values
- Use optional parameters with default values when appropriate
- Prefer function overloads over union parameter types for complex cases

### Utility Types
- Leverage TypeScript utility types: `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`
- Create custom utility types for common patterns
- Use mapped types for transformations

## Testing Types
- Write type-only tests for complex type logic
- Use `expectTypeOf` or similar utilities for type testing
- Ensure type safety in test code as well

## Migration Strategy
When encountering `any` in existing code:
1. Identify the actual type being used
2. Create proper interfaces or types
3. Add type guards if runtime checking is needed
4. Update function signatures to be more specific
5. Test thoroughly to ensure type safety

## Tools and Configuration
- Use `strict: true` in tsconfig.json
- Enable `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`
- Use ESLint rules: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unsafe-*`
- Configure IDE to highlight `any` usage as warnings/errors