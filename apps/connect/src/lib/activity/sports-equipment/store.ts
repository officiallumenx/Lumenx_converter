import {
  cloneEquipmentItem,
  createEquipmentFromInput,
  equipmentSeed,
  equipmentSuppliersSeed,
} from "./mock";
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

let equipmentStore: EquipmentItem[] = equipmentSeed.map(cloneEquipmentItem);
let suppliersStore: EquipmentSupplier[] = equipmentSuppliersSeed.map((s) => ({ ...s }));

const transactionsSeed: EquipmentTransaction[] = [
  {
    id: "txn-1",
    equipmentId: "eq-1",
    equipmentName: "Football — Size 5 (Match)",
    type: "issue",
    quantity: 4,
    issuedTo: "Senior Football Team",
    issuedToType: "team",
    date: "2026-03-08",
  },
  {
    id: "txn-2",
    equipmentId: "eq-7",
    equipmentName: "Sports Jersey — Home Kit",
    type: "issue",
    quantity: 18,
    issuedTo: "Senior Football Team",
    issuedToType: "team",
    date: "2026-03-06",
  },
  {
    id: "txn-3",
    equipmentId: "eq-2",
    equipmentName: "Cricket Bat — English Willow",
    type: "damage",
    quantity: 1,
    notes: "Handle crack during net session",
    date: "2026-02-15",
  },
  {
    id: "txn-4",
    equipmentId: "eq-5",
    equipmentName: "Volleyball — Official",
    type: "loss",
    quantity: 1,
    notes: "Not returned after inter-house match",
    date: "2026-02-20",
  },
  {
    id: "txn-5",
    equipmentId: "eq-6",
    equipmentName: "Agility Ladder Set",
    type: "maintenance",
    quantity: 1,
    notes: "Rung replacement required",
    date: "2026-03-08",
  },
  {
    id: "txn-6",
    equipmentId: "eq-1",
    equipmentName: "Football — Size 5 (Match)",
    type: "purchase",
    quantity: 12,
    cost: 7200,
    vendor: "SportZone India",
    date: "2025-08-12",
  },
];

let transactionsStore: EquipmentTransaction[] = [...transactionsSeed];

function findEquipment(id: string): EquipmentItem {
  const item = equipmentStore.find((e) => e.id === id);
  if (!item) throw new Error("Equipment not found");
  if (item.status === "archived") throw new Error("Archived equipment cannot be modified.");
  return item;
}

function pushTransaction(txn: Omit<EquipmentTransaction, "id">): EquipmentTransaction {
  const record: EquipmentTransaction = { ...txn, id: `txn-${Date.now()}` };
  transactionsStore = [record, ...transactionsStore];
  return record;
}

function syncCondition(item: EquipmentItem): EquipmentCondition {
  if (item.lost > 0 && item.available === 0 && item.issued === 0) return "lost";
  if (item.inMaintenance > 0) return "under_maintenance";
  if (item.damaged > 0) return "damaged";
  if (item.available < item.quantity * 0.3) return "fair";
  return "good";
}

function applyEquipmentFilters(items: EquipmentItem[], filters?: EquipmentListFilters): EquipmentItem[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.categoryId && f.categoryId !== "all") {
    result = result.filter((e) => e.categoryId === f.categoryId);
  }
  if (f.condition && f.condition !== "all") {
    result = result.filter((e) => e.condition === f.condition);
  }
  if (f.status && f.status !== "all") {
    result = result.filter((e) => e.status === f.status);
  }
  if (f.supplierId && f.supplierId !== "all") {
    result = result.filter((e) => e.supplierId === f.supplierId);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.vendor.toLowerCase().includes(q) ||
        (e.notes?.toLowerCase().includes(q) ?? false),
    );
  }

  const sortBy = f.sortBy ?? "name";
  const sortDir = f.sortDir ?? "asc";
  const dir = sortDir === "asc" ? 1 : -1;

  result.sort((a, b) => {
    if (sortBy === "available") return dir * (a.available - b.available);
    if (sortBy === "updatedAt") return dir * a.updatedAt.localeCompare(b.updatedAt);
    return dir * a.name.localeCompare(b.name);
  });

  return result;
}

export function resetSportsEquipmentStore() {
  equipmentStore = equipmentSeed.map(cloneEquipmentItem);
  suppliersStore = equipmentSuppliersSeed.map((s) => ({ ...s }));
  transactionsStore = [...transactionsSeed];
}

export function listEquipmentFromStore(filters?: EquipmentListFilters): EquipmentItem[] {
  return applyEquipmentFilters(equipmentStore, filters).map(cloneEquipmentItem);
}

