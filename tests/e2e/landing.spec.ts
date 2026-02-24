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
		await expect(page.getByText("Up to 3 active QR codes")).toBeVisible();
		await expect(page.getByText("Up to 100 active QR codes")).toBeVisible();
		await expect(page.getByText("Unlimited active QR codes")).toBeVisible();
		await expect(page.getByText("Coming soon").first()).toBeVisible();
	});

	test("opens QR builder preview modal and validates destination URL", async ({
		isMobile,
		page,
	}) => {
		await page.goto("/");
		const modalHeading = page.getByRole("heading", {
			name: "QR builder preview",
		});
		const openBuilderButton = page.getByRole("button", {
			name: "Check out our QR builder",
		});
		for (let attempt = 0; attempt < 5; attempt += 1) {
			if (isMobile) {
				await openBuilderButton.tap();
			} else {
				await openBuilderButton.click();
			}
			try {
				await expect(modalHeading).toBeVisible({ timeout: 2_000 });
				break;
			} catch {
				// Keep retrying until hydration catches up.
			}
		}

		await expect(modalHeading).toBeVisible({ timeout: 10_000 });

		const destinationInput = page.getByLabel("Destination URL");
		await expect(page.getByText("https://easyaccessqr.com")).toBeVisible();

		await destinationInput.fill("https://example.com/preview");
		await page.getByRole("button", { name: "Create preview" }).click();
		await expect(page.getByText("https://example.com/preview")).toBeVisible();
	});
});
