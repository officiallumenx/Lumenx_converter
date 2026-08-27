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
  /** Present for Admin-created users managed through Roles & Access. */
  accessRoleId?: string;
}

// ── Domain: Session ───────────────────────────────────────────

export interface AuthSession {
  userId: string;
  email: string;
  phone?: string;
  name: string;
  initials: string;
  role: AdminRole;
  title: string;
  accessRoleId?: string;
  instituteId: string;
  instituteName: string;
  /** Persisted so reload cannot skip OTP / Nexus approval. */
  isVerified: boolean;
  /**
   * Demo mode: mock JWT placeholder.
   * API mode: empty string — real access token lives in Supabase Auth storage only.
   */
  token: string;
  /** How this session was established. Absent = legacy demo. */
  authSource?: "demo" | "api";
  expiresAt: number; // Unix ms timestamp
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
  completeSignIn(user: AuthUser, remember?: boolean): void;
  /** Update session user without clearing app lock (e.g. Nexus approval). */
  patchAuthenticatedUser(user: AuthUser): void;
  /**
   * API mode only: apply a membership-validated active institute to the UI session.
   * Authority: instituteId must match the stored validated active-institute preference.
   */
  applyApiActiveInstitute(instituteId: string, instituteName: string): void;
  /** API mode: clear institute presentation when context is error/forbidden/empty. */
  clearApiActiveInstitutePresentation(): void;
  signUp(data: SignUpFormData): Promise<void>;
  signOut(): void;
  forgotPassword(email: string): Promise<void>;
  forgotPin(data: ForgotPinFormData): Promise<void>;
  clearError(): void;
}