export function getEquipmentByIdFromStore(id: string): EquipmentItem | null {
  const found = equipmentStore.find((e) => e.id === id);
  return found ? cloneEquipmentItem(found) : null;
}

export function listSuppliersFromStore(): EquipmentSupplier[] {
  return suppliersStore.map((s) => ({ ...s }));
}

export function listTransactionsFromStore(
  type?: EquipmentTransaction["type"] | EquipmentTransaction["type"][],
): EquipmentTransaction[] {
  let result = [...transactionsStore];
  if (type) {
    const types = Array.isArray(type) ? type : [type];
    result = result.filter((t) => types.includes(t.type));
  }
  return result;
}

export function computeStockSummary(items: EquipmentItem[]): EquipmentStockSummary {
  const active = items.filter((e) => e.status === "active");
  return {
    totalItems: active.length,
    totalQuantity: active.reduce((s, e) => s + e.quantity, 0),
    totalAvailable: active.reduce((s, e) => s + e.available, 0),
    totalIssued: active.reduce((s, e) => s + e.issued, 0),
    totalDamaged: active.reduce((s, e) => s + e.damaged, 0),
    totalLost: active.reduce((s, e) => s + e.lost, 0),
    totalInMaintenance: active.reduce((s, e) => s + e.inMaintenance, 0),
    lowStockCount: active.filter((e) => e.available <= 3 && e.available > 0).length,
  };
}

export function createEquipmentInStore(input: EquipmentItemInput): EquipmentItem {
  const record = createEquipmentFromInput(input);
  equipmentStore = [record, ...equipmentStore];
  pushTransaction({
    equipmentId: record.id,
    equipmentName: record.name,
    type: "purchase",
    quantity: record.quantity,
    cost: record.cost,
    vendor: record.vendor,
    date: record.purchaseDate,
    notes: "Initial stock",
  });
  return cloneEquipmentItem(record);
}

