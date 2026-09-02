import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { ASSET_COLS } from "../assets/repository.js";
import type { StoredAssetRow } from "../assets/types.js";

const USAGE_COLS = ASSET_COLS;

export async function listActiveAssetsForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<StoredAssetRow[]> {
  const result = await admin
    .from("stored_asset")
    .select(USAGE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as StoredAssetRow[];
}

export async function listActiveAssetsAll(
  admin: SupabaseClient,
): Promise<StoredAssetRow[]> {
  const result = await admin
    .from("stored_asset")
    .select(USAGE_COLS)
    .is("deleted_at", null);
  return ensureDbOk(result) as StoredAssetRow[];
}
