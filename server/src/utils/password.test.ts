import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PasswordUtils } from './password';

describe('PasswordUtils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment variables
    process.env.BCRYPT_ROUNDS = '4'; // Use lower rounds for faster tests
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123';

      const hashedPassword = await PasswordUtils.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';

      const hash1 = await PasswordUtils.hashPassword(password);
      const hash2 = await PasswordUtils.hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt includes salt, so hashes should be different
    });

    it('should handle empty password', async () => {
      const password = '';

      const hashedPassword = await PasswordUtils.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });

    it('should handle long passwords', async () => {
      const password = 'a'.repeat(1000);

      const hashedPassword = await PasswordUtils.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      const hashedPassword = await PasswordUtils.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await PasswordUtils.hashPassword(password);

      const isMatch = await PasswordUtils.comparePassword(password, hashedPassword);

      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hashedPassword = await PasswordUtils.hashPassword(password);

      const isMatch = await PasswordUtils.comparePassword(wrongPassword, hashedPassword);

      expect(isMatch).toBe(false);
    });

    it('should return false for empty password against hash', async () => {
      const password = 'testPassword123';
      const hashedPassword = await PasswordUtils.hashPassword(password);

      const isMatch = await PasswordUtils.comparePassword('', hashedPassword);

      expect(isMatch).toBe(false);
    });

    it('should handle case sensitivity', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await PasswordUtils.hashPassword(password);

      const isMatchLower = await PasswordUtils.comparePassword('testpassword123', hashedPassword);
      const isMatchUpper = await PasswordUtils.comparePassword('TESTPASSWORD123', hashedPassword);

      expect(isMatchLower).toBe(false);
      expect(isMatchUpper).toBe(false);
    });

    it('should handle special characters correctly', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await PasswordUtils.hashPassword(password);

      const isMatch = await PasswordUtils.comparePassword(password, hashedPassword);

      expect(isMatch).toBe(true);
    });

    it('should return false for invalid hash format', async () => {
      const password = 'testPassword123';
      const invalidHash = 'not-a-valid-bcrypt-hash';

      const isMatch = await PasswordUtils.comparePassword(password, invalidHash);

      expect(isMatch).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password as valid', () => {
      const strongPassword = 'StrongPassword123!';

      const result = PasswordUtils.validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const shortPassword = '1234567';

      const result = PasswordUtils.validatePasswordStrength(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should accept password with exactly 8 characters', () => {
      const eightCharPassword = '12345678';

      const result = PasswordUtils.validatePasswordStrength(eightCharPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty password', () => {
      const emptyPassword = '';

      const result = PasswordUtils.validatePasswordStrength(emptyPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should handle very long password', () => {
      const longPassword = 'a'.repeat(1000);

      const result = PasswordUtils.validatePasswordStrength(longPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return proper structure for invalid password', () => {
      const invalidPassword = '123';

      const result = PasswordUtils.validatePasswordStrength(invalidPassword);

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.isValid).toBe('boolean');
    });
  });

  describe('environment configuration', () => {
    it('should use default salt rounds when BCRYPT_ROUNDS is not set', async () => {
      delete process.env.BCRYPT_ROUNDS;

      const password = 'testPassword123';
      const hashedPassword = await PasswordUtils.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });

    it('should use custom salt rounds when BCRYPT_ROUNDS is set', async () => {
      process.env.BCRYPT_ROUNDS = '6';

      const password = 'testPassword123';
      const hashedPassword = await PasswordUtils.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });

    it('should handle invalid BCRYPT_ROUNDS gracefully', async () => {
      process.env.BCRYPT_ROUNDS = 'invalid';

      const password = 'testPassword123';
      
      // Should fall back to default behavior
      const hashedPassword = await PasswordUtils.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });
  });
});