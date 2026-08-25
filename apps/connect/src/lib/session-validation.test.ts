import { describe, expect, it } from "vitest";
import { isRole, isThemeMode, parsePersistedUser } from "./session-validation";

describe("session-validation", () => {
  it("accepts known roles and themes", () => {
    expect(isRole("parent")).toBe(true);
    expect(isRole("teacher")).toBe(true);
    expect(isRole("student")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("system")).toBe(false);
  });

  it("parses valid persisted users and rejects malformed ones", () => {
    const valid = JSON.stringify({
      id: "u1",
      name: "Aarav",
      roles: ["parent", "teacher"],
      phone: "+91 90000 00000",
    });
    expect(parsePersistedUser(valid)?.id).toBe("u1");
    expect(parsePersistedUser(null)).toBeNull();
    expect(parsePersistedUser("{")).toBeNull();
    expect(parsePersistedUser(JSON.stringify({ id: 1, name: "x", roles: ["parent"] }))).toBeNull();
    expect(
      parsePersistedUser(JSON.stringify({ id: "u1", name: "x", roles: ["admin"] })),
    ).toBeNull();
  });
});
