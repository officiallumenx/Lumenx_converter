import type { Page } from "@playwright/test";

export async function blockApiWrites(page: Page): Promise<string[]> {
  const writes: string[] = [];
  await page.route((url) => url.pathname.startsWith("/api/v1/"), async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      writes.push(`${request.method()} ${request.url()}`);
    }
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "UNAUTHENTICATED",
          message: "Mocked signed-out browser boundary",
        },
      }),
    });
  });
  return writes;
}
