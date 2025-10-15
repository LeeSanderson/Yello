import { z } from 'zod';

/**
 * Email validation schema
 * Validates email format using Zod's built-in email validation
 */
// export const emailSchema = z
//     .string()
//     .min(1, 'Email is required')
//     .email({ message: 'Please enter a valid email address' });
export const emailSchema = z
    .email('Please enter a valid email address');

/**
 * Password validation schema
 * Validates password length and strength requirements
 */
export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters long');

/**
 * Name validation schema
 * Validates user name field for registration
 */
export const nameSchema = z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters');

/**
 * User registration validation schema
 * Validates all required fields for user registration
 */
export const registerSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
});

/**
 * Type inference for registration data
 */
export type RegisterData = z.infer<typeof registerSchema>;

/**
 * User login validation schema
 * Validates email and password field presence for login requests
 * Reuses email validation schema from registration
 */
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

/**
 * Type inference for login data
 */
export type LoginData = z.infer<typeof loginSchema>;