import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("landing page", () => {
	test("shows core sections and pricing", async ({ page }) => {
		await page.goto("/");

		await expect(
			page.getByRole("heading", { name: "QR campaigns, managed clearly." }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Built for focused teams" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Billing that scales with usage" }),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Create free account" }),
		).toBeVisible();
	});

	test("opens QR builder preview modal and validates destination URL", async ({
		page,
	}) => {
		await page.goto("/");
		await page.getByRole("button", { name: "Check out QR builder" }).click();

		await expect(
			page.getByRole("heading", { name: "QR builder preview" }),
		).toBeVisible();

		const destinationInput = page.getByLabel("Destination URL");
		await expect(page.getByText("https://easyaccessqr.com")).toBeVisible();

		await destinationInput.fill("https://example.com/preview");
		await page.getByRole("button", { name: "Create preview" }).click();
		await expect(page.getByText("https://example.com/preview")).toBeVisible();
	});
});
