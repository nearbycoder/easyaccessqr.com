import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

async function signIn(page: Page) {
	await page.goto("/auth/sign-in");
	await page.getByLabel("Email").fill("owner@easyaccessqr.com");
	await page.getByLabel("Password").fill("EasyAccessQR!123");
	await page.getByRole("button", { name: "Sign In", exact: true }).click();
	await page.waitForURL("**/app**");
	const choose = page.getByRole("heading", { name: "Choose organization" });
	const dashboard = page.getByRole("heading", {
		name: "Dashboard",
		exact: true,
	});
	await expect(choose.or(dashboard)).toBeVisible();
	if (await choose.isVisible()) {
		await page
			.getByRole("button", { name: "Nearby Labs nearby-labs", exact: true })
			.click();
		await expect(dashboard).toBeVisible();
	}
}

test("new formats, export assets, campaign tools, and managed handoff", async ({
	page,
}, testInfo) => {
	test.setTimeout(90_000);
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await signIn(page);
	const organizationSlug = `handoff-${testInfo.project.name}-${Date.now()}`;
	const origin = new URL(page.url()).origin;
	const organizationResponse = await page.request.post(
		"/api/auth/organization/create",
		{
			headers: { Origin: origin },
			data: { name: "Campaign export QA", slug: organizationSlug },
		},
	);
	expect(organizationResponse.ok()).toBe(true);
	const organization = await organizationResponse.json();
	const activateResponse = await page.request.post(
		"/api/auth/organization/set-active",
		{
			headers: { Origin: origin },
			data: { organizationId: organization.id },
		},
	);
	expect(activateResponse.ok()).toBe(true);
	await page.goto("/app/toolkit");
	await page.getByText("Encoded content", { exact: true }).click();
	const cases: Array<{
		type: string;
		fields: Record<string, string>;
		expected: string;
	}> = [
		{
			type: "website",
			fields: { "Website URL": "https://example.com/shop?sku=42#buy" },
			expected: "https://example.com/shop?sku=42#buy",
		},
		{
			type: "place",
			fields: { "Place or address": "Café & Co, Chicago" },
			expected: "query=Caf%C3%A9+%26+Co%2C+Chicago",
		},
		{
			type: "social",
			fields: { "Profile handle": "@nearby" },
			expected: "https://www.instagram.com/nearby",
		},
		{
			type: "event",
			fields: {
				"Event title": "Fall launch",
				"Start time (UTC)": "2026-10-04T10:00",
				"End time (UTC)": "2026-10-04T11:00",
			},
			expected: "DTSTART:20261004T100000Z",
		},
	];
	for (const item of cases) {
		await page.getByLabel("QR type", { exact: true }).selectOption(item.type);
		for (const [label, value] of Object.entries(item.fields))
			await page.getByLabel(label, { exact: true }).fill(value);
		await expect(page.getByTestId("toolkit-payload")).toContainText(
			item.expected,
		);
		const button = page.getByRole("button", {
			name: "Download PNG",
			exact: true,
		});
		await expect(button).toBeEnabled();
		const download = page.waitForEvent("download");
		await button.click();
		await (await download).saveAs(testInfo.outputPath(`${item.type}.png`));
	}
	await page.getByLabel("QR type", { exact: true }).selectOption("website");
	await page
		.getByLabel("Website URL")
		.fill("https://example.com/shop?sku=42#buy");
	await page.getByLabel("Design preset").selectOption("teal");
	await expect(page.getByLabel("QR foreground")).toHaveValue("#205f5c");
	await page.getByLabel("Export resolution").selectOption("1200");
	await page.getByLabel("Export filename (optional)").fill("Fall Store Card");
	for (const extension of ["PNG", "SVG", "JPEG", "WEBP"]) {
		const button = page.getByRole("button", {
			name: `Download ${extension}`,
			exact: true,
		});
		await expect(button).toBeEnabled();
		const download = page.waitForEvent("download");
		await button.click();
		const asset = await download;
		expect(asset.suggestedFilename()).toBe(
			`fall-store-card.${extension.toLowerCase()}`,
		);
		const path = testInfo.outputPath(`designed.${extension.toLowerCase()}`);
		await asset.saveAs(path);
		const bytes = await readFile(path);
		if (extension === "PNG") {
			expect(bytes.readUInt32BE(16)).toBe(1200);
			expect(bytes.readUInt32BE(20)).toBe(1200);
		}
		if (extension === "SVG") {
			expect(bytes.toString()).toContain('width="1200"');
			expect(bytes.toString()).toContain('data-easyaccess-bg="true"');
		}
		if (extension === "JPEG")
			expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
		if (extension === "WEBP")
			expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
	}
	await page.getByLabel("QR foreground").fill("#ffffff");
	await expect(
		page.getByRole("button", { name: "Download PNG" }),
	).toBeDisabled();
	await page.getByLabel("Design preset").selectOption("classic");
	await expect(
		page.getByRole("button", { name: "Download PNG" }),
	).toBeEnabled();
	await page.getByLabel("QR type", { exact: true }).selectOption("campaign");
	await page
		.getByLabel("Destination URL")
		.fill(
			"https://example.com/shop?sku=42&utm_source=Old&utm_medium=qr&utm_campaign=Fall+Launch#buy",
		);
	await page
		.getByRole("button", { name: "Import parameters from URL" })
		.click();
	await expect(page.getByLabel("Campaign name", { exact: true })).toHaveValue(
		"Fall Launch",
	);
	await expect(page.getByLabel("Destination URL")).toHaveValue(
		"https://example.com/shop?sku=42#buy",
	);
	await page.getByLabel("Campaign preset").selectOption("packaging");
	await page.getByRole("button", { name: "Normalize campaign values" }).click();
	await expect(page.getByLabel("Campaign name", { exact: true })).toHaveValue(
		"fall-launch",
	);
	await page.getByText("Generate campaign variants", { exact: true }).click();
	await page
		.getByLabel("Variant sources")
		.fill("Store One\nStore & Two\nStore One");
	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Export variants CSV" }).click();
	const csvPath = testInfo.outputPath("variants.csv");
	await (await download).saveAs(csvPath);
	const csv = await readFile(csvPath, "utf8");
	expect(csv).toContain("utm_source=Store+%26+Two");
	expect(csv.split("\r\n")).toHaveLength(3);
	await page.screenshot({
		path: testInfo.outputPath("campaign-workspace.png"),
		fullPage: true,
	});
	await page.getByRole("link", { name: "Create managed campaign QR" }).click();
	await expect(
		page.getByRole("heading", { name: "Create QR code" }),
	).toBeVisible();
	await expect(page.getByLabel("Campaign name", { exact: true })).toHaveValue(
		"fall-launch",
	);
	const decoded = new URL(page.url()).searchParams.get("destination");
	if (!decoded) throw new Error("Campaign handoff is missing its destination");
	expect(new URL(decoded).searchParams.get("sku")).toBe("42");
	expect(new URL(decoded).searchParams.get("utm_source")).toBe("packaging");
	expect(new URL(decoded).hash).toBe("#buy");
	await expect(page.locator('input[type="url"]').first()).toHaveValue(decoded);
	const managedName = `handoff-${testInfo.project.name}-${Date.now()}`;
	await page.getByLabel("Campaign name", { exact: true }).fill(managedName);
	await page.getByRole("button", { name: "Create", exact: true }).click();
	await page.waitForURL("**/app/qr-codes/**/edit");
	const listResponse = await page.request.get("/api/trpc/qrCodes.list", {
		params: { input: JSON.stringify({ json: { includeInactive: true } }) },
	});
	const managed = (
		(await listResponse.json()).result.data.json as Array<{
			id: number;
			name: string;
			slug: string;
		}>
	).find((code) => code.name === managedName);
	if (!managed)
		throw new Error("Managed campaign did not appear in the organization");
	const trackedPath = `/r/${organizationSlug}/${managed.slug}`;
	const redirect = await page.request.get(trackedPath, { maxRedirects: 0 });
	expect(redirect.status()).toBe(302);
	expect(redirect.headers().location).toBe(decoded);
	const pngButton = page.getByRole("button", { name: "PNG", exact: true });
	await expect(pngButton).toBeEnabled();
	const managedDownload = page.waitForEvent("download");
	await pngButton.click();
	await (await managedDownload).saveAs(
		testInfo.outputPath("managed-tracked.png"),
	);

	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
	expect(errors).toEqual([]);
});

