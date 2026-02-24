import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("legal pages", () => {
	test("terms page renders updated branding and document sections", async ({
		page,
	}) => {
		await page.goto("/terms");

		await expect(
			page.getByRole("heading", { name: "Terms of service" }),
		).toBeVisible();
		await expect(page.getByText("Easy Access QR").first()).toBeVisible();
		await expect(page.getByText("Effective date:")).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Terms of service" }).last(),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Privacy policy" }).last(),
		).toBeVisible();
	});

	test("privacy page renders updated branding and footer", async ({ page }) => {
		await page.goto("/privacy");

		await expect(
			page.getByRole("heading", { name: "Privacy policy" }),
		).toBeVisible();
		await expect(page.getByText("Easy Access QR").first()).toBeVisible();
		await expect(page.getByText("Contact:")).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Terms of service" }).last(),
		).toBeVisible();
	});
});
