import { z } from "zod";
import { isStrongPassword } from "./password-strength";

export const studentStepSchema = z.object({
  name: z.string().min(2, "Student name is required"),
  gender: z.string().min(1, "Select gender"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().min(1, "Nationality is required"),
  bloodGroup: z.string().min(1, "Blood group is required"),
});

export const parentStepSchema = z.object({
  fatherName: z.string().min(2, "Father's name is required"),
  motherName: z.string().min(2, "Mother's name is required"),
  guardianName: z.string().min(2, "Guardian name is required"),
  mobile: z.string().min(10, "Valid mobile number required"),
  email: z.string().email("Valid email required"),
  occupation: z.string().min(1, "Occupation is required"),
});

export const addressStepSchema = z.object({
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
  postalCode: z.string().min(4, "Postal code is required"),
});

export const academicStepSchema = z.object({
  currentSchool: z.string().min(2, "Current school is required"),
  currentGrade: z.string().min(1, "Current grade is required"),
  previousResults: z.string().min(1, "Previous results required"),
  performance: z.string().min(1, "Performance summary required"),
});

export const programStepSchema = z.object({
  programId: z.string().min(1, "Select a program"),
  grade: z.string().min(1, "Select grade"),
  academicYear: z.string().min(1, "Academic year required"),
});

export const signUpProfileSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email().optional().or(z.literal("")),
});

/** Strong password: 8+ chars, upper, lower, number. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((p) => /[A-Z]/.test(p), "Include at least one uppercase letter")
  .refine((p) => /[a-z]/.test(p), "Include at least one lowercase letter")
  .refine((p) => /[0-9]/.test(p), "Include at least one number")
  .refine((p) => isStrongPassword(p), "Password is not strong enough");

export const signupPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Re-enter your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const termsAcceptanceSchema = z.object({
  acceptedTerms: z.literal(true, {
    errorMap: () => ({
      message: "You must accept the Terms & Conditions and Privacy Policy.",
    }),
  }),
});

export const signupWithTermsSchema = signupPasswordSchema.and(termsAcceptanceSchema);

export const signInSchema = z.object({
  identifier: z.string().min(3, "Enter mobile number"),
  password: z.string().min(1, "Password is required"),
});

export const SYLLABUS_OPTIONS = [
  "SSC",
  "CBSE",
  "ICSE",
  "IB",
  "Cambridge",
  "State board",
  "K–12 / Other",
] as const;

export const APPLY_STEPS = [
  "Student Information",
  "Parent Information",
  "Address",
  "Academic Information",
  "Program Selection",
  "Documents",
  "Review",
  "Success",
] as const;

export type ApplyStepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
