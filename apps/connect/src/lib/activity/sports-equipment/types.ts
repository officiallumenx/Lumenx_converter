export type EquipmentCategoryId =
  | "balls"
  | "protective_gear"
  | "training"
  | "field_equipment"
  | "fitness"
  | "uniforms"
  | "other";

export type EquipmentCondition = "good" | "fair" | "damaged" | "under_maintenance" | "lost";

export type EquipmentStatus = "active" | "archived";

export type EquipmentTransactionType =
  | "issue"
  | "return"
  | "damage"
  | "loss"
  | "maintenance"
  | "maintenance_complete"
  | "purchase";

export interface EquipmentSupplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  categoryId: EquipmentCategoryId;
  quantity: number;
  available: number;
  issued: number;
  damaged: number;
  lost: number;
  inMaintenance: number;
  condition: EquipmentCondition;
  purchaseDate: string;
  cost: number;
  vendor: string;
  supplierId?: string;
  status: EquipmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentTransaction {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: EquipmentTransactionType;
  quantity: number;
  issuedTo?: string;
  issuedToType?: "team" | "student" | "coach";
  cost?: number;
  vendor?: string;
  notes?: string;
  date: string;
}

export interface EquipmentItemInput {
  name: string;
  categoryId: EquipmentCategoryId;
  quantity: number;
  condition: EquipmentCondition;
  purchaseDate: string;
  cost: number;
  vendor: string;
  supplierId?: string;
  notes?: string;
}

export interface EquipmentIssueInput {
  quantity: number;
  issuedTo: string;
  issuedToType: "team" | "student" | "coach";
  notes?: string;
}

export interface EquipmentQuantityActionInput {
  quantity: number;
  notes?: string;
}

export interface EquipmentPurchaseInput {
  quantity: number;
  cost: number;
  vendor: string;
  supplierId?: string;
  date: string;
  notes?: string;
}

export type EquipmentViewTab =
  | "inventory"
  | "issued"
  | "damaged"
  | "lost"
  | "maintenance"
  | "purchases"
  | "stock"
  | "suppliers";

export type EquipmentSortField = "name" | "updatedAt" | "available";

export interface EquipmentListFilters {
  query?: string;
  categoryId?: EquipmentCategoryId | "all";
  condition?: EquipmentCondition | "all";
  status?: EquipmentStatus | "all";
  supplierId?: string | "all";
  sortBy?: EquipmentSortField;
  sortDir?: "asc" | "desc";
}

export interface EquipmentStockSummary {
  totalItems: number;
  totalQuantity: number;
  totalAvailable: number;
  totalIssued: number;
  totalDamaged: number;
  totalLost: number;
  totalInMaintenance: number;
  lowStockCount: number;
}

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategoryId, string> = {
  balls: "Balls",
  protective_gear: "Protective Gear",
  training: "Training Equipment",
  field_equipment: "Field Equipment",
  fitness: "Fitness",
  uniforms: "Uniforms",
  other: "Other",
};

export const EQUIPMENT_CONDITION_LABELS: Record<EquipmentCondition, string> = {
  good: "Good",
  fair: "Fair",
  damaged: "Damaged",
  under_maintenance: "Under Maintenance",
  lost: "Lost",
};

export const EQUIPMENT_TRANSACTION_LABELS: Record<EquipmentTransactionType, string> = {
  issue: "Issued",
  return: "Returned",
  damage: "Marked Damaged",
  loss: "Marked Lost",
  maintenance: "Sent to Maintenance",
  maintenance_complete: "Maintenance Complete",
  purchase: "Purchase",
};

export const EQUIPMENT_VIEW_TAB_LABELS: Record<EquipmentViewTab, string> = {
  inventory: "Inventory",
  issued: "Issued",
  damaged: "Damaged",
  lost: "Lost",
  maintenance: "Maintenance",
  purchases: "Purchase History",
  stock: "Stock Levels",
  suppliers: "Suppliers",
};
