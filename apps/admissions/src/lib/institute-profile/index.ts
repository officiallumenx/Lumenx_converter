export {
  getInstitute,
  getInstitutePublicProfile,
  getInstituteSettings,
  updateInstituteSettings,
} from "./api";
export { demoProfileToSettingsPatch, settingsToDemoProfile } from "./map";
export {
  loadInstituteProfileForAdmin,
  loadInstitutePublicProfile,
  type InstituteProfileLoadState,
} from "./load";
export type { InstituteProfileLoadStatus, InstituteSettingsDto } from "./types";
