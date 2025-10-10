import bcrypt from 'bcrypt';

export class PasswordUtils {
  private static getSaltRounds(): number {
    const rounds = process.env.BCRYPT_ROUNDS;
    return rounds ? parseInt(rounds, 10) : 12;
  }

  /**
   * Hash a plain text password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = this.getSaltRounds();
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword;
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare a plain text password with a hashed password
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      return isMatch;
    } catch (error) {
      throw new Error('Failed to compare password');
    }
  }

  /**
   * Validate password strength requirements
   */
  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}