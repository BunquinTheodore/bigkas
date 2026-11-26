import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  reporter: "line",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["microphone"],
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            // Drawing 3D in many headless pages at once is very slow. tests/e2e/orb.spec.ts turns it on.
            "--disable-3d-apis",
          ],
        },
      },
    },
    { name: "webkit", use: { ...devices["iPhone 15"] }, grep: /@upload/ },
  ],
});
