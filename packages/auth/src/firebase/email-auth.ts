/**
 * Firebase Email Auth (client) — password-based (not Resend email OTP).
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { requireFirebaseAuth } from "./client";
import { mapFirebaseClientError } from "./errors";

export type FirebaseEmailSignInResult = {
  idToken: string;
  uid: string;
  email: string | null;
  emailVerified: boolean;
  user: User;
};

function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (!value.includes("@")) {
    throw mapFirebaseClientError({ code: "auth/invalid-email" });
  }
  return value;
}

export async function signInWithFirebaseEmail(
  email: string,
  password: string,
  auth?: Auth,
): Promise<FirebaseEmailSignInResult> {
  const authClient = auth ?? requireFirebaseAuth();
  const normalized = normalizeEmail(email);
  if (!password) {
    throw mapFirebaseClientError({ code: "auth/missing-password" });
  }
  try {
    const credential = await signInWithEmailAndPassword(
      authClient,
      normalized,
      password,
    );
    const idToken = await credential.user.getIdToken(true);
    return {
      idToken,
      uid: credential.user.uid,
      email: credential.user.email,
      emailVerified: credential.user.emailVerified,
      user: credential.user,
    };
  } catch (err) {
    throw mapFirebaseClientError(err);
  }
}

export async function registerWithFirebaseEmail(
  email: string,
  password: string,
  auth?: Auth,
): Promise<FirebaseEmailSignInResult> {
  const authClient = auth ?? requireFirebaseAuth();
  const normalized = normalizeEmail(email);
  if (!password || password.length < 6) {
    throw mapFirebaseClientError({ code: "auth/weak-password" });
  }
  try {
    const credential = await createUserWithEmailAndPassword(
      authClient,
      normalized,
      password,
    );
    const idToken = await credential.user.getIdToken(true);
    return {
      idToken,
      uid: credential.user.uid,
      email: credential.user.email,
      emailVerified: credential.user.emailVerified,
      user: credential.user,
    };
  } catch (err) {
    throw mapFirebaseClientError(err);
  }
}

export async function requestFirebasePasswordReset(
  email: string,
  auth?: Auth,
): Promise<void> {
  const authClient = auth ?? requireFirebaseAuth();
  try {
    await sendPasswordResetEmail(authClient, normalizeEmail(email));
  } catch (err) {
    throw mapFirebaseClientError(err);
  }
}

export async function signOutFirebase(auth?: Auth): Promise<void> {
  const authClient = auth ?? requireFirebaseAuth();
  try {
    await signOut(authClient);
  } catch (err) {
    throw mapFirebaseClientError(err);
  }
}
