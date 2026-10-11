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
      testMatch:
        /admin-(auth-boundaries|documents-certificates-safe)\.spec\.ts|platform-templates-integration\.gated\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4181" },
    },
    {
      name: "nexus",
      testMatch: /nexus-(auth-boundaries|certificate-catalog-safe)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4182" },
    },
    {
      name: "connect",
      testMatch: /connect-(auth-boundaries|verify-certificate-safe)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4183" },
    },
    {
      name: "transport",
      testMatch: /transport-auth-boundaries\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4184" },
    },
    {
      name: "transport-workflow",
      testMatch: /transport-pickup-drop-workflow\.spec\.ts/,
      timeout: 180_000,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:4184",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        trace: "retain-on-failure",
        permissions: ["geolocation", "notifications"],
        geolocation: { latitude: 17.385, longitude: 78.4867 },
        actionTimeout: 45_000,
        navigationTimeout: 60_000,
      },
    },
    {
      name: "transport-admin-integration",
      testMatch: /transport-admin-integration\.spec\.ts/,
      timeout: 240_000,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:4184",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        trace: "retain-on-failure",
        permissions: ["geolocation", "notifications"],
        geolocation: { latitude: 17.385, longitude: 78.4867 },
        actionTimeout: 45_000,
        navigationTimeout: 60_000,
      },
    },
    {
      name: "transport-phase3",
      testMatch: /transport-phase3-enrollment-trip\.spec\.ts/,
      timeout: 300_000,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:4184",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        trace: "retain-on-failure",
        permissions: ["geolocation", "notifications"],
        geolocation: { latitude: 17.385, longitude: 78.4867 },
        actionTimeout: 45_000,
        navigationTimeout: 60_000,
      },
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
        // Dual-read stays OFF for mocked catalog journeys (never enable prod cutover here).
        VITE_NEXUS_TEMPLATE_DB_CATALOG: "false",
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
