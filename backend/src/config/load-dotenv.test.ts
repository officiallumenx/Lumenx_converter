import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadLumenxDotenv } from "./load-dotenv.js";

const STAGING_KEYS = [
  "LUMENX_ENV",
  "LUMENX_DOTENV",
  "STAGING_CONFIRMED",
  "STAGING_SUPABASE_PROJECT_REF",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST",
  "HOSTED_ONLY_MARKER",
  "LOG_LEVEL",
] as const;

describe("loadLumenxDotenv", () => {
  let cwd: string;
  const saved: Partial<Record<(typeof STAGING_KEYS)[number], string | undefined>> =
    {};

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "lumenx-dotenv-"));
    for (const key of STAGING_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of STAGING_KEYS) {
      const prev = saved[key];
      if (prev === undefined) delete process.env[key];
      else process.env[key] = prev;
    }
    rmSync(cwd, { recursive: true, force: true });
  });

  it("hosted staging boots from process.env without .env.staging", () => {
    process.env.LUMENX_ENV = "staging";
    process.env.HOSTED_ONLY_MARKER = "from-railway";
    process.env.SUPABASE_URL = "https://yveadybpntziyryxsrsu.supabase.co";

    const result = loadLumenxDotenv(cwd);

    expect(result).toEqual({
      mode: "staging",
      path: null,
      stagingSource: "process_env",
    });
    expect(process.env.HOSTED_ONLY_MARKER).toBe("from-railway");
    expect(process.env.SUPABASE_URL).toBe(
      "https://yveadybpntziyryxsrsu.supabase.co",
    );
  });

  it("local staging loads .env.staging when present (fills missing keys only)", () => {
    process.env.LUMENX_ENV = "staging";
    process.env.SUPABASE_ANON_KEY = "injected-anon-wins";
    writeFileSync(
      join(cwd, ".env.staging"),
      [
        "SUPABASE_ANON_KEY=file-anon-should-not-win",
        "SUPABASE_SERVICE_ROLE_KEY=file-service",
        "STAGING_SUPABASE_PROJECT_REF=yveadybpntziyryxsrsu",
      ].join("\n"),
      "utf8",
    );

    const result = loadLumenxDotenv(cwd);

    expect(result.mode).toBe("staging");
    expect(result.stagingSource).toBe("file");
    expect(result.path).toBe(join(cwd, ".env.staging"));
    expect(process.env.SUPABASE_ANON_KEY).toBe("injected-anon-wins");
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe("file-service");
    expect(process.env.STAGING_SUPABASE_PROJECT_REF).toBe("yveadybpntziyryxsrsu");
  });

  it("throws when LUMENX_DOTENV points at a missing file", () => {
    process.env.LUMENX_ENV = "staging";
    process.env.LUMENX_DOTENV = join(cwd, "missing.env.staging");

    expect(() => loadLumenxDotenv(cwd)).toThrow(/Staging dotenv file not found/);
  });

  it("default mode never requires .env.staging and does not load it", () => {
    writeFileSync(
      join(cwd, ".env.staging"),
      "SUPABASE_URL=https://should-not-load.supabase.co\n",
      "utf8",
    );
    writeFileSync(join(cwd, ".env"), "LOG_LEVEL=warn\n", "utf8");

    const result = loadLumenxDotenv(cwd);

    expect(result.mode).toBe("default");
    expect(result.path).toBe(join(cwd, ".env"));
    expect(process.env.SUPABASE_URL).toBeUndefined();
    expect(process.env.LOG_LEVEL).toBe("warn");
  });

  it("does not create or package a staging env file", () => {
    process.env.LUMENX_ENV = "staging";
    mkdirSync(join(cwd, "dist"), { recursive: true });
    loadLumenxDotenv(cwd);
    expect(existsSync(join(cwd, ".env.staging"))).toBe(false);
    expect(existsSync(join(cwd, "dist", ".env.staging"))).toBe(false);
  });
});
