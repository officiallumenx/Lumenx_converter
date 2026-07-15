/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Authentication Types
 *  Single source of truth for all auth-related TypeScript types.
 *  Designed for clean-architecture future backend integration.
 * ───────────────────────────────────────────────────────────── */

// ── Domain: User ─────────────────────────────────────────────

export type AdminRole =
  | "super_admin"
  | "principal"
  | "vice_principal"
  | "coordinator"
  | "admissions_officer"
  | "teacher"
  | "accountant"
  | "it_admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: AdminRole;
  title: string;
  phone?: string;
  avatarUrl?: string;
  instituteId: string;
  instituteName: string;
  isVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

// ── Domain: Session ───────────────────────────────────────────

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  initials: string;
  role: AdminRole;
  title: string;
  instituteId: string;
  instituteName: string;
  token: string;           // mock JWT placeholder (real in production)
  expiresAt: number;       // Unix ms timestamp
  issuedAt: number;
}

// ── Domain: Auth State ────────────────────────────────────────

export type AuthStatus =
  | "idle"          // not yet determined
  | "loading"       // checking session
  | "authenticated" // valid session
  | "unauthenticated"; // no session / logged out

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  session: AuthSession | null;
  error: string | null;
}

// ── Forms: Sign In ────────────────────────────────────────────

export interface SignInFormData {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export interface SignInFormErrors {
  identifier?: string;
  password?: string;
  general?: string;
}

// ── Forms: Sign Up ────────────────────────────────────────────

export interface SignUpStep1Data {
  fullName: string;
  email: string;
  phone: string;
  role: AdminRole | "";
  designation: string;
}

export interface SignUpStep2Data {
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export type SignUpFormData = SignUpStep1Data & SignUpStep2Data & {
  securityPin?: string;
  instituteName?: string;
};

export interface SignUpStep1Errors {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  designation?: string;
}

export interface SignUpStep2Errors {
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

// ── Forms: Forgot Password ────────────────────────────────────

export interface ForgotPasswordFormData {
  email: string;
}

export interface ForgotPasswordFormErrors {
  email?: string;
  general?: string;
}

// ── Forms: Forgot PIN ─────────────────────────────────────────

export interface ForgotPinFormData {
  email: string;
  employeeId: string;
  dateOfBirth: string;
}

export interface ForgotPinFormErrors {
  email?: string;
  employeeId?: string;
  dateOfBirth?: string;
  general?: string;
}

// ── Service Interface (backend contract) ─────────────────────

/**
 * IAuthService — contract for the authentication data layer.
 * Replace the mock implementation with a real API client here.
 */
export interface IAuthService {
  signIn(identifier: string, password: string): Promise<AuthSession>;
  signUp(data: SignUpFormData): Promise<AuthSession>;
  signOut(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  forgotPin(data: ForgotPinFormData): Promise<void>;
  refreshSession(session: AuthSession): Promise<AuthSession>;
  getCurrentSession(): AuthSession | null;
}

// ── Context shape ─────────────────────────────────────────────

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn(identifier: string, password: string, remember?: boolean): Promise<void>;
  signUp(data: SignUpFormData): Promise<void>;
  signOut(): void;
  forgotPassword(email: string): Promise<void>;
  forgotPin(data: ForgotPinFormData): Promise<void>;
  clearError(): void;
}
