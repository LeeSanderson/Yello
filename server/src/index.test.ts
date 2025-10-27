import { describe, it, expect, beforeEach } from 'bun:test';
import { setupContainer } from './container/setup';
import type { MiddlewareHandler } from 'hono';

describe('Main Server Setup', () => {
  let container: any;

  beforeEach(() => {
    container = setupContainer();
  });

  describe('Container Setup', () => {
    it('should register authentication middleware in container', () => {
      // Test that authMiddleware is registered
      expect(() => container.get('authMiddleware')).not.toThrow();
      const authMiddleware = container.get('authMiddleware');
      expect(typeof authMiddleware).toBe('function');
    });

    it('should register optional authentication middleware in container', () => {
      // Test that optionalAuthMiddleware is registered
      expect(() => container.get('optionalAuthMiddleware')).not.toThrow();
      const optionalAuthMiddleware = container.get('optionalAuthMiddleware');
      expect(typeof optionalAuthMiddleware).toBe('function');
    });

    it('should register all required services for authentication', () => {
      // Test that all dependencies for authentication are available
      expect(() => container.get('database')).not.toThrow();
      expect(() => container.get('userRepository')).not.toThrow();
      expect(() => container.get('userService')).not.toThrow();
      expect(() => container.get('authHelper')).not.toThrow();
    });

    it('should register all repository services', () => {
      // Test that all repository services are available
      expect(() => container.get('userRepository')).not.toThrow();
      expect(() => container.get('workspaceRepository')).not.toThrow();
      expect(() => container.get('projectRepository')).not.toThrow();
      expect(() => container.get('taskRepository')).not.toThrow();
    });
  });

  describe('Middleware Configuration', () => {
    it('should create different instances of auth and optional auth middleware', () => {
      const authMiddleware = container.get('authMiddleware');
      const optionalAuthMiddleware = container.get('optionalAuthMiddleware');
      
      // They should be different functions
      expect(authMiddleware).not.toBe(optionalAuthMiddleware);
      expect(typeof authMiddleware).toBe('function');
      expect(typeof optionalAuthMiddleware).toBe('function');
    });

    it('should maintain singleton behavior for middleware instances', () => {
      const authMiddleware1 = container.get('authMiddleware');
      const authMiddleware2 = container.get('authMiddleware');
      
      // Should return the same instance (singleton behavior)
      expect(authMiddleware1).toBe(authMiddleware2);
    });
  });
});