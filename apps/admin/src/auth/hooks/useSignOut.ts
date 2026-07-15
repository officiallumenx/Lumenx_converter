import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../AuthContext";
import { DEFAULT_AFTER_LOGOUT } from "../constants";

/** Clears session storage and redirects to the public welcome screen. */
export function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return useCallback(() => {
    signOut();
    navigate({ to: DEFAULT_AFTER_LOGOUT, replace: true });
  }, [signOut, navigate]);
}
