import { createFileRoute } from "@tanstack/react-router";

const serverHandlers = import.meta.env.SSR
	? {
			GET: async ({ request }: { request: Request }) => {
				const [{ fetchRequestHandler }, { trpcRouter }, { auth }] =
					await Promise.all([
						import("@trpc/server/adapters/fetch"),
						import("@/integrations/trpc/router"),
						import("@/lib/auth"),
					]);

				return fetchRequestHandler({
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
			},
			POST: async ({ request }: { request: Request }) => {
				const [{ fetchRequestHandler }, { trpcRouter }, { auth }] =
					await Promise.all([
						import("@trpc/server/adapters/fetch"),
						import("@/integrations/trpc/router"),
						import("@/lib/auth"),
					]);

				return fetchRequestHandler({
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
			},
		}
	: {};

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: serverHandlers,
	},
});
