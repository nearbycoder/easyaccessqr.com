import { createFileRoute } from "@tanstack/react-router";

const serverHandlers = import.meta.env.SSR
	? {
			GET: async ({ request }: { request: Request }) => {
				const { auth } = await import("@/lib/auth");
				return auth.handler(request);
			},
			POST: async ({ request }: { request: Request }) => {
				const { auth } = await import("@/lib/auth");
				return auth.handler(request);
			},
		}
	: {};

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: serverHandlers,
	},
});
