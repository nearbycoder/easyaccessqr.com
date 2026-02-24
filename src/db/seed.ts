import { db } from "@/db";
import { qrCode } from "@/db/schema";

async function main() {
	console.log("[seed] Easy Access QR seed started");

	const users = await db.query.user.findMany({
		columns: { id: true },
		limit: 1,
	});
	const orgs = await db.query.organization.findMany({
		columns: { id: true },
		limit: 1,
	});

	const fallbackUserId = users[0]?.id;
	const fallbackOrgId = orgs[0]?.id;

	if (!fallbackUserId || !fallbackOrgId) {
		console.log(
			"[seed] Skipped QR demo rows (requires at least one user and one organization).",
		);
		return;
	}

	const existing = await db.query.qrCode.findMany({ limit: 1 });

	if (existing.length > 0) {
		console.log("[seed] QR codes already exist, no changes applied.");
		return;
	}

	await db.insert(qrCode).values([
		{
			organizationId: fallbackOrgId,
			createdByUserId: fallbackUserId,
			name: "Homepage Redirect",
			slug: "homepage",
			destinationUrl: "https://easyaccessqr.com",
			destinations: [
				{
					id: "dest-1",
					label: "Primary",
					url: "https://easyaccessqr.com",
					weight: 100,
				},
			],
			isActive: true,
			tags: ["core", "marketing"],
		},
		{
			organizationId: fallbackOrgId,
			createdByUserId: fallbackUserId,
			name: "Product Demo",
			slug: "product-demo",
			destinationUrl: "https://easyaccessqr.com/demo",
			destinations: [
				{
					id: "dest-1",
					label: "Demo",
					url: "https://easyaccessqr.com/demo",
					weight: 70,
				},
				{
					id: "dest-2",
					label: "Homepage",
					url: "https://easyaccessqr.com",
					weight: 30,
				},
			],
			isActive: true,
			tags: ["demo"],
		},
	]);

	console.log("[seed] Added starter QR codes.");
}

main()
	.catch((error) => {
		console.error("[seed] Failed", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$client.end();
	});
