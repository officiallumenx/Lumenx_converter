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

export const sportsEquipmentRepository = {
  async listEquipment(filters?: EquipmentListFilters): Promise<EquipmentItem[]> {
    await delay();
    return listEquipmentFromStore(filters);
  },
  getEquipmentSnapshot(): EquipmentItem[] {
    return listEquipmentFromStore();
  },
  async getEquipmentById(id: string): Promise<EquipmentItem | null> {
    await delay(120);
    return getEquipmentByIdFromStore(id);
  },
  async createEquipment(input: EquipmentItemInput): Promise<EquipmentItem> {
    await delay(280);
    return createEquipmentInStore(input);
  },
  async updateEquipment(id: string, patch: Partial<EquipmentItemInput>): Promise<EquipmentItem> {
    await delay(280);
    return updateEquipmentInStore(id, patch);
  },
  async archiveEquipment(id: string): Promise<EquipmentItem> {
    await delay(220);
    return archiveEquipmentInStore(id);
  },
  async issueEquipment(id: string, input: EquipmentIssueInput): Promise<EquipmentItem> {
    await delay(240);
    return issueEquipmentInStore(id, input);
  },
  async returnEquipment(id: string, input: EquipmentQuantityActionInput): Promise<EquipmentItem> {
    await delay(240);
    return returnEquipmentInStore(id, input);
  },
  async markDamaged(id: string, input: EquipmentQuantityActionInput): Promise<EquipmentItem> {
    await delay(240);
    return markDamagedInStore(id, input);
  },
  async markLost(id: string, input: EquipmentQuantityActionInput): Promise<EquipmentItem> {
    await delay(240);
    return markLostInStore(id, input);
  },
  async sendToMaintenance(id: string, input: EquipmentQuantityActionInput): Promise<EquipmentItem> {
    await delay(240);
    return sendToMaintenanceInStore(id, input);
  },
  async completeMaintenance(id: string, input: EquipmentQuantityActionInput): Promise<EquipmentItem> {
    await delay(240);
    return completeMaintenanceInStore(id, input);
  },
  async recordPurchase(id: string, input: EquipmentPurchaseInput): Promise<EquipmentItem> {
    await delay(280);
    return recordPurchaseInStore(id, input);
  },
  getStockSummary(): EquipmentStockSummary {
    return computeStockSummary(listEquipmentFromStore());
  },
  listIssuedTransactions(): EquipmentTransaction[] {
    return listTransactionsFromStore("issue");
  },
  listDamagedTransactions(): EquipmentTransaction[] {
    return listTransactionsFromStore("damage");
  },
  listLostTransactions(): EquipmentTransaction[] {
    return listTransactionsFromStore("loss");
  },
  listMaintenanceTransactions(): EquipmentTransaction[] {
    return listTransactionsFromStore(["maintenance", "maintenance_complete"]);
  },
  listPurchaseTransactions(): EquipmentTransaction[] {
    return listTransactionsFromStore("purchase");
  },
  listAllTransactions(): EquipmentTransaction[] {
    return listTransactionsFromStore();
  },
  listSuppliers(): EquipmentSupplier[] {
    return listSuppliersFromStore();
  },
  reset() {
    resetSportsEquipmentStore();
  },
};
