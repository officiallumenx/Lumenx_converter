import { describe, expect, it } from "vitest";
import { sanitizePersistedQueryClient } from "./sanitize-persisted";

describe("sanitizePersistedQueryClient", () => {
  it("strips signed photo URLs but keeps asset paths", () => {
    const input = {
      clientState: {
        queries: [
          {
            state: {
              data: {
                profile: {
                  photoAssetPath: "inst/students/a.jpg",
                  photoSignedUrl:
                    "https://xyz.supabase.co/storage/v1/object/sign/photos/a.jpg?token=abc",
                  photoUrl:
                    "https://xyz.supabase.co/storage/v1/object/sign/photos/a.jpg?token=abc",
                  name: "Kid A",
                },
              },
            },
          },
        ],
      },
    };
    const out = sanitizePersistedQueryClient(input) as typeof input;
    const profile = out.clientState.queries[0]!.state.data.profile;
    expect(profile.photoAssetPath).toBe("inst/students/a.jpg");
    expect(profile.photoSignedUrl).toBeNull();
    expect(profile.photoUrl).toBeNull();
    expect(profile.name).toBe("Kid A");
  });

  it("nulls URLs when photoExpiresAt is past", () => {
    const out = sanitizePersistedQueryClient(
      {
        avatar: "https://cdn.example.com/x.jpg?sig=1",
        photoExpiresAt: "2020-01-01T00:00:00.000Z",
      },
      Date.parse("2026-10-09T00:00:00.000Z"),
    ) as { avatar: string | null };
    expect(out.avatar).toBeNull();
  });
});
