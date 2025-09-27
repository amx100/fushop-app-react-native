import * as zod from 'zod';

export const authSchema = zod.object({
  email: zod.string().email({ message: 'Invalid email address' }),
  password: zod
    .string()
    .min(6, { message: 'Password must be at least 6 characters long' }),
});

export const registrationSchema = zod.object({
  email: zod.string().email({ message: 'Invalid email address' }),
  password: zod
    .string()
    .min(6, { message: 'Password must be at least 6 characters long' }),
  confirmPassword: zod.string(),
  firstName: zod.string().min(2, { message: 'First name must be at least 2 characters' }),
  lastName: zod.string().min(2, { message: 'Last name must be at least 2 characters' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}); 