import { z } from "zod";

export const personalStepSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  gender: z.string().min(1, "Select gender"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  mobile: z.string().min(10, "Valid mobile number required"),
  email: z.string().email("Valid email required"),
});

export const addressStepSchema = z.object({
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
  postalCode: z.string().min(4, "Postal code is required"),
});

export const professionalStepSchema = z.object({
  highestQualification: z.string().min(2, "Qualification is required"),
  experienceYears: z.string().min(1, "Experience is required"),
  currentEmployer: z.string().min(1, "Current employer is required"),
  currentRole: z.string().min(1, "Current role is required"),
  expectedSalary: z.string().min(1, "Expected salary is required"),
  noticePeriod: z.string().min(1, "Notice period is required"),
});

export const teachingStepSchema = z.object({
  teachingSubjects: z.string(),
  sportsSpecialization: z.string(),
  labSpecialization: z.string(),
  technicalSkills: z.string().min(1, "List at least one skill"),
  languagesKnown: z.string().min(1, "Languages are required"),
  grades: z.string().optional(),
  boards: z.string().optional(),
});

export const skillsStepSchema = teachingStepSchema;

export const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export const signupContactSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const signupPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signupProfileSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  currentRole: z.string().min(2, "Current role or headline is required"),
});

export const signInSchema = z.object({
  identifier: z.string().min(3, "Enter mobile or email"),
  password: z.string().min(1, "Password is required"),
});

export const APPLY_STEPS_V2 = [
  "Personal Information",
  "Professional Background",
  "Teaching Profile",
  "Documents",
  "Review",
  "Success",
] as const;

export const APPLY_STEPS = APPLY_STEPS_V2;

export type ApplyStepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const profileEditSchema = z.object({
  headline: z.string().min(3, "Headline is required"),
  summary: z.string().min(10, "Summary is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  expectedSalary: z.string().min(1, "Expected salary is required"),
  availability: z.string().min(1, "Availability is required"),
  currentEmployer: z.string(),
});
