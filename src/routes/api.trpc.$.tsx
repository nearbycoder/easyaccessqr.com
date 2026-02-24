import { createFileRoute } from "@tanstack/react-router";
import {
	contentTypeIsJson,
	hasTrustedBrowserOrigin,
	withServerSecurityHeaders,
} from "@/lib/server-security";

function jsonErrorResponse(
	status: number,
	message: string,
	request: Request,
): Response {
	return withServerSecurityHeaders(
		new Response(JSON.stringify({ error: message }), {
			status,
			headers: {
				"content-type": "application/json; charset=utf-8",
			},
		}),
		{
			request,
			cacheControl: "no-store",
			frameOptions: null,
		},
	);
}

async function handleTrpcRequest(request: Request): Promise<Response> {
	const [{ fetchRequestHandler }, { trpcRouter }, { auth }] = await Promise.all(
		[
			import("@trpc/server/adapters/fetch"),
			import("@/integrations/trpc/router"),
			import("@/lib/auth"),
		],
	);

	const response = await fetchRequestHandler({
		req: request,
		router: trpcRouter,
		endpoint: "/api/trpc",
		createContext: async () => {
			const session = await auth.api.getSession({
				headers: request.headers,
			});
			return { session };
		},
	});

	return withServerSecurityHeaders(response, {
		request,
		cacheControl: "no-store",
		frameOptions: null,
	});
}

const serverHandlers = import.meta.env.SSR
	? {
			GET: async ({ request }: { request: Request }) => {
				return handleTrpcRequest(request);
			},
			POST: async ({ request }: { request: Request }) => {
				if (!hasTrustedBrowserOrigin(request, { allowNoOrigin: true })) {
					return jsonErrorResponse(403, "Untrusted origin.", request);
				}
				if (!contentTypeIsJson(request)) {
					return jsonErrorResponse(
						415,
						"Content-Type must be application/json.",
						request,
					);
				}
				return handleTrpcRequest(request);
			},
		}
	: {};

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: serverHandlers,
	},
});
