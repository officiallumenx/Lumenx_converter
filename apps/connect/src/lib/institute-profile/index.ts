export type { InstituteSettingsDto, InstituteProfileLoadStatus } from "./types";
export { getInstitute, getInstituteSettings, getInstitutePublicProfile, updateInstituteSettings } from "./api";
export { demoProfileToSettingsPatch, settingsToDemoProfile } from "./map";
export {
  loadInstituteProfileForAdmin,
  loadInstitutePublicProfile,
  type InstituteProfileLoadState,
} from "./load";
