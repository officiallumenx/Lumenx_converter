import { describe, it, expect } from "vitest";
import { aggregateUsageRows } from "./aggregate.js";
import type { StoredAssetRow } from "../src/domains/assets/types.js";

function row(partial: Partial<StoredAssetRow> & Pick<StoredAssetRow, "id" | "institute_id">): StoredAssetRow {
  return {
    bucket: "institute-branding",
    object_path: "x",
    category: "logo",
    file_name: "x.png",
    content_type: "image/png",
    byte_size: 100,
    checksum: null,
    visibility: "institute",
    status: "active",
    linked_entity_kind: null,
    linked_entity_id: null,
    owner_user_id: null,
    created_by_user_id: "u",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
    ...partial,
  };
}

describe("aggregateUsageRows", () => {
  it("sums bytes and groups by category and bucket", () => {
    const agg = aggregateUsageRows([
      row({ id: "1", institute_id: "i", category: "logo", bucket: "institute-branding", byte_size: 100 }),
      row({ id: "2", institute_id: "i", category: "other", bucket: "generated-documents", byte_size: 250 }),
    ]);
    expect(agg.totalAssets).toBe(2);
    expect(agg.totalBytes).toBe(350);
    expect(agg.byCategory).toHaveLength(2);
    expect(agg.byBucket).toHaveLength(2);
  });
});
