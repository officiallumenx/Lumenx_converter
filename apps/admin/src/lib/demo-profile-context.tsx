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
  DEMO_PROFILES,
  getDemoProfile,
  readDemoProfileId,
  writeDemoProfileId,
  type DemoInstituteSummary,
  type DemoInstituteProfile,
  type DemoProfile,
  type DemoProfileId,
} from "@lumenx/types";
import {
  admissionsInstituteIdForDemoProfile,
  isInstituteProfileSyncMessage,
  saveSharedInstituteProfile,
} from "@lumenx/utils";
import { reloadSubjectCatalogForProfile } from "@/lib/subjects-data";
import {
  readStoredInstituteProfile,
  saveInstituteProfile as persistInstituteProfile,
  syncInstituteProfileToAdmissions,
  writeInstituteProfileOverride,
} from "@/lib/institute-profile-store";
import {
  clearRegisteredAdminTenant,
  EMPTY_SCHOOL_ACADEMIC,
  isRegisteredAdminTenant,
  readAdminDataScopeKey,
  readRegisteredAdminTenant,
  readTenantInstituteProfile,
  saveTenantInstituteProfile,
  subscribeAdminTenant,
} from "@/lib/admin-tenant";

type DemoProfileContextValue = {
  profileId: DemoProfileId;
  profile: DemoProfile;
  instituteSummary: DemoInstituteSummary;
  instituteProfile: DemoInstituteProfile;
  setProfileId: (id: DemoProfileId) => void;
  saveInstituteProfile: (profile: DemoInstituteProfile) => void;
  /** True when Admin is bound to a Nexus-approved registration (empty operational data). */
  isFreshRegisteredInstitute: boolean;
};

const DemoProfileContext = createContext<DemoProfileContextValue | null>(null);

export function DemoProfileProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileIdState] = useState<DemoProfileId>(() => readDemoProfileId());
  const [profileRevision, setProfileRevision] = useState(0);
  const [tenantTick, setTenantTick] = useState(0);

  useEffect(() => subscribeAdminTenant(() => setTenantTick((t) => t + 1)), []);

  useEffect(() => {
    writeDemoProfileId(profileId);
    reloadSubjectCatalogForProfile();
    window.dispatchEvent(new CustomEvent("lumenx-demo-profile-change", { detail: profileId }));
  }, [profileId, tenantTick]);

  const registered = readRegisteredAdminTenant();
  const isFreshRegisteredInstitute = registered !== null;

  const baseProfile = useMemo(() => getDemoProfile(profileId), [profileId]);

  const profile = useMemo<DemoProfile>(() => {
    if (!registered) return baseProfile;
    const scopeKey = readAdminDataScopeKey();
    const emptySeed = {
      ...baseProfile.admin.instituteProfile,
      name: registered.instituteName,
      principal: registered.principalName,
      email: registered.principalEmail,
      phone: registered.principalMobile,
      history: [],
      awards: [],
      achievements: [],
      customFields: [],
      vision: "",
      mission: "",
      ranking: "",
      founded: "",
      founder: "",
    };
    const instituteProfile = readTenantInstituteProfile(scopeKey, emptySeed);
    return {
      ...baseProfile,
      academic: EMPTY_SCHOOL_ACADEMIC,
      admin: {
        ...baseProfile.admin,
        organizationName: registered.instituteName,
        headerSubtitle: "Registered institute · Fresh start",
        principalName: registered.principalName,
        principalTitle: "Principal",
        instituteSummary: {
          name: registered.instituteName,
          students: 0,
          attendance: 0,
          growth: 0,
          performance: "medium",
        },
        instituteProfile,
      },
    };
  }, [baseProfile, registered, tenantTick, profileRevision]);

  const setProfileId = useCallback((id: DemoProfileId) => {
    // Switching demo profiles leaves the registered-tenant blank-data mode.
    if (isRegisteredAdminTenant()) clearRegisteredAdminTenant();
    setProfileIdState(id);
  }, []);

  const instituteProfile = useMemo(() => {
    if (registered) {
      return profile.admin.instituteProfile;
    }
    return readStoredInstituteProfile(profileId, profile.admin.instituteProfile);
  }, [profileId, profile, profileRevision, registered, tenantTick]);

  // Keep Admissions shared bag seeded with current Admin profile (demo only)
  useEffect(() => {
    if (registered) return;
    syncInstituteProfileToAdmissions(profileId, instituteProfile);
  }, [profileId, instituteProfile, registered]);

  // Accept profile updates from Admissions (opened from Admin)
  useEffect(() => {
    if (registered) return;
    const onMessage = (event: MessageEvent) => {
      if (!isInstituteProfileSyncMessage(event.data)) return;
      const admissionsId = admissionsInstituteIdForDemoProfile(profileId);
      if (event.data.admissionsInstituteId !== admissionsId) return;
      writeInstituteProfileOverride(profileId, event.data.profile);
      saveSharedInstituteProfile(admissionsId, event.data.profile);
      setProfileRevision((r) => r + 1);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [profileId, registered]);

  const saveInstituteProfile = useCallback(
    (next: DemoInstituteProfile) => {
      if (isRegisteredAdminTenant()) {
        saveTenantInstituteProfile(readAdminDataScopeKey(), next);
      } else {
        persistInstituteProfile(profileId, next);
      }
      setProfileRevision((r) => r + 1);
    },
    [profileId],
  );

  const value = useMemo<DemoProfileContextValue>(
    () => ({
      profileId,
      profile,
      instituteSummary: profile.admin.instituteSummary,
      instituteProfile,
      setProfileId,
      saveInstituteProfile,
      isFreshRegisteredInstitute,
    }),
    [
      profileId,
      profile,
      instituteProfile,
      setProfileId,
      saveInstituteProfile,
      isFreshRegisteredInstitute,
    ],
  );

  return (
    <DemoProfileContext.Provider value={value}>{children}</DemoProfileContext.Provider>
  );
}

export function useDemoProfile(): DemoProfileContextValue {
  const ctx = useContext(DemoProfileContext);
  if (!ctx) throw new Error("useDemoProfile must be used within DemoProfileProvider");
  return ctx;
}

export { DEMO_PROFILES };
