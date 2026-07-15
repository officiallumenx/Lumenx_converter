import { useSyncExternalStore } from "react";
import {
  getTemplateStoreRevision,
  subscribeTemplateStore,
} from "@/lib/template-management/store";

export function useTemplateStore() {
  const revision = useSyncExternalStore(subscribeTemplateStore, getTemplateStoreRevision, () => 0);
  return revision;
}
