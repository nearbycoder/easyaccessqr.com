import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
	contentTypeIsJson,
	hasTrustedBrowserOrigin,
	withServerSecurityHeaders,
} from "@/lib/server-security";

const API_SCOPE_BASE = [
	"profile:read",
	"qrcodes:read",
	"qrcodes:write",
	"analytics:read",
] as const;
const API_SCOPE_MEMBER_MANAGE = "members:manage";

const createApiKeyBodySchema = z.object({
	name: z.string().trim().min(1).max(64),
	expiresInSeconds: z.number().int().positive().nullable(),
	includeMemberManage: z.boolean(),
});

function hasOwnerRole(roleValue: string): boolean {
	return roleValue
		.split(",")
		.map((role) => role.trim().toLowerCase())
		.some((role) => role === "owner");
}

function json(
	status: number,
	payload: {
		success: boolean;
		data?: unknown;
		error?: string;
	},
	request?: Request,
): Response {
	return withServerSecurityHeaders(
		new Response(JSON.stringify(payload), {
			status,
			headers: {
				"content-type": "application/json; charset=utf-8",
			},
		}),
		{
			request,
			cacheControl: "no-store",
		},
	);
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	if (typeof error === "string" && error.trim().length > 0) {
		return error;
	}
	return "Failed to create API key.";
}

const serverHandlers = import.meta.env.SSR
	? {
			POST: async ({ request }: { request: Request }) => {
				if (!hasTrustedBrowserOrigin(request, { allowNoOrigin: false })) {
					return json(
						403,
						{
							success: false,
							error: "Untrusted origin.",
						},
						request,
					);
				}
				if (!contentTypeIsJson(request)) {
					return json(
						415,
						{
							success: false,
							error: "Content-Type must be application/json.",
						},
						request,
					);
				}

				const [{ auth }, { db }, schema, drizzle] = await Promise.all([
					import("@/lib/auth"),
					import("@/db"),
					import("@/db/schema"),
					import("drizzle-orm"),
				]);
				const { member } = schema;
				const { and, eq } = drizzle;

				const session = await auth.api.getSession({
					headers: request.headers,
				});
				if (!session?.user?.id) {
					return json(
						401,
						{
							success: false,
							error: "You must be signed in to create API keys.",
						},
						request,
					);
				}

				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return json(
						400,
						{
							success: false,
							error: "Invalid JSON body.",
						},
						request,
					);
				}

				const parsed = createApiKeyBodySchema.safeParse(body);
				if (!parsed.success) {
					return json(
						400,
						{
							success: false,
							error: "Invalid API key create payload.",
						},
						request,
					);
				}

				if (parsed.data.includeMemberManage) {
					const activeOrganizationId = session.session.activeOrganizationId;
					if (!activeOrganizationId) {
						return json(
							403,
							{
								success: false,
								error:
									"Select an active organization before adding member-management scope.",
							},
							request,
						);
					}
					const membership = await db.query.member.findFirst({
						where: and(
							eq(member.userId, session.user.id),
							eq(member.organizationId, activeOrganizationId),
						),
						columns: { role: true },
					});
					if (!membership || !hasOwnerRole(membership.role)) {
						return json(
							403,
							{
								success: false,
								error:
									"Only organization owners can create API keys with member-management scope.",
							},
							request,
						);
					}
				}

				const permissions = {
					easyaccessqr: parsed.data.includeMemberManage
						? [...API_SCOPE_BASE, API_SCOPE_MEMBER_MANAGE]
						: [...API_SCOPE_BASE],
				};

				try {
					const created = await auth.api.createApiKey({
						body: {
							userId: session.user.id,
							name: parsed.data.name,
							expiresIn: parsed.data.expiresInSeconds,
							metadata: {
								source: "settings.api-keys",
							},
							permissions,
						},
					});
					return json(
						200,
						{
							success: true,
							data: created,
						},
						request,
					);
				} catch (error) {
					return json(
						400,
						{
							success: false,
							error: getErrorMessage(error),
						},
						request,
					);
				}
			},
		}
	: {};

export const Route = createFileRoute("/api/settings/api-keys")({
	server: {
		handlers: serverHandlers,
	},
});
