import { describe, it, expect } from 'bun:test';
import { Container } from './Container';

describe('Container', () => {
  it('should register and retrieve services', () => {
    const container = new Container();
    const mockService = { name: 'test-service' };
    
    container.register('testService', () => mockService);
    
    const retrieved = container.get('testService');
    expect(retrieved).toBe(mockService);
  });

  it('should return the same instance on multiple calls (singleton behavior)', () => {
    const container = new Container();
    let callCount = 0;
    
    container.register('counter', () => {
      callCount++;
      return { count: callCount };
    });
    
    const first = container.get('counter');
    const second = container.get('counter');
    
    expect(first).toBe(second);
    expect(callCount).toBe(1);
  });

  it('should throw error for unregistered service', () => {
    const container = new Container();
    
    expect(() => container.get('nonexistent')).toThrow('Service nonexistent not registered');
  });

  it('should check if service exists', () => {
    const container = new Container();
    
    container.register('exists', () => ({}));
    
    expect(container.has('exists')).toBe(true);
    expect(container.has('nonexistent')).toBe(false);
  });
});