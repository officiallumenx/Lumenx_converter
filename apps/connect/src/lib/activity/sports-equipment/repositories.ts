import { isApiAuthMode } from "@/auth/auth-mode";
import { getActivityApiInstituteId } from "../context";
import {
  getSportsV2ApiSnapshot,
  resetSportsV2ApiStore,
  sportsV2ApiStore,
} from "../sports-v2-api-store";
import { mapEquipmentDto } from "../sports-v2-map";
import {
  archiveEquipmentInStore,
  completeMaintenanceInStore,
  computeStockSummary,
  createEquipmentInStore,
  getEquipmentByIdFromStore,
  issueEquipmentInStore,
  listEquipmentFromStore,
  listSuppliersFromStore,
  listTransactionsFromStore,
  markDamagedInStore,
  markLostInStore,
  recordPurchaseInStore,
  resetSportsEquipmentStore,
  returnEquipmentInStore,
  sendToMaintenanceInStore,
  updateEquipmentInStore,
} from "./store";
import type {
  EquipmentIssueInput,
  EquipmentItem,
  EquipmentItemInput,
  EquipmentListFilters,
  EquipmentPurchaseInput,
  EquipmentQuantityActionInput,
  EquipmentStockSummary,
  EquipmentSupplier,
  EquipmentTransaction,
} from "./types";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

function apiCondition(condition: EquipmentItemInput["condition"]) {
  if (condition === "damaged") return "poor" as const;
  if (condition === "under_maintenance" || condition === "lost") return "retired" as const;
  return condition;
}

