import { Navigate, useLocation } from "@tanstack/react-router";
import { useAdmissionsAuth } from "./AdmissionsAuthProvider";

function loginSearchFromLocation(loc: ReturnType<typeof useLocation>) {
  const search = loc.search as { program?: string; institute?: string };
  return {
    redirect: loc.pathname,
    ...(search.program ? { program: search.program } : {}),
    ...(search.institute ? { institute: search.institute } : {}),
  };
}

export function RequireAdmissionsAuth({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAdmissionsAuth();
  const loc = useLocation();

  if (!hydrated) return null;
  if (!user) {
    return <Navigate to="/login" search={loginSearchFromLocation(loc)} replace />;
  }
  return <>{children}</>;
}

export function RequireParentAuth({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAdmissionsAuth();
  const loc = useLocation();

  if (!hydrated) return null;
  if (!user) {
    return <Navigate to="/login" search={loginSearchFromLocation(loc)} replace />;
  }
  if (user.accountType === "institute_admin") {
    return <Navigate to="/institute" replace />;
  }
  return <>{children}</>;
}

export function RequireInstituteAdmin({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAdmissionsAuth();
  const loc = useLocation();

  if (!hydrated) return null;
  if (!user) {
    return <Navigate to="/login" search={loginSearchFromLocation(loc)} replace />;
  }
  if (user.accountType !== "institute_admin") {
    return <Navigate to="/applications" replace />;
  }
  return <>{children}</>;
}

export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAdmissionsAuth();
  if (!hydrated) return null;
  if (user) {
    return (
      <Navigate
        to={
          user.accountType === "institute_admin"
            ? "/institute"
            : "/applications"
        }
        replace
      />
    );
  }
  return <>{children}</>;
}

export function isAuthRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/setup-from-admin"
  );
}

export function isMinimalShellRoute(pathname: string) {
  return isAuthRoute(pathname);
}
