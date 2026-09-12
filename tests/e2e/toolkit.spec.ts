import { expect, type Page, test } from "@playwright/test";

async function signIn(page: Page) {
	await page.goto("/auth/sign-in");
	await page.getByLabel("Email").fill("owner@easyaccessqr.com");
	await page.getByLabel("Password").fill("EasyAccessQR!123");
	await page.getByRole("button", { name: "Sign In", exact: true }).click();
	await page.waitForURL("**/app**");
	const workspace = page.getByRole("button", {
		name: "Nearby Labs nearby-labs",
		exact: true,
	});
	const dashboard = page.getByRole("heading", {
		name: "Dashboard",
		exact: true,
	});
	await expect(workspace.or(dashboard)).toBeVisible();
	if (await workspace.isVisible()) await workspace.click();
	await expect(dashboard).toBeVisible();
	await page.goto("/app/toolkit");
	await expect(
		page.getByRole("heading", { name: "QR toolkit", exact: true }),
	).toBeVisible();
}

test("generates all toolkit types, downloads assets, cleans campaigns, and prints cards", async ({
	page,
	isMobile,
}, testInfo) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await signIn(page);
	await expect(
		page.getByRole("button", { name: "Download PNG" }),
	).toBeDisabled();
	await page.getByLabel("Network name").fill("Guest; Wi-Fi");
	await page.getByLabel("Network password").fill(" pass:word ");
	await page.getByText("Encoded content", { exact: true }).click();
	await expect(page.getByTestId("toolkit-payload")).toContainText(
		"WIFI:T:WPA;S:Guest\\; Wi-Fi;P: pass\\:word ;",
	);
	await expect(
		page.getByRole("img", { name: "QR code preview" }).locator("svg"),
	).toBeVisible();
	for (const extension of ["PNG", "SVG"]) {
		const downloadPromise = page.waitForEvent("download");
		await page.getByRole("button", { name: `Download ${extension}` }).click();
		expect((await downloadPromise).suggestedFilename()).toBe(
			`scan-me.${extension.toLowerCase()}`,
		);
	}
	await page.getByLabel("Security").selectOption("nopass");
	await expect(page.getByLabel("Network password")).toHaveCount(0);
	await expect(page.getByTestId("toolkit-payload")).not.toContainText("word");
	const cases: Array<{
		type: string;
		fields: Record<string, string>;
		prefix: string;
	}> = [
		{
			type: "contact",
			fields: {
				"Full name": "Jane Doe",
				"Email address (optional)": "jane@example.com",
			},
			prefix: "BEGIN:VCARD",
		},
		{
			type: "email",
			fields: {
				"Email address": "jane@example.com",
				Subject: "Hello & welcome",
				Message: "From the QR",
			},
			prefix: "mailto:jane@example.com?subject=Hello%20%26%20welcome",
		},
		{
			type: "sms",
			fields: { "Phone number": "+12125550123", Message: "Hello" },
			prefix: "sms:+12125550123?body=Hello",
		},
		{
			type: "phone",
			fields: { "Phone number": "+12125550123" },
			prefix: "tel:+12125550123",
		},
		{
			type: "location",
			fields: { Latitude: "0", Longitude: "-180" },
			prefix: "geo:0,-180",
		},
		{
			type: "text",
			fields: { Text: "Welcome to our store" },
			prefix: "Welcome to our store",
		},
		{
			type: "whatsapp",
			fields: { "Phone number": "+12125550123", Message: "Hello" },
			prefix: "https://wa.me/12125550123?text=Hello",
		},
	];
	for (const item of cases) {
		await page.getByLabel("QR type").selectOption(item.type);
		for (const [label, value] of Object.entries(item.fields))
			await page.getByLabel(label, { exact: true }).fill(value);
		await expect(page.getByTestId("toolkit-payload")).toContainText(
			item.prefix,
		);
		await expect(
			page.getByRole("button", { name: "Download PNG" }),
		).toBeEnabled();
	}
	await page.getByLabel("QR type").selectOption("campaign");
	await page
		.getByLabel("Destination URL")
		.fill("https://example.com/shop?sku=42&utm_source=old&fbclid=abc#buy");
	await page.getByRole("button", { name: "Clean tracking parameters" }).click();
	await expect(page.getByLabel("Destination URL")).toHaveValue(
		"https://example.com/shop?sku=42#buy",
	);
	await page.getByLabel("Campaign source").fill("poster");
	await page.getByLabel("Campaign name").fill("Fall sale");
	await expect(page.getByTestId("toolkit-payload")).toContainText(
		"utm_source=poster&utm_medium=qr&utm_campaign=Fall+sale#buy",
	);
	await expect(page.locator("#toolkit-print-card")).toHaveCSS(
		"background-color",
		"rgb(255, 255, 255)",
	);
	await page.getByLabel("Card heading").fill("Shop the fall collection");
	await page.getByLabel("Card caption").fill("Scan to explore");
	await expect(page.locator("#toolkit-print-card")).toContainText(
		"Shop the fall collection",
	);
	await page.evaluate(() => {
		window.print = () => {
			document.body.dataset.printRequested = "true";
		};
	});
	await page.getByRole("button", { name: "Print QR card" }).click();
	await expect(page.locator("body")).toHaveAttribute(
		"data-print-requested",
		"true",
	);
	await page.screenshot({
		path: testInfo.outputPath("toolkit-screen.png"),
		fullPage: true,
	});
	await page.emulateMedia({ media: "print" });
	if (!isMobile)
		await page.pdf({
			path: testInfo.outputPath("qr-card.pdf"),
			format: "A4",
			printBackground: true,
		});
	await expect(page.locator("#toolkit-print-card")).toBeVisible();
	await expect(page.locator("h1")).toHaveCSS("visibility", "hidden");
	await page.emulateMedia({ media: "screen" });
	await page.getByLabel("Destination URL").fill("javascript:alert(1)");
	await expect(
		page.getByRole("button", { name: "Download PNG" }),
	).toBeDisabled();
	expect(errors).toEqual([]);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
});
