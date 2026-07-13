import { createFileRoute } from "@tanstack/react-router";
import { withServerSecurityHeaders } from "@/lib/server-security";

async function handleAuthRequest(request: Request) {
	const { auth } = await import("@/lib/auth");
	const response = await auth.handler(request);
	return withServerSecurityHeaders(response, {
		request,
		cacheControl: "no-store",
		frameOptions: null,
	});
}

const serverHandlers = import.meta.env.SSR
	? {
			GET: async ({ request }: { request: Request }) => {
				return handleAuthRequest(request);
			},
			POST: async ({ request }: { request: Request }) => {
				return handleAuthRequest(request);
			},
		}
	: {};

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: serverHandlers,
	},
});