test("portable drafts omit passwords, restore content, and validate imports", async ({
	page,
}, testInfo) => {
	await signIn(page);
	await page.goto("/app/toolkit");
	await page.getByLabel("Network name").fill("Guest network");
	await page.getByLabel("Network password").fill("private-network-password");
	await page
		.getByText("Saved drafts & portable files", { exact: true })
		.click();
	await page.getByLabel("Draft name", { exact: true }).fill("Guest card");
	await page.getByRole("button", { name: "Save draft", exact: true }).click();
	await expect(page.getByLabel("Saved draft", { exact: true })).toContainText(
		"Guest card",
	);
	const storage = await page.evaluate(() =>
		Object.entries(localStorage).filter(([key]) =>
			key.startsWith("qr-toolkit-drafts:"),
		),
	);
	expect(storage).toHaveLength(1);
	expect(storage[0][1]).not.toContain("private-network-password");
	await page.getByLabel("QR type", { exact: true }).selectOption("website");
	await page.getByLabel("Website URL").fill("https://example.com/?a=1&b=2#buy");
	await page.getByLabel("Draft name", { exact: true }).fill("Shop draft");
	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Export draft", exact: true }).click();
	const path = testInfo.outputPath("draft.json");
	await (await download).saveAs(path);
	await page.getByLabel("Website URL").fill("https://another.example/");
	await page.getByLabel("Import QR draft file").setInputFiles(path);
	await expect(page.getByLabel("Website URL")).toHaveValue(
		"https://example.com/?a=1&b=2#buy",
	);
	await page.getByLabel("Import QR draft file").setInputFiles({
		name: "invalid.json",
		mimeType: "application/json",
		buffer: Buffer.from('{"version":2}'),
	});
	await expect(
		page.getByText("This is not a supported Easy Access QR draft."),
	).toBeVisible();
	await expect(page.getByLabel("Website URL")).toHaveValue(
		"https://example.com/?a=1&b=2#buy",
	);
	await page.reload();
	await page
		.getByText("Saved drafts & portable files", { exact: true })
		.click();
	await page
		.getByLabel("Saved draft", { exact: true })
		.selectOption({ label: "Guest card" });
	await expect(page.getByLabel("Network name")).toHaveValue("Guest network");
	await expect(page.getByLabel("Network password")).toHaveValue("");
});

