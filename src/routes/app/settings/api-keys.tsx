import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/settings/api-keys")({
	beforeLoad: () => {
		// API keys is intentionally disabled for now.
		throw redirect({ to: "/app/settings" });
	},
	component: () => null,
});
