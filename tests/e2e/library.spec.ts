import { expect, type Page, test } from "@playwright/test";

async function mutate(page: Page, procedure: string, input: unknown) {
	return page.request.post(`/api/trpc/qrCodes.${procedure}`, {
		data: { json: input },
	});
}
async function codes(page: Page) {
	const response = await page.request.get("/api/trpc/qrCodes.list", {
		params: { input: JSON.stringify({ json: { includeInactive: true } }) },
	});
	expect(response.ok()).toBe(true);
	const body = await response.json();
	return body.result.data.json as Array<{
		id: number;
		name: string;
		isActive: boolean;
		isPublic: boolean;
		tags: string[];
	}>;
}
test("manages selected codes, protects organization boundaries, and paginates", async ({
	page,
	browserName,
}, testInfo) => {
	test.setTimeout(90_000);
	const suffix = `${testInfo.project.name}-${Date.now()}-${testInfo.retry}`;
	await page.goto("/auth/sign-up");
	await page.getByLabel("Name", { exact: true }).fill("Library QA");
	await page.getByLabel("Email").fill(`library-${suffix}@easyaccessqr.test`);
	await page.getByLabel("Password").fill("LibraryTest!123");
	await page.getByRole("button", { name: "Create Account" }).click();
	await page.waitForURL("**/app**");
	await page.getByLabel("Organization name").fill(`Library ${browserName}`);
	await page.getByLabel("Organization slug").fill(`library-${suffix}`);
	await page
		.getByRole("button", { name: "Create organization", exact: true })
		.click();
	await expect(
		page.getByRole("heading", { name: "Welcome to Easy Access QR" }),
	).toBeVisible();
	// Concurrent creation also exercises organization write locking and unique slugs.
	const created = await Promise.all(
		Array.from({ length: 12 }, (_, index) =>
			mutate(page, "create", {
				name: `Library ${String(index + 1).padStart(2, "0")}`,
				destinationUrl: "https://example.com",
				isActive: false,
				isPublic: false,
			}),
		),
	);
	for (const response of created)
		expect(response.ok(), await response.text()).toBe(true);
	const initial = await codes(page);
	expect(initial).toHaveLength(12);
	await page.goto("/app/qr-codes");
	await page.getByLabel("Codes per page").selectOption("10");
	await expect(page.getByTestId("qr-code-row")).toHaveCount(10);
	await page.getByRole("button", { name: "Next page" }).click();
	await expect(page.getByTestId("qr-code-row")).toHaveCount(2);
	await page.getByRole("button", { name: "Previous page" }).click();
	await page.getByLabel("Select this page").check();
	await expect(
		page.getByText("10 selected (max 100)", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: "Clear selection" }).click();
	await page.getByLabel("Search QR codes").fill("Library 01");
	await page.getByLabel("Select Library 01", { exact: true }).check();
	for (const action of [
		"resume",
		"pause",
		"public",
		"private",
		"add-tag",
		"remove-tag",
	]) {
		await page.getByLabel("Bulk action").selectOption(action);
		if (action.endsWith("tag"))
			await page.getByLabel("Bulk tag").fill("launch");
		await page.getByRole("button", { name: "Apply to selected" }).click();
		await expect(page.getByRole("dialog")).toContainText("Library 01");
		await page.getByRole("button", { name: "Confirm update" }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		const code = (await codes(page)).find((code) => code.name === "Library 01");
		if (!code) throw new Error("Expected Library 01 to exist");
		if (action === "resume" || action === "pause")
			expect(code.isActive).toBe(action === "resume");
		if (action === "public" || action === "private")
			expect(code.isPublic).toBe(action === "public");
		if (action.endsWith("tag"))
			expect(code.tags.includes("launch")).toBe(action === "add-tag");
		await page.getByLabel("Select Library 01", { exact: true }).check();
	}
	// Copy is one line per selected tracked short URL.
	await page.evaluate(() => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				writeText: async (value: string) => {
					document.body.dataset.copiedLinks = value;
				},
			},
		});
	});
	await page.getByRole("button", { name: "Copy selected links" }).click();
	await expect(page.locator("body")).toHaveAttribute(
		"data-copied-links",
		new RegExp(`/r/library-${suffix}/library-01$`),
	);
	await page.getByRole("button", { name: "Reset", exact: true }).click();
	await page.getByText("More filters", { exact: true }).click();
	await page
		.getByRole("combobox", { name: "Public page", exact: true })
		.selectOption("public");
	await expect(
		page.getByText("No matching QR codes", { exact: true }),
	).toBeVisible();
	await page
		.getByRole("combobox", { name: "Public page", exact: true })
		.selectOption("private");
	await page
		.getByRole("combobox", { name: "Routing", exact: true })
		.selectOption("weighted");
	await expect(
		page.getByText("No matching QR codes", { exact: true }),
	).toBeVisible();
	await page
		.getByRole("combobox", { name: "Routing", exact: true })
		.selectOption("single");
	await page
		.getByRole("combobox", { name: "Scan activity", exact: true })
		.selectOption("scanned");
	await expect(
		page.getByText("No matching QR codes", { exact: true }),
	).toBeVisible();
	await page
		.getByRole("combobox", { name: "Scan activity", exact: true })
		.selectOption("never");
	await expect(page.getByTestId("qr-code-row")).toHaveCount(10);
	// Starter allows 3 active codes. A failed batch must leave every code paused.
	const overLimit = await mutate(page, "bulkUpdate", {
		ids: initial.slice(0, 4).map((code) => code.id),
		action: "resume",
	});
	expect(overLimit.ok()).toBe(false);
	expect((await codes(page)).every((code) => !code.isActive)).toBe(true);
	// Two concurrent valid-looking batches cannot exceed the limit together.
	const concurrent = await Promise.all([
		mutate(page, "bulkUpdate", {
			ids: initial.slice(0, 2).map((code) => code.id),
			action: "resume",
		}),
		mutate(page, "bulkUpdate", {
			ids: initial.slice(2, 4).map((code) => code.id),
			action: "resume",
		}),
	]);
	expect(concurrent.filter((response) => response.ok())).toHaveLength(1);
	expect((await codes(page)).filter((code) => code.isActive)).toHaveLength(2);
	// QR id 1 belongs to the seeded organization, not this customer.
	const crossOrg = await mutate(page, "bulkUpdate", {
		ids: [initial[0].id, 1],
		action: "public",
	});
	expect(crossOrg.ok()).toBe(false);
	expect((await codes(page)).every((code) => !code.isPublic)).toBe(true);
	const maxTags = Array.from({ length: 12 }, (_, index) => `tag-${index}`);
	expect(
		(await mutate(page, "update", { id: initial[0].id, tags: maxTags })).ok(),
	).toBe(true);
	const tagOverflow = await mutate(page, "bulkUpdate", {
		ids: [initial[0].id, initial[1].id],
		action: "add-tag",
		tag: "overflow",
	});
	expect(tagOverflow.ok()).toBe(false);
	expect(
		(await codes(page)).every((code) => !code.tags.includes("overflow")),
	).toBe(true);
});