test("favorites and saved views persist, filter domains, and support keyboard use", async ({
	page,
}, testInfo) => {
	await signIn(page);
	await page.goto("/app/qr-codes");
	const row = page.getByTestId("qr-code-row").first();
	await expect(row).toBeVisible();
	const name = await row.getAttribute("data-code-name");
	if (!name) throw new Error("Expected a seeded QR code");
	const favorite = row.getByRole("button", {
		name: `Favorite ${name}`,
		exact: true,
	});
	await favorite.focus();
	await page.keyboard.press("Enter");
	await expect(
		row.getByRole("button", { name: `Unfavorite ${name}`, exact: true }),
	).toHaveAttribute("aria-pressed", "true");
	await page
		.getByRole("button", { name: "Favorites only", exact: true })
		.click();
	await expect(page.getByTestId("qr-code-row")).toHaveCount(1);
	await page.getByText("Saved library views", { exact: true }).click();
	await page.getByLabel("New view name").fill("Favorite campaigns");
	await page.getByRole("button", { name: "Save current view" }).click();
	await page.reload();
	await page.getByText("Saved library views", { exact: true }).click();
	await page
		.getByLabel("Saved view", { exact: true })
		.selectOption({ label: "Favorite campaigns" });
	await expect(page.getByTestId("qr-code-row")).toHaveCount(1);
	await expect(
		page.getByRole("button", { name: "Showing favorites", exact: true }),
	).toHaveAttribute("aria-pressed", "true");
	await page.getByRole("button", { name: "Reset", exact: true }).click();
	const domain = await page
		.getByLabel("Destination domain")
		.locator("option")
		.nth(1)
		.getAttribute("value");
	if (!domain) throw new Error("Expected a destination domain");
	await page.getByLabel("Destination domain").selectOption(domain);
	await expect(page.getByTestId("qr-code-row").first()).toBeVisible();
	const rows = page.getByTestId("qr-code-row");
	const inventory = await page.request.get("/api/trpc/qrCodes.list", {
		params: { input: JSON.stringify({ json: { includeInactive: true } }) },
	});
	const codes = (await inventory.json()).result.data.json as Array<{
		name: string;
		destinationUrl: string;
		destinations: Array<{ url: string }>;
	}>;
	for (const codeName of await rows.evaluateAll((elements) =>
		elements.map((element) => element.getAttribute("data-code-name")),
	)) {
		const code = codes.find((item) => item.name === codeName);
		expect(code).toBeDefined();
		expect(
			[
				code?.destinationUrl,
				...(code?.destinations.map((item) => item.url) || []),
			].some((url) => url && new URL(url).hostname === domain),
		).toBe(true);
	}
	await page.screenshot({
		path: testInfo.outputPath("library-productivity.png"),
		fullPage: true,
	});
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
});

