import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "admin",
      testMatch: /admin-auth-boundaries\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4181" },
    },
    {
      name: "nexus",
      testMatch: /nexus-auth-boundaries\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4182" },
    },
    {
      name: "connect",
      testMatch: /connect-auth-boundaries\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4183" },
    },
    {
      name: "transport",
      testMatch: /transport-auth-boundaries\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4184" },
    },
    {
      name: "admissions",
      testMatch: /admissions-auth-boundaries\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4185" },
    },
    {
      name: "careers",
      testMatch: /careers-auth-boundaries\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4186" },
    },
  ],
  webServer: [
    {
      command:
        "npm run dev --workspace=@lumenx/app-admin -- --host 127.0.0.1 --port 4181",
      url: "http://127.0.0.1:4181/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_ADMIN_AUTH_MODE: "api",
        VITE_E2E_SAFE_AUTH: "1",
        VITE_AUTH_PROVIDER: "supabase",
        VITE_API_BASE_URL: "http://127.0.0.1:4181",
      },
    },
    {
      command:
        "npm run dev --workspace=@lumenx/app-nexus -- --host 127.0.0.1 --port 4182",
      url: "http://127.0.0.1:4182/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_NEXUS_AUTH_MODE: "api",
        VITE_E2E_SAFE_AUTH: "1",
        VITE_AUTH_PROVIDER: "supabase",
        VITE_API_BASE_URL: "http://127.0.0.1:4182",
      },
    },
    {
      command:
        "npm run dev --workspace=@lumenx/app-connect -- --host 127.0.0.1 --port 4183",
      url: "http://127.0.0.1:4183/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_CONNECT_AUTH_MODE: "api",
        VITE_AUTH_PROVIDER: "supabase",
        VITE_API_BASE_URL: "http://127.0.0.1:4183",
      },
    },
    {
      command:
        "npm run dev --workspace=@lumenx/app-transport -- --host 127.0.0.1 --port 4184",
      url: "http://127.0.0.1:4184/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_TRANSPORT_AUTH_MODE: "api",
        VITE_AUTH_PROVIDER: "supabase",
        VITE_API_BASE_URL: "http://127.0.0.1:4184",
      },
    },
    {
      command:
        "npm run dev --workspace=@lumenx/app-admissions -- --host 127.0.0.1 --port 4185",
      url: "http://127.0.0.1:4185/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_ADMISSIONS_AUTH_MODE: "api",
        VITE_AUTH_PROVIDER: "supabase",
        VITE_API_BASE_URL: "http://127.0.0.1:4185",
      },
    },
    {
      command:
        "npm run dev --workspace=@lumenx/app-careers -- --host 127.0.0.1 --port 4186",
      url: "http://127.0.0.1:4186/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_CAREERS_AUTH_MODE: "api",
        VITE_AUTH_PROVIDER: "supabase",
        VITE_API_BASE_URL: "http://127.0.0.1:4186",
      },
    },
  ].filter(
    (server) =>
      !process.env.E2E_APP ||
      server.command.includes(`@lumenx/app-${process.env.E2E_APP}`),
  ),
});
