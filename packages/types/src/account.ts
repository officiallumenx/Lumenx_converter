/** Portal account lifecycle / access status unions shared across Admin directories. */

/** Full portal account row status (Accounts module). */
export type PortalAccountStatus = "active" | "pending" | "suspended" | "hold";

/** Access control after invite (students / parents directory). */
export type PortalAccessStatus = "active" | "hold" | "suspended";

/** Invite lifecycle for parent portal credentials. */
export type PortalInviteStatus = "active" | "pending";

/** Connect first-login account state on a student directory row. */
export type ConnectLoginAccountStatus = "first-login-pending" | "active" | "suspended";
