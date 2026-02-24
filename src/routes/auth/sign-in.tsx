import { usePostHog } from "@posthog/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { AuthBrand } from "@/components/auth/auth-brand";
import { useRedirectIfAuthenticated } from "@/components/auth/use-redirect-if-authenticated";
import { authClient } from "@/lib/auth-client";
import { buildNoIndexMeta } from "@/lib/seo";

export const Route = createFileRoute("/auth/sign-in")({
	validateSearch: (search) => ({
		invitationId:
			typeof search.invitationId === "string" ? search.invitationId : undefined,
		email: typeof search.email === "string" ? search.email : undefined,
	}),
	component: SignIn,
	head: () => ({ meta: buildNoIndexMeta() }),
});

function SignIn() {
	const { shouldRedirect } = useRedirectIfAuthenticated();
	const navigate = useNavigate();
	const posthog = usePostHog();
	const search = Route.useSearch();
	const [email, setEmail] = useState(search.email ?? "");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const emailFieldId = useId();
	const passwordFieldId = useId();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		const result = await authClient.signIn.email({ email, password });

		if (result.error) {
			setError(result.error.message ?? "Sign in failed");
			setLoading(false);
			posthog.captureException(
				new Error(result.error.message ?? "Sign in failed"),
			);
			return;
		}

		if (search.invitationId) {
			const inviteResult = await authClient.organization.acceptInvitation({
				invitationId: search.invitationId,
			});
			if (inviteResult.error) {
				setError(
					inviteResult.error.message ??
						"Signed in, but invite acceptance failed",
				);
				setLoading(false);
				return;
			}
		}

		// Identify the user and capture sign-in event
		const userId = result.data?.user?.id;
		if (userId) {
			posthog.identify(userId, {
				email: email,
			});
		}
		posthog.capture("user_signed_in", {
			has_invitation: Boolean(search.invitationId),
		});

		navigate({ to: "/app" });
	};

	if (shouldRedirect) {
		return null;
	}

	return (
		<div className="min-h-screen bg-ds-bg text-ds-fg selection:bg-ds-selection-bg selection:text-ds-selection-fg font-sans flex items-center justify-center p-4 sm:p-6">
			<div className="w-full max-w-md">
				<AuthBrand />

				<div className="border-2 border-ds-border-strong rounded-2xl shadow-[4px_4px_0_0_var(--color-ds-border-strong)] p-6 sm:p-8">
					<h1 className="text-2xl font-extrabold tracking-tighter mb-2">
						Sign In
					</h1>
					<p className="text-sm text-ds-muted mb-8">
						Welcome back to Easy Access QR.
					</p>
					{search.invitationId && (
						<p className="mb-8 border border-ds-accent/50 bg-ds-accent/10 p-3 text-xs text-ds-accent">
							You were invited to join an organization. Sign in with the invited
							email to accept access automatically.
						</p>
					)}

					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="border-2 border-red-500 bg-red-500/10 p-3 text-red-400 text-sm font-bold">
								Error: {error}
							</div>
						)}
						<div>
							<label
								htmlFor={emailFieldId}
								className="block text-xs font-bold tracking-wide text-ds-text-tertiary mb-2"
							>
								Email
							</label>
							<input
								id={emailFieldId}
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								placeholder="you@company.com"
								className="w-full bg-ds-input-bg border-2 border-ds-muted3 rounded-xl px-4 py-3 text-ds-fg font-sans text-sm focus:border-ds-accent focus:outline-none transition-colors placeholder:text-ds-muted2"
							/>
						</div>
						<div>
							<label
								htmlFor={passwordFieldId}
								className="block text-xs font-bold tracking-wide text-ds-text-tertiary mb-2"
							>
								Password
							</label>
							<input
								id={passwordFieldId}
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="w-full bg-ds-input-bg border-2 border-ds-muted3 rounded-xl px-4 py-3 text-ds-fg font-sans text-sm focus:border-ds-accent focus:outline-none transition-colors"
							/>
							<div className="mt-2 text-right">
								<Link
									to="/auth/forgot-password"
									className="text-xs font-bold tracking-wide text-ds-muted transition-colors hover:text-ds-accent"
								>
									Forgot password?
								</Link>
							</div>
						</div>
						<button
							type="submit"
							disabled={loading}
							className="w-full bg-ds-accent text-ds-accent-fg py-3 font-extrabold text-sm tracking-wide hover:bg-ds-accent-hover transition-colors disabled:opacity-50"
						>
							{loading ? "Signing in..." : "Sign In"}
						</button>
					</form>

					<p className="mt-6 text-sm text-ds-muted">
						No account?{" "}
						<Link
							to="/auth/sign-up"
							search={{
								invitationId: search.invitationId,
								email: search.email ?? email,
							}}
							className="text-ds-accent font-bold hover:underline"
						>
							Create account
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
