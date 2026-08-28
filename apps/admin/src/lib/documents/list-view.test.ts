import { describe, expect, it } from "vitest";
import {
  resolveDocumentsGeneratedListView,
  resolveDocumentsTemplatesListView,
} from "./list-view";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("documents list-view", () => {
  it("returns demo rows in demo mode", () => {
    const view = resolveDocumentsTemplatesListView({
      apiMode: false,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: INST,
      storedItems: [],
      storedStatus: "demo",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.status).toBe("demo");
  });

  it("blocks while institute is loading", () => {
    const view = resolveDocumentsGeneratedListView({
      apiMode: true,
      instituteStatus: "loading",
      activeInstituteId: INST,
      resolvedForInstituteId: null,
      storedItems: [],
      storedStatus: "loading",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
    expect(view.status).toBe("loading");
  });

  it("returns stored items when institute matches", () => {
    const view = resolveDocumentsTemplatesListView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: INST,
      storedItems: [],
      storedStatus: "empty",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(true);
    expect(view.status).toBe("empty");
  });
});