export function updateEquipmentInStore(id: string, patch: Partial<EquipmentItemInput>): EquipmentItem {
  const idx = equipmentStore.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Equipment not found");
  const prev = equipmentStore[idx];
  if (prev.status === "archived") throw new Error("Archived equipment cannot be edited.");

  const qtyDelta = patch.quantity != null ? patch.quantity - prev.quantity : 0;
  const updated = cloneEquipmentItem({
    ...prev,
    name: patch.name?.trim() ?? prev.name,
    categoryId: patch.categoryId ?? prev.categoryId,
    quantity: patch.quantity ?? prev.quantity,
    available: Math.max(0, prev.available + qtyDelta),
    condition: patch.condition ?? prev.condition,
    purchaseDate: patch.purchaseDate ?? prev.purchaseDate,
    cost: patch.cost ?? prev.cost,
    vendor: patch.vendor?.trim() ?? prev.vendor,
    supplierId: patch.supplierId ?? prev.supplierId,
    notes: patch.notes?.trim() ?? prev.notes,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  equipmentStore = equipmentStore.map((e) => (e.id === id ? updated : e));
  return cloneEquipmentItem(updated);
}

export function archiveEquipmentInStore(id: string): EquipmentItem {
  const idx = equipmentStore.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Equipment not found");
  const archived = cloneEquipmentItem({
    ...equipmentStore[idx],
    status: "archived",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  equipmentStore = equipmentStore.map((e) => (e.id === id ? archived : e));
  return cloneEquipmentItem(archived);
}

export function issueEquipmentInStore(id: string, input: EquipmentIssueInput): EquipmentItem {
  const item = findEquipment(id);
  if (input.quantity > item.available) throw new Error("Insufficient available stock.");
  const updated = cloneEquipmentItem({
    ...item,
    available: item.available - input.quantity,
    issued: item.issued + input.quantity,
    updatedAt: new Date().toISOString().slice(0, 10),
    condition: syncCondition({ ...item, available: item.available - input.quantity, issued: item.issued + input.quantity }),
  });
  equipmentStore = equipmentStore.map((e) => (e.id === id ? updated : e));
  pushTransaction({
    equipmentId: id,
    equipmentName: item.name,
    type: "issue",
    quantity: input.quantity,
    issuedTo: input.issuedTo,
    issuedToType: input.issuedToType,
    notes: input.notes,
    date: new Date().toISOString().slice(0, 10),
  });
  return cloneEquipmentItem(updated);
}

export function returnEquipmentInStore(id: string, input: EquipmentQuantityActionInput): EquipmentItem {
  const item = findEquipment(id);
  if (input.quantity > item.issued) throw new Error("Return quantity exceeds issued count.");
  const updated = cloneEquipmentItem({
    ...item,
    available: item.available + input.quantity,
    issued: item.issued - input.quantity,
    updatedAt: new Date().toISOString().slice(0, 10),
    condition: syncCondition({ ...item, available: item.available + input.quantity, issued: item.issued - input.quantity }),
  });
  equipmentStore = equipmentStore.map((e) => (e.id === id ? updated : e));
  pushTransaction({
    equipmentId: id,
    equipmentName: item.name,
    type: "return",
    quantity: input.quantity,
    notes: input.notes,
    date: new Date().toISOString().slice(0, 10),
  });
  return cloneEquipmentItem(updated);
}

export function markDamagedInStore(id: string, input: EquipmentQuantityActionInput): EquipmentItem {
  const item = findEquipment(id);
  const pool = item.available + item.issued;
  if (input.quantity > pool) throw new Error("Quantity exceeds available + issued stock.");
  let available = item.available;
  let issued = item.issued;
  const fromIssued = Math.min(issued, input.quantity);
  issued -= fromIssued;
  const remainder = input.quantity - fromIssued;
  available = Math.max(0, available - remainder);

  const updated = cloneEquipmentItem({
    ...item,
    available,
    issued,
    damaged: item.damaged + input.quantity,
    condition: "damaged",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  equipmentStore = equipmentStore.map((e) => (e.id === id ? updated : e));
  pushTransaction({
    equipmentId: id,
    equipmentName: item.name,
    type: "damage",
    quantity: input.quantity,
    notes: input.notes,
    date: new Date().toISOString().slice(0, 10),
  });
  return cloneEquipmentItem(updated);
}

export function markLostInStore(id: string, input: EquipmentQuantityActionInput): EquipmentItem {
  const item = findEquipment(id);
  if (input.quantity > item.issued) throw new Error("Can only mark issued items as lost.");
  const updated = cloneEquipmentItem({
    ...item,
    issued: item.issued - input.quantity,
    lost: item.lost + input.quantity,
    condition: item.lost + input.quantity > 0 ? "lost" : item.condition,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  equipmentStore = equipmentStore.map((e) => (e.id === id ? updated : e));
  pushTransaction({
    equipmentId: id,
    equipmentName: item.name,
    type: "loss",
    quantity: input.quantity,
    notes: input.notes,
    date: new Date().toISOString().slice(0, 10),
  });
  return cloneEquipmentItem(updated);
}

export function sendToMaintenanceInStore(id: string, input: EquipmentQuantityActionInput): EquipmentItem {
  const item = findEquipment(id);
  if (input.quantity > item.available) throw new Error("Insufficient available stock for maintenance.");
  const updated = cloneEquipmentItem({
    ...item,
    available: item.available - input.quantity,
    inMaintenance: item.inMaintenance + input.quantity,
    condition: "under_maintenance",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  equipmentStore = equipmentStore.map((e) => (e.id === id ? updated : e));
  pushTransaction({
    equipmentId: id,
    equipmentName: item.name,
    type: "maintenance",
    quantity: input.quantity,
    notes: input.notes,
    date: new Date().toISOString().slice(0, 10),
  });
  return cloneEquipmentItem(updated);
}

export function completeMaintenanceInStore(id: string, input: EquipmentQuantityActionInput): EquipmentItem {
  const item = findEquipment(id);
  if (input.quantity > item.inMaintenance) throw new Error("Quantity exceeds items in maintenance.");
  const updated = cloneEquipmentItem({
    ...item,
    available: item.available + input.quantity,
    inMaintenance: item.inMaintenance - input.quantity,
    condition: syncCondition({
      ...item,
      available: item.available + input.quantity,
      inMaintenance: item.inMaintenance - input.quantity,
    }),
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  equipmentStore = equipmentStore.map((e) => (e.id === id ? updated : e));
  pushTransaction({
    equipmentId: id,
    equipmentName: item.name,
    type: "maintenance_complete",
    quantity: input.quantity,
    notes: input.notes,
    date: new Date().toISOString().slice(0, 10),
  });
  return cloneEquipmentItem(updated);
}

export function recordPurchaseInStore(id: string, input: EquipmentPurchaseInput): EquipmentItem {
  const item = findEquipment(id);
  const updated = cloneEquipmentItem({
    ...item,
    quantity: item.quantity + input.quantity,
    available: item.available + input.quantity,
    cost: item.cost + input.cost,
    vendor: input.vendor.trim() || item.vendor,
    supplierId: input.supplierId ?? item.supplierId,
    purchaseDate: input.date,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  equipmentStore = equipmentStore.map((e) => (e.id === id ? updated : e));
  pushTransaction({
    equipmentId: id,
    equipmentName: item.name,
    type: "purchase",
    quantity: input.quantity,
    cost: input.cost,
    vendor: input.vendor,
    notes: input.notes,
    date: input.date,
  });
  return cloneEquipmentItem(updated);
}
