import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("mobile marketing navigation opens and exposes every destination", async ({
	isMobile,
	page,
}) => {
	test.skip(
		!isMobile,
		"This interaction is only visible at mobile breakpoints.",
	);

	await page.goto("/");
	await page.getByRole("button", { name: "Open navigation menu" }).click();

	const mobileNavigation = page.getByRole("navigation", {
		name: "Mobile navigation",
	});
	await expect(
		mobileNavigation.getByRole("link", { name: "Features" }),
	).toBeVisible();
	await expect(
		mobileNavigation.getByRole("link", { name: "Product" }),
	).toBeVisible();
	await expect(
		mobileNavigation.getByRole("link", { name: "Billing" }),
	).toBeVisible();
	await expect(
		mobileNavigation.getByRole("link", { name: "Terms" }),
	).toBeVisible();
	await expect(
		mobileNavigation.getByRole("link", { name: "Privacy" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Use dark theme" }),
	).toBeVisible();

	await mobileNavigation.getByRole("link", { name: "Privacy" }).click();
	await expect(page).toHaveURL(/\/privacy$/);
});
