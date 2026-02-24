import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { AuthBrand } from "@/components/auth/auth-brand";
import { useRedirectIfAuthenticated } from "@/components/auth/use-redirect-if-authenticated";
import { authClient } from "@/lib/auth-client";
import { buildNoIndexMeta } from "@/lib/seo";

export const Route = createFileRoute("/auth/forgot-password")({
	component: ForgotPasswordPage,
	head: () => ({ meta: buildNoIndexMeta() }),
});

function ForgotPasswordPage() {
	const { shouldRedirect } = useRedirectIfAuthenticated();
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);
	const emailFieldId = useId();

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setLoading(true);
		setError("");
		setSuccess("");

		const redirectTo =
			typeof window === "undefined"
				? undefined
				: `${window.location.origin}/auth/reset-password`;

		const result = await authClient.requestPasswordReset({
			email,
			redirectTo,
		});

		if (result.error) {
			setError(result.error.message ?? "Unable to request password reset.");
			setLoading(false);
			return;
		}

		setSuccess(
			result.data?.message ??
				"If this email exists, a password reset link has been sent.",
		);
		setLoading(false);
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
						Forgot Password
					</h1>
					<p className="text-sm text-ds-muted mb-8">
						Request a reset link for your account.
					</p>

					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="border-2 border-red-500 bg-red-500/10 p-3 text-red-400 text-sm font-bold">
								Error: {error}
							</div>
						)}
						{success && (
							<div className="border-2 border-ds-accent bg-ds-accent/10 p-3 text-ds-accent text-sm font-bold">
								{success}
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
								onChange={(event) => setEmail(event.target.value)}
								required
								placeholder="you@company.com"
								className="w-full bg-ds-input-bg border-2 border-ds-muted3 rounded-xl px-4 py-3 text-ds-fg font-sans text-sm focus:border-ds-accent focus:outline-none transition-colors placeholder:text-ds-muted2"
							/>
						</div>
						<button
							type="submit"
							disabled={loading}
							className="w-full bg-ds-accent text-ds-accent-fg py-3 font-extrabold text-sm tracking-wide hover:bg-ds-accent-hover transition-colors disabled:opacity-50"
						>
							{loading ? "Sending..." : "Send Reset Link"}
						</button>
					</form>

					<p className="mt-6 text-sm text-ds-muted">
						Back to{" "}
						<Link
							to="/auth/sign-in"
							search={{ invitationId: undefined, email: undefined }}
							className="text-ds-accent font-bold hover:underline"
						>
							Sign in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
