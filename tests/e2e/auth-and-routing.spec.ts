import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("auth pages and unauthenticated routing", () => {
	test("sign in page renders with current branding and links", async ({
		page,
	}) => {
		await page.goto("/auth/sign-in");

		await expect(page.getByText("Easy Access QR").first()).toBeVisible();
		await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Forgot password?" }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Create account" }),
		).toBeVisible();
	});

	test("reset password route without token shows invalid state", async ({
		page,
	}) => {
		await page.goto("/auth/reset-password");

		await expect(
			page.getByText("Invalid or expired reset link."),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Request New Link" }),
		).toBeVisible();
	});

	test("unknown route renders 404", async ({ page }) => {
		await page.goto("/this-route-does-not-exist");

		await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
		await expect(page.getByText("Page Not Found")).toBeVisible();
		await expect(page.getByRole("link", { name: "Go Home →" })).toBeVisible();
	});

	test("app route redirects unauthenticated users to sign in", async ({
		page,
	}) => {
		await page.goto("/app");
		await page.waitForURL("**/auth/sign-in**");
		await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
	});
});
