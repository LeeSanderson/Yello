import { describe, it, expect } from 'bun:test';
import { 
  emailSchema, 
  passwordSchema, 
  nameSchema, 
  registerSchema,
  loginSchema,
} from './auth';

describe('Email Validation Schema', () => {
  it('should validate correct email formats', () => {
    const validEmails = [
      'user@example.com',
      'test.email@domain.co.uk',
      'user+tag@example.org',
      'user123@test-domain.com',
    ];

    validEmails.forEach(email => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(email);
      }
    });
  });

  it('should reject invalid email formats', () => {
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'user@',
      'user..double.dot@example.com',
      'user@.com',
      '',
      'user name@example.com', // space in email
    ];

    invalidEmails.forEach(email => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/valid email|required/i);
      }
    });
  });

  it('should require email field', () => {
    const result = emailSchema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please enter a valid email address');
    }
  });
});

describe('Password Validation Schema', () => {
  it('should validate passwords with minimum length', () => {
    const validPasswords = [
      'password123',
      'abcdefgh',
      'P@ssw0rd!',
      'verylongpasswordthatmeetsrequirements',
    ];

    validPasswords.forEach(password => {
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(password);
      }
    });
  });

  it('should reject passwords shorter than 8 characters', () => {
    const shortPasswords = [
      'short',
      '1234567',
      'abc',
      '',
      'P@ss1',
    ];

    shortPasswords.forEach(password => {
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters long');
      }
    });
  });

  it('should handle special characters and numbers in passwords', () => {
    const complexPasswords = [
      'P@ssw0rd!',
      'MyP@ssw0rd123',
      '!@#$%^&*()_+',
      'αβγδεζηθικλμ', // Unicode characters
    ];

    complexPasswords.forEach(password => {
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(true);
    });
  });
});

describe('Name Validation Schema', () => {
  it('should validate proper names', () => {
    const validNames = [
      'John Doe',
      'Alice',
      'Bob Smith Jr.',
      'María García',
      'Jean-Pierre',
      'O\'Connor',
    ];

    validNames.forEach(name => {
      const result = nameSchema.safeParse(name);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(name.trim());
      }
    });
  });

  it('should trim whitespace from names', () => {
    const nameWithSpaces = '  John Doe  ';
    const result = nameSchema.safeParse(nameWithSpaces);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('John Doe');
    }
  });

  it('should reject empty names', () => {
    const emptyNames = ['', '   ', '\t\n'];

    emptyNames.forEach(name => {
      const result = nameSchema.safeParse(name);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required');
      }
    });
  });

  it('should reject names longer than 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = nameSchema.safeParse(longName);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name must be less than 100 characters');
    }
  });

  it('should accept names exactly 100 characters', () => {
    const maxLengthName = 'a'.repeat(100);
    const result = nameSchema.safeParse(maxLengthName);
    expect(result.success).toBe(true);
  });
});

describe('Registration Schema', () => {
  it('should validate complete registration data', () => {
    const validRegistrationData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    };

    const result = registerSchema.safeParse(validRegistrationData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'securepassword123',
      });
    }
  });

  it('should reject registration data with invalid email', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'invalid-email',
      password: 'securepassword123',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find(issue => issue.path.includes('email'));
      expect(emailError?.message).toMatch(/valid email/i);
    }
  });

  it('should reject registration data with short password', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'short',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordError = result.error.issues.find(issue => issue.path.includes('password'));
      expect(passwordError?.message).toBe('Password must be at least 8 characters long');
    }
  });

  it('should reject registration data with empty name', () => {
    const invalidData = {
      name: '',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find(issue => issue.path.includes('name'));
      expect(nameError?.message).toBe('Name is required');
    }
  });

  it('should reject registration data with missing fields', () => {
    const incompleteData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      // password missing
    };

    const result = registerSchema.safeParse(incompleteData);
    expect(result.success).toBe(false);
  });

  it('should handle multiple validation errors', () => {
    const invalidData = {
      name: '',
      email: 'invalid-email',
      password: 'short',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(3);
      
      const nameError = result.error.issues.find(issue => issue.path.includes('name'));
      const emailError = result.error.issues.find(issue => issue.path.includes('email'));
      const passwordError = result.error.issues.find(issue => issue.path.includes('password'));
      
      expect(nameError?.message).toBe('Name is required');
      expect(emailError?.message).toMatch(/valid email/i);
      expect(passwordError?.message).toBe('Password must be at least 8 characters long');
    }
  });

  it('should trim name field in registration data', () => {
    const dataWithSpaces = {
      name: '  John Doe  ',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    };

    const result = registerSchema.safeParse(dataWithSpaces);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John Doe');
    }
  });
});

