import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
	await page.goto("/auth/sign-in");
	await page.getByLabel("Email").fill("owner@easyaccessqr.com");
	await page.getByLabel("Password").fill("EasyAccessQR!123");
	await page.getByRole("button", { name: "Sign In" }).click();
	await page.waitForURL("**/app**");

	const workspaceButton = page.getByRole("button", {
		name: /Nearby Labs nearby-labs/,
	});
	const dashboardHeading = page.getByRole("heading", { name: "Dashboard" });
	await expect(workspaceButton.or(dashboardHeading)).toBeVisible({
		timeout: 15_000,
	});
	if (await workspaceButton.isVisible()) {
		await workspaceButton.click();
	}

	await expect(dashboardHeading).toBeVisible({
		timeout: 15_000,
	});
}

test.describe("authenticated workspace", () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test("shows dashboard data and complete settings navigation", async ({
		page,
	}) => {
		await expect(page.getByText("Total views", { exact: true })).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Recent QR codes" }),
		).toBeVisible();

		await page.goto("/app/settings");
		const settingsMain = page.getByRole("main");
		await expect(
			settingsMain.getByRole("link", { name: /Profile Public bio/ }),
		).toBeVisible();
		await expect(
			settingsMain.getByRole("link", { name: /People Members & access/ }),
		).toBeVisible();
		await expect(
			settingsMain.getByRole("link", { name: /Security Password & sessions/ }),
		).toBeVisible();
		await expect(
			settingsMain.getByRole("link", { name: /Billing Plan & payment/ }),
		).toBeVisible();
	});

	test("filters analytics to a single QR code", async ({ page }) => {
		await page.goto("/app/analytics");
		await page.getByLabel("QR code").selectOption({
			label: "Spring launch landing",
		});

		await expect(page.getByText("29 Views In Range")).toBeVisible();
		await expect(page.getByText("Primary", { exact: true })).toBeVisible();
		await expect(page.getByText("Variant B", { exact: true })).toBeVisible();
	});

	test("asks for confirmation before destructive actions", async ({ page }) => {
		await page.goto("/app/qr-codes");
		await page
			.getByRole("button", { name: "Actions for Paused event poster" })
			.click();
		await page.getByRole("menuitem", { name: "Delete" }).click();
		await expect(
			page.getByRole("heading", { name: "Delete QR code?" }),
		).toBeVisible();
		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(
			page.getByText("Paused event poster", { exact: true }),
		).toBeVisible();

		await page.goto("/app/settings/members");
		await page
			.getByRole("button", { name: "Deactivate Analytics Member" })
			.click();
		await expect(
			page.getByRole("heading", { name: "Deactivate member?" }),
		).toBeVisible();
		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByText("Analytics Member")).toBeVisible();
	});

	test("creates, exports, and publishes a weighted QR code", async ({
		isMobile,
		page,
	}) => {
		test.skip(
			isMobile,
			"One shared database mutation is enough for this flow.",
		);

		await page.goto("/app/qr-codes/new");
		await page.getByLabel("Campaign name").fill("Automated QA campaign");
		await page
			.getByLabel("Destination 1 URL")
			.fill("https://example.com/primary");
		await page.getByRole("button", { name: "Add destination" }).click();
		await page
			.getByLabel("Destination 2 URL")
			.fill("https://example.com/secondary");
		await page.getByRole("checkbox", { name: /Public QR page/ }).check();
		await page.getByRole("button", { name: "Create" }).click();

		await page.waitForURL("**/app/qr-codes/**/edit");
		await expect(
			page.getByRole("heading", { name: "Edit QR code" }),
		).toBeVisible();

		const pngButton = page.getByRole("button", { name: "PNG" });
		await expect(pngButton).toBeEnabled({ timeout: 15_000 });
		const downloadPromise = page.waitForEvent("download");
		await pngButton.click();
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(
			/automated-qa-campaign.*\.png$/,
		);

		await page.goto("/r/nearby-labs/automated-qa-campaign?view=1");
		await expect(
			page.getByRole("heading", { name: "Automated QA campaign" }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Open tracked link" }),
		).toBeVisible();
	});
});
