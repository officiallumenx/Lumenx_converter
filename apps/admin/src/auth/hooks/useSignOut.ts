import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../AuthContext";
import { DEFAULT_AFTER_LOGOUT } from "../constants";

/** Clears session + persisted caches, then redirects to the public welcome screen. */
export function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return useCallback(async () => {
    await signOut();
    navigate({ to: DEFAULT_AFTER_LOGOUT, replace: true });
  }, [signOut, navigate]);
}