test("drafts, favorites, and saved views stay scoped to account and workspace", async ({
	page,
}, testInfo) => {
	test.setTimeout(90_000);
	const suffix = `${testInfo.project.name}-${Date.now()}`;
	const email = `scoped-${suffix}@easyaccessqr.test`;
	await page.goto("/auth/sign-up");
	await page.getByLabel("Name", { exact: true }).fill("Scope QA");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill("ScopedTest!123");
	await page.getByRole("button", { name: "Create Account" }).click();
	await page.waitForURL("**/app**");
	await page.getByLabel("Organization name").fill("Scope A");
	await page.getByLabel("Organization slug").fill(`scope-a-${suffix}`);
	await page
		.getByRole("button", { name: "Create organization", exact: true })
		.click();
	await expect(
		page.getByRole("heading", { name: "Welcome to Easy Access QR" }),
	).toBeVisible();
	const orgs = await page.request.get("/api/auth/organization/list");
	const orgA = ((await orgs.json()) as Array<{ id: string }>)[0].id;
	const create = await page.request.post("/api/trpc/qrCodes.create", {
		data: {
			json: {
				name: "Scope QR",
				destinationUrl: "https://example.com",
				isActive: false,
			},
		},
	});
	expect(create.ok()).toBe(true);
	await page.goto("/app/qr-codes");
	await page
		.getByRole("button", { name: "Favorite Scope QR", exact: true })
		.click();
	await page.getByText("Saved library views", { exact: true }).click();
	await page.getByLabel("New view name").fill("Scope A view");
	await page.getByRole("button", { name: "Save current view" }).click();
	await page.goto("/app/toolkit");
	await page.getByLabel("QR type", { exact: true }).selectOption("text");
	await page.getByLabel("Text", { exact: true }).fill("Scope A content");
	await page
		.getByText("Saved drafts & portable files", { exact: true })
		.click();
	await page.getByLabel("Draft name", { exact: true }).fill("Scope A draft");
	await page.getByRole("button", { name: "Save draft", exact: true }).click();
	await expect(page.getByLabel("Saved draft", { exact: true })).toContainText(
		"Scope A draft",
	);
	const before = await page.evaluate(() =>
		Object.entries(localStorage).filter(
			([key]) =>
				key.startsWith("qr-library:") || key.startsWith("qr-toolkit-drafts:"),
		),
	);
	const orgBResponse = await page.request.post(
		"/api/auth/organization/create",
		{
			headers: { Origin: new URL(page.url()).origin },
			data: { name: "Scope B", slug: `scope-b-${suffix}` },
		},
	);
	expect(orgBResponse.ok(), await orgBResponse.text()).toBe(true);
	const orgB = (await orgBResponse.json()).id as string;
	const activate = async (id: string) => {
		const response = await page.request.post(
			"/api/auth/organization/set-active",
			{
				headers: { Origin: new URL(page.url()).origin },
				data: { organizationId: id },
			},
		);
		expect(response.ok()).toBe(true);
	};
	await activate(orgB);
	await page.reload();
	await page
		.getByText("Saved drafts & portable files", { exact: true })
		.click();
	await expect(page.getByLabel("Saved draft", { exact: true })).toHaveCount(0);
	await page.goto("/app/qr-codes");
	await page.getByText("Saved library views", { exact: true }).click();
	await expect(
		page.getByLabel("Saved view", { exact: true }).locator("option"),
	).toHaveCount(1);
	await activate(orgA);
	await page.reload();
	await page.getByText("Saved library views", { exact: true }).click();
	await expect(page.getByLabel("Saved view", { exact: true })).toContainText(
		"Scope A view",
	);
	await expect(
		page.getByRole("button", { name: "Unfavorite Scope QR", exact: true }),
	).toHaveAttribute("aria-pressed", "true");
	await page.getByRole("button", { name: /Scope QA/ }).click();
	await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
	await page.waitForURL("**/");
	await page.goto("/auth/sign-in");
	await page.getByLabel("Email").fill("analyst@easyaccessqr.com");
	await page.getByLabel("Password").fill("EasyAccessQR!123");
	await page.getByRole("button", { name: "Sign In", exact: true }).click();
	await page.waitForURL("**/app**");
	const choose = page.getByRole("heading", { name: "Choose organization" });
	await expect(
		choose.or(page.getByRole("heading", { name: "Dashboard", exact: true })),
	).toBeVisible();
	if (await choose.isVisible()) {
		await page
			.getByRole("button", { name: "Nearby Labs nearby-labs", exact: true })
			.click();
		await expect(
			page.getByRole("heading", { name: "Dashboard", exact: true }),
		).toBeVisible();
	}
	await page.goto("/app/toolkit");
	await page
		.getByText("Saved drafts & portable files", { exact: true })
		.click();
	await expect(page.getByLabel("Saved draft", { exact: true })).toHaveCount(0);
	await page.goto("/app/qr-codes");
	await page.getByText("Saved library views", { exact: true }).click();
	await expect(
		page.getByLabel("Saved view", { exact: true }).locator("option"),
	).toHaveCount(1);
	await page
		.getByRole("button", { name: "Favorites only", exact: true })
		.click();
	await expect(page.getByTestId("qr-code-row")).toHaveCount(0);
	const after = await page.evaluate(() =>
		Object.entries(localStorage).filter(
			([key]) =>
				key.startsWith("qr-library:") || key.startsWith("qr-toolkit-drafts:"),
		),
	);
	expect(after).toEqual(before);
});
