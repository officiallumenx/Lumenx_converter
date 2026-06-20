import { Navigate, useLocation } from "@tanstack/react-router";

import { useCareersAuth } from "./CareersAuthProvider";

import { careersDefaultRoute } from "@/lib/careers/auth-utils";



function loginSearchFromLocation(loc: ReturnType<typeof useLocation>) {

  const search = loc.search as { job?: string; redirect?: string };

  return {

    redirect: (search.redirect as string | undefined) ?? loc.pathname,

    ...(search.job ? { job: search.job } : {}),

  };

}



export function RequireCareersAuth({ children }: { children: React.ReactNode }) {

  const { user, hydrated } = useCareersAuth();

  const loc = useLocation();



  if (!hydrated) return null;

  if (!user) {

    return <Navigate to="/careers/login" search={loginSearchFromLocation(loc)} replace />;

  }

  return <>{children}</>;

}



export function RequireJobSeekerAuth({ children }: { children: React.ReactNode }) {

  const { user, hydrated } = useCareersAuth();

  const loc = useLocation();



  if (!hydrated) return null;

  if (!user) {

    return <Navigate to="/careers/login" search={loginSearchFromLocation(loc)} replace />;

  }

  if (user.accountType === "recruiter") {

    return <Navigate to="/careers/recruiter" replace />;

  }

  return <>{children}</>;

}



export function RequireRecruiterAuth({ children }: { children: React.ReactNode }) {

  const { user, hydrated } = useCareersAuth();

  const loc = useLocation();



  if (!hydrated) return null;

  if (!user) {

    return <Navigate to="/careers/login" search={loginSearchFromLocation(loc)} replace />;

  }

  if (user.accountType !== "recruiter") {

    return <Navigate to="/careers/dashboard" replace />;

  }

  return <>{children}</>;

}



export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {

  const { user, hydrated } = useCareersAuth();

  if (!hydrated) return null;

  if (user) {

    return <Navigate to={careersDefaultRoute(user)} replace />;

  }

  return <>{children}</>;

}



export function isAuthRoute(pathname: string) {

  return (

    pathname === "/careers/login" ||

    pathname === "/careers/signup" ||

    pathname === "/careers/forgot-password"

  );

}



export function isMinimalShellRoute(pathname: string) {

  return isAuthRoute(pathname);

}