export const sportsEquipmentRepository = {
  async listEquipment(filters?: EquipmentListFilters): Promise<EquipmentItem[]> {
    if (isApiAuthMode()) {
      const rows = await sportsV2ApiStore.listEquipment();
      return rows.filter((item) => {
        if (
          filters?.categoryId &&
          filters.categoryId !== "all" &&
          item.categoryId !== filters.categoryId
        )
          return false;
        if (
          filters?.condition &&
          filters.condition !== "all" &&
          item.condition !== filters.condition
        )
          return false;
        if (filters?.status && filters.status !== "all" && item.status !== filters.status)
          return false;
        const query = filters?.query?.trim().toLowerCase();
        return (
          !query || `${item.name} ${item.vendor} ${item.notes ?? ""}`.toLowerCase().includes(query)
        );
      });
    }
    await delay();
    return listEquipmentFromStore(filters);
  },
  getEquipmentSnapshot(): EquipmentItem[] {
    if (isApiAuthMode()) return getSportsV2ApiSnapshot().equipment.map(mapEquipmentDto);
    return listEquipmentFromStore();
  },
  async getEquipmentById(id: string): Promise<EquipmentItem | null> {
    if (isApiAuthMode()) {
      return (await sportsV2ApiStore.listEquipment()).find((item) => item.id === id) ?? null;
    }
    await delay(120);
    return getEquipmentByIdFromStore(id);
  },
  async createEquipment(input: EquipmentItemInput): Promise<EquipmentItem> {
    if (isApiAuthMode()) {
      const instituteId = getActivityApiInstituteId();
      if (!instituteId) throw new Error("Activity API context is not configured");
      return mapEquipmentDto(
        await sportsV2ApiStore.createEquipment({
          instituteId,
          name: input.name,
          category: input.categoryId,
          quantity: input.quantity,
          condition: apiCondition(input.condition),
          status: "active",
          notes: input.notes ?? null,
        }),
      );
    }
    await delay(280);
    return createEquipmentInStore(input);
  },
  async updateEquipment(id: string, patch: Partial<EquipmentItemInput>): Promise<EquipmentItem> {
    if (isApiAuthMode()) {
      return mapEquipmentDto(
        await sportsV2ApiStore.updateEquipment(id, {
          name: patch.name,
          category: patch.categoryId,
          quantity: patch.quantity,
          condition: patch.condition ? apiCondition(patch.condition) : undefined,
          notes: patch.notes,
        }),
      );
    }
    await delay(280);
    return updateEquipmentInStore(id, patch);
  },
  async archiveEquipment(id: string): Promise<EquipmentItem> {
    if (isApiAuthMode()) {
      return mapEquipmentDto(await sportsV2ApiStore.updateEquipment(id, { status: "archived" }));
    }
    await delay(220);
    return archiveEquipmentInStore(id);
  },
  async issueEquipment(id: string, input: EquipmentIssueInput): Promise<EquipmentItem> {
    if (isApiAuthMode())
      throw new Error("Equipment issue transactions are not supported by the activity API");
    await delay(240);
    return issueEquipmentInStore(id, input);
  },
  async returnEquipment(id: string, input: EquipmentQuantityActionInput): Promise<EquipmentItem> {
    if (isApiAuthMode())
      throw new Error("Equipment return transactions are not supported by the activity API");
    await delay(240);
    return returnEquipmentInStore(id, input);
  },
  async markDamaged(id: string, input: EquipmentQuantityActionInput): Promise<EquipmentItem> {
    if (isApiAuthMode())
      throw new Error("Equipment damage transactions are not supported by the activity API");
    await delay(240);
    return markDamagedInStore(id, input);
  },
  async markLost(id: string, input: EquipmentQuantityActionInput): Promise<EquipmentItem> {
    if (isApiAuthMode())
      throw new Error("Equipment loss transactions are not supported by the activity API");
    await delay(240);
    return markLostInStore(id, input);
  },
  async sendToMaintenance(id: string, input: EquipmentQuantityActionInput): Promise<EquipmentItem> {
    if (isApiAuthMode())
      throw new Error("Equipment maintenance transactions are not supported by the activity API");
    await delay(240);
    return sendToMaintenanceInStore(id, input);
  },
  async completeMaintenance(
    id: string,
    input: EquipmentQuantityActionInput,
  ): Promise<EquipmentItem> {
    if (isApiAuthMode())
      throw new Error("Equipment maintenance transactions are not supported by the activity API");
    await delay(240);
    return completeMaintenanceInStore(id, input);
  },
  async recordPurchase(id: string, input: EquipmentPurchaseInput): Promise<EquipmentItem> {
    if (isApiAuthMode())
      throw new Error("Equipment purchase transactions are not supported by the activity API");
    await delay(280);
    return recordPurchaseInStore(id, input);
  },
  getStockSummary(): EquipmentStockSummary {
    if (isApiAuthMode())
      return computeStockSummary(getSportsV2ApiSnapshot().equipment.map(mapEquipmentDto));
    return computeStockSummary(listEquipmentFromStore());
  },
  listIssuedTransactions(): EquipmentTransaction[] {
    if (isApiAuthMode())
      throw new Error("Equipment transactions are not supported by the activity API");
    return listTransactionsFromStore("issue");
  },
  listDamagedTransactions(): EquipmentTransaction[] {
    if (isApiAuthMode())
      throw new Error("Equipment transactions are not supported by the activity API");
    return listTransactionsFromStore("damage");
  },
  listLostTransactions(): EquipmentTransaction[] {
    if (isApiAuthMode())
      throw new Error("Equipment transactions are not supported by the activity API");
    return listTransactionsFromStore("loss");
  },
  listMaintenanceTransactions(): EquipmentTransaction[] {
    if (isApiAuthMode())
      throw new Error("Equipment transactions are not supported by the activity API");
    return listTransactionsFromStore(["maintenance", "maintenance_complete"]);
  },
  listPurchaseTransactions(): EquipmentTransaction[] {
    if (isApiAuthMode())
      throw new Error("Equipment transactions are not supported by the activity API");
    return listTransactionsFromStore("purchase");
  },
  listAllTransactions(): EquipmentTransaction[] {
    if (isApiAuthMode())
      throw new Error("Equipment transactions are not supported by the activity API");
    return listTransactionsFromStore();
  },
  listSuppliers(): EquipmentSupplier[] {
    if (isApiAuthMode())
      throw new Error("Equipment suppliers are not supported by the activity API");
    return listSuppliersFromStore();
  },
  reset() {
    if (isApiAuthMode()) {
      resetSportsV2ApiStore();
      return;
    }
    resetSportsEquipmentStore();
  },
};