describe('Login Schema', () => {
  it('should validate complete login data', () => {
    const validLoginData = {
      email: 'john.doe@example.com',
      password: 'anypassword',
    };

    const result = loginSchema.safeParse(validLoginData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        email: 'john.doe@example.com',
        password: 'anypassword',
      });
    }
  });

  it('should validate login data with various password lengths', () => {
    const loginDataVariations = [
      {
        email: 'user@example.com',
        password: 'a', // Single character password should be valid for login
      },
      {
        email: 'user@example.com',
        password: 'short', // Short password should be valid for login validation
      },
      {
        email: 'user@example.com',
        password: 'verylongpasswordthatexceedsusualrequirements',
      },
    ];

    loginDataVariations.forEach(loginData => {
      const result = loginSchema.safeParse(loginData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(loginData);
      }
    });
  });

  it('should reject login data with invalid email formats', () => {
    const invalidEmailData = [
      {
        email: 'invalid-email',
        password: 'anypassword',
      },
      {
        email: '@example.com',
        password: 'anypassword',
      },
      {
        email: 'user@',
        password: 'anypassword',
      },
      {
        email: '',
        password: 'anypassword',
      },
    ];

    invalidEmailData.forEach(loginData => {
      const result = loginSchema.safeParse(loginData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find(issue => issue.path.includes('email'));
        expect(emailError?.message).toMatch(/valid email|required/i);
      }
    });
  });

  it('should reject login data with missing password', () => {
    const noPasswordData = {
      email: 'john.doe@example.com',
      password: '',
    };

    const result = loginSchema.safeParse(noPasswordData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordError = result.error.issues.find(issue => issue.path.includes('password'));
      expect(passwordError?.message).toBe('Password is required');
    }
  });

  it('should reject login data with missing email field', () => {
    const noEmailData = {
      password: 'anypassword',
      // email missing
    };

    const result = loginSchema.safeParse(noEmailData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find(issue => issue.path.includes('email'));
      expect(emailError).toBeDefined();
    }
  });

  it('should reject login data with missing password field', () => {
    const noPasswordData = {
      email: 'john.doe@example.com',
      // password missing
    };

    const result = loginSchema.safeParse(noPasswordData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordError = result.error.issues.find(issue => issue.path.includes('password'));
      expect(passwordError).toBeDefined();
    }
  });

  it('should handle multiple validation errors in login data', () => {
    const invalidLoginData = {
      email: 'invalid-email',
      password: '',
    };

    const result = loginSchema.safeParse(invalidLoginData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
      
      const emailError = result.error.issues.find(issue => issue.path.includes('email'));
      const passwordError = result.error.issues.find(issue => issue.path.includes('password'));
      
      expect(emailError?.message).toMatch(/valid email/i);
      expect(passwordError?.message).toBe('Password is required');
    }
  });

  it('should reuse email validation from registration schema', () => {
    // Test that login schema uses the same email validation as registration
    const testEmail = 'test@example.com';
    
    const loginResult = loginSchema.safeParse({
      email: testEmail,
      password: 'anypassword',
    });
    
    const emailResult = emailSchema.safeParse(testEmail);
    
    expect(loginResult.success).toBe(true);
    expect(emailResult.success).toBe(true);
    
    // Test invalid email behaves the same way
    const invalidEmail = 'invalid-email';
    
    const invalidLoginResult = loginSchema.safeParse({
      email: invalidEmail,
      password: 'anypassword',
    });
    
    const invalidEmailResult = emailSchema.safeParse(invalidEmail);
    
    expect(invalidLoginResult.success).toBe(false);
    expect(invalidEmailResult.success).toBe(false);
    
    if (!invalidLoginResult.success && !invalidEmailResult.success) {
      const loginEmailError = invalidLoginResult.error.issues.find(issue => issue.path.includes('email'));
      const directEmailError = invalidEmailResult.error.issues[0];
      
      expect(loginEmailError?.message).toBe(directEmailError.message);
    }
  });

  it('should accept login data with special characters in password', () => {
    const specialPasswordData = {
      email: 'user@example.com',
      password: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    };

    const result = loginSchema.safeParse(specialPasswordData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe('!@#$%^&*()_+-=[]{}|;:,.<>?');
    }
  });
});