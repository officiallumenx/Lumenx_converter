import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_DEMO_PROFILE_ID,
  DEMO_PROFILES,
  getDemoProfile,
  readDemoProfileId,
  writeDemoProfileId,
  type DemoAdminBranch,
  type DemoInstituteProfile,
  type DemoProfile,
  type DemoProfileId,
} from "@lumenx/types";
import { reloadSubjectCatalogForProfile } from "@/lib/subjects-data";
import {
  readStoredInstituteProfile,
  saveInstituteProfile as persistInstituteProfile,
} from "@/lib/institute-profile-store";

type DemoProfileContextValue = {
  profileId: DemoProfileId;
  profile: DemoProfile;
  branches: DemoAdminBranch[];
  instituteProfile: DemoInstituteProfile;
  setProfileId: (id: DemoProfileId) => void;
  saveInstituteProfile: (profile: DemoInstituteProfile) => void;
};

const DemoProfileContext = createContext<DemoProfileContextValue | null>(null);

export function DemoProfileProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileIdState] = useState<DemoProfileId>(() => readDemoProfileId());
  const [profileRevision, setProfileRevision] = useState(0);

  useEffect(() => {
    writeDemoProfileId(profileId);
    reloadSubjectCatalogForProfile();
    window.dispatchEvent(new CustomEvent("lumenx-demo-profile-change", { detail: profileId }));
  }, [profileId]);

  const profile = useMemo(() => getDemoProfile(profileId), [profileId]);

  const setProfileId = useCallback((id: DemoProfileId) => {
    setProfileIdState(id);
  }, []);

  const instituteProfile = useMemo(
    () => readStoredInstituteProfile(profileId, profile.admin.instituteProfile),
  // profileRevision forces reload after save
    [profileId, profile, profileRevision],
  );

  const saveInstituteProfile = useCallback(
    (next: DemoInstituteProfile) => {
      persistInstituteProfile(profileId, next);
      setProfileRevision((r) => r + 1);
    },
    [profileId],
  );

  const value = useMemo<DemoProfileContextValue>(
    () => ({
      profileId,
      profile,
      branches: profile.admin.branches,
      instituteProfile,
      setProfileId,
      saveInstituteProfile,
    }),
    [profileId, profile, instituteProfile, setProfileId, saveInstituteProfile],
  );

  return <DemoProfileContext.Provider value={value}>{children}</DemoProfileContext.Provider>;
}

export function useDemoProfile() {
  const ctx = useContext(DemoProfileContext);
  if (!ctx) throw new Error("useDemoProfile outside DemoProfileProvider");
  return ctx;
}

export { DEMO_PROFILES, DEFAULT_DEMO_PROFILE_ID };
