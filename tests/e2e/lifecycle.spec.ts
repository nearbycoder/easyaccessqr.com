import { expect, test } from "@playwright/test";

const accountEmail = "lifecycle.qa@easyaccessqr.test";
const initialPassword = "Lifecycle!123";
const updatedPassword = "Lifecycle!456";
const organizationSlug = "lifecycle-workspace";
const qrSlug = "lifecycle-qr";

test("completes a new customer lifecycle across every mutable feature", async ({
	isMobile,
	page,
}) => {
	test.setTimeout(90_000);
	test.skip(
		isMobile,
		"The mutation lifecycle runs once against the shared database.",
	);

	await page.goto("/auth/forgot-password");
	await page.getByLabel("Email").fill("unknown-user@easyaccessqr.test");
	await page.getByRole("button", { name: "Send Reset Link" }).click();
	await expect(
		page.getByText(/check your email for the reset link/i),
	).toBeVisible();

	await page.goto("/auth/sign-up");
	await page.getByLabel("Name").fill("Lifecycle QA");
	await page.getByLabel("Email").fill(accountEmail);
	await page.getByLabel("Password").fill(initialPassword);
	await page.getByRole("button", { name: "Create Account" }).click();
	await page.waitForURL("**/app**");
	await expect(
		page.getByRole("heading", { name: "Create organization" }),
	).toBeVisible();

	await page.getByLabel("Organization name").fill("Lifecycle Workspace");
	await page.getByLabel("Organization slug").fill(organizationSlug);
	await page.getByRole("button", { name: "Create organization" }).click();
	await expect(
		page.getByRole("heading", { name: "Welcome to Easy Access QR" }),
	).toBeVisible({ timeout: 15_000 });

	await page.goto("/app/settings/profile");
	await page
		.getByLabel("Bio")
		.fill("Runs end-to-end product verification for QR campaigns.");
	await page.getByRole("button", { name: "Save bio" }).click();
	await expect(page.getByText("Profile updated")).toBeVisible();

	await page.goto("/app/settings/members");
	await page
		.getByLabel("Member email")
		.fill("invited.lifecycle@easyaccessqr.test");
	await page.getByRole("button", { name: "Invite" }).click();
	await expect(
		page.getByText(
			"Success: Invitation created for invited.lifecycle@easyaccessqr.test",
		),
	).toBeVisible();

	await page.goto("/app/settings/billing");
	await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
	await expect(page.getByText(/Paid plans are coming soon/)).toBeVisible();

	await page.goto("/app/qr-codes/new");
	await page.getByLabel("Campaign name").fill("Lifecycle QR");
	await page
		.getByLabel("Destination 1 URL")
		.fill("https://example.com/lifecycle-primary");
	await page.getByRole("button", { name: "Add destination" }).click();
	await page.getByLabel("Destination 2 label").fill("Secondary");
	await page
		.getByLabel("Destination 2 URL")
		.fill("https://example.com/lifecycle-secondary");
	await page.getByRole("checkbox", { name: /Public QR page/ }).check();
	await page.getByRole("button", { name: "Create" }).click();
	await page.waitForURL("**/app/qr-codes/**/edit");
	await expect(
		page.getByRole("heading", { name: "Edit QR code" }),
	).toBeVisible();

	await page
		.getByLabel("Destination 1 URL")
		.fill("https://example.com/lifecycle-updated");
	await page.getByRole("button", { name: "Save changes" }).click();
	await expect(page.getByText("QR code updated")).toBeVisible();

	for (const extension of ["PNG", "SVG", "JPEG"] as const) {
		const exportButton = page.getByRole("button", { name: extension });
		await expect(exportButton).toBeEnabled({ timeout: 15_000 });
		const downloadPromise = page.waitForEvent("download");
		await exportButton.click();
		const download = await downloadPromise;
		expect(download.suggestedFilename().toLowerCase()).toMatch(
			new RegExp(`lifecycle-qr.*\\.${extension.toLowerCase()}$`),
		);
	}

	await page.goto(`/r/${organizationSlug}/${qrSlug}?view=1`);
	await expect(
		page.getByRole("heading", { name: "Lifecycle QR" }),
	).toBeVisible();

	const trackedResponse = await page.request.get(
		`/r/${organizationSlug}/${qrSlug}`,
		{ maxRedirects: 0 },
	);
	expect([302, 307, 308]).toContain(trackedResponse.status());
	expect(trackedResponse.headers().location).toMatch(
		/^https:\/\/example\.com\/lifecycle-(updated|secondary)$/,
	);

	await page.goto("/app/analytics");
	await page.getByLabel("QR code").selectOption({ label: "Lifecycle QR" });
	await expect(page.getByText("1 Views In Range")).toBeVisible();

	await page.goto("/app/qr-codes");
	await page.getByRole("button", { name: "Actions for Lifecycle QR" }).click();
	await page.getByRole("menuitem", { name: "Pause" }).click();
	await expect(page.getByText(/2 weighted destinations.*Paused/)).toBeVisible();

	const pausedResponse = await page.request.get(
		`/r/${organizationSlug}/${qrSlug}`,
		{ maxRedirects: 0 },
	);
	expect(pausedResponse.status()).toBe(410);
	expect(await pausedResponse.text()).toContain("This QR link is paused");

	await page.getByRole("button", { name: "Actions for Lifecycle QR" }).click();
	await page.getByRole("menuitem", { name: "Resume" }).click();
	await expect(page.getByText(/2 weighted destinations.*Active/)).toBeVisible();

	await page.goto("/app/settings/security");
	await page
		.getByLabel("Current Password", { exact: true })
		.fill(initialPassword);
	await page.getByLabel("New Password", { exact: true }).fill(updatedPassword);
	await page
		.getByLabel("Confirm New Password", { exact: true })
		.fill(updatedPassword);
	await page.getByRole("button", { name: "Update password" }).click();
	const workspaceButton = page.getByRole("button", {
		name: "Lifecycle Workspace lifecycle-workspace",
	});
	await expect(workspaceButton).toBeVisible({ timeout: 15_000 });
	await workspaceButton.click();

	await page.goto("/app/qr-codes");
	const qrActions = page.getByRole("button", {
		name: "Actions for Lifecycle QR",
	});
	await expect(qrActions).toBeVisible({ timeout: 15_000 });
	await qrActions.click();
	await page.getByRole("menuitem", { name: "Delete" }).click();
	await page.getByRole("button", { name: "Delete permanently" }).click();
	await expect(page.getByText("QR code deleted")).toBeVisible();
	await expect(
		page.getByText("Lifecycle QR", { exact: true }),
	).not.toBeVisible();

	await page.getByRole("button", { name: /Lifecycle QA/ }).click();
	await page.getByRole("menuitem", { name: "Sign out" }).click();
	await page.waitForURL("**/");
	await page.goto("/auth/sign-in");
	await page.getByLabel("Email").fill(accountEmail);
	await page.getByLabel("Password").fill(updatedPassword);
	await page.getByRole("button", { name: "Sign In" }).click();
	await page.waitForURL("**/app**");
	await expect(
		page.getByRole("button", {
			name: "Lifecycle Workspace lifecycle-workspace",
		}),
	).toBeVisible();
});
