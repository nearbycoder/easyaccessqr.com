import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export function useRedirectIfAuthenticated() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const shouldRedirect = !isPending && Boolean(session?.user);

	useEffect(() => {
		if (!shouldRedirect) return;
		navigate({ to: "/app", replace: true });
	}, [navigate, shouldRedirect]);

	return { shouldRedirect };
}
