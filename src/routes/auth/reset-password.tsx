import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { z } from "zod";
import { AuthBrand } from "@/components/auth/auth-brand";
import { useRedirectIfAuthenticated } from "@/components/auth/use-redirect-if-authenticated";
import { authClient } from "@/lib/auth-client";
import { buildNoIndexMeta } from "@/lib/seo";

const resetPasswordSearchSchema = z.object({
	token: z.string().optional(),
	error: z.string().optional(),
});

export const Route = createFileRoute("/auth/reset-password")({
	validateSearch: resetPasswordSearchSchema,
	component: ResetPasswordPage,
	head: () => ({ meta: buildNoIndexMeta() }),
});

function ResetPasswordPage() {
	const { shouldRedirect } = useRedirectIfAuthenticated();
	const search = Route.useSearch();
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const newPasswordId = useId();
	const confirmPasswordId = useId();

	const token = search.token;
	const invalidToken =
		search.error?.toLowerCase() === "invalid_token" || !search.token;

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!token) {
			setError("Reset token is missing or invalid.");
			return;
		}
		if (newPassword.length < 8) {
			setError("New password must be at least 8 characters.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		setLoading(true);
		setError("");

		const result = await authClient.resetPassword({
			token,
			newPassword,
		});

		if (result.error) {
			setError(result.error.message ?? "Unable to reset password.");
			setLoading(false);
			return;
		}

		setSuccess(true);
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
						Reset Password
					</h1>
					<p className="text-sm text-ds-muted mb-8">
						Choose a new password for your account.
					</p>

					{success ? (
						<div className="space-y-4">
							<div className="border-2 border-ds-accent bg-ds-accent/10 p-3 text-ds-accent text-sm font-bold">
								Password updated successfully.
							</div>
							<Link
								to="/auth/sign-in"
								search={{ invitationId: undefined, email: undefined }}
								className="inline-block w-full bg-ds-accent text-ds-accent-fg py-3 text-center font-extrabold text-sm tracking-wide hover:bg-ds-accent-hover transition-colors"
							>
								Sign In
							</Link>
						</div>
					) : invalidToken ? (
						<div className="space-y-4">
							<div className="border-2 border-red-500 bg-red-500/10 p-3 text-red-400 text-sm font-bold">
								Invalid or expired reset link.
							</div>
							<Link
								to="/auth/forgot-password"
								className="inline-block w-full border-2 border-ds-border-strong rounded-2xl shadow-[4px_4px_0_0_var(--color-ds-border-strong)] py-3 text-center font-extrabold text-sm tracking-wide hover:bg-ds-surface transition-colors"
							>
								Request New Link
							</Link>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-6">
							{error && (
								<div className="border-2 border-red-500 bg-red-500/10 p-3 text-red-400 text-sm font-bold">
									Error: {error}
								</div>
							)}
							<div>
								<label
									htmlFor={newPasswordId}
									className="block text-xs font-bold tracking-wide text-ds-text-tertiary mb-2"
								>
									New password
								</label>
								<input
									id={newPasswordId}
									type="password"
									value={newPassword}
									onChange={(event) => setNewPassword(event.target.value)}
									required
									minLength={8}
									placeholder="min 8 chars"
									className="w-full bg-ds-input-bg border-2 border-ds-muted3 rounded-xl px-4 py-3 text-ds-fg font-sans text-sm focus:border-ds-accent focus:outline-none transition-colors placeholder:text-ds-muted2"
								/>
							</div>
							<div>
								<label
									htmlFor={confirmPasswordId}
									className="block text-xs font-bold tracking-wide text-ds-text-tertiary mb-2"
								>
									Confirm password
								</label>
								<input
									id={confirmPasswordId}
									type="password"
									value={confirmPassword}
									onChange={(event) => setConfirmPassword(event.target.value)}
									required
									minLength={8}
									className="w-full bg-ds-input-bg border-2 border-ds-muted3 rounded-xl px-4 py-3 text-ds-fg font-sans text-sm focus:border-ds-accent focus:outline-none transition-colors"
								/>
							</div>
							<button
								type="submit"
								disabled={loading}
								className="w-full bg-ds-accent text-ds-accent-fg py-3 font-extrabold text-sm tracking-wide hover:bg-ds-accent-hover transition-colors disabled:opacity-50"
							>
								{loading ? "Resetting..." : "Reset Password"}
							</button>
						</form>
					)}

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
