import { usePostHog } from "@posthog/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, RotateCcw, Settings2, TriangleAlert, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/trpc/react";
import { authClient } from "@/lib/auth-client";
import { getPlanDisplayName } from "@/lib/plan-config";

export const Route = createFileRoute("/app/settings/billing")({
	component: BillingPage,
});

const plans = [
	{
		name: "Starter",
		id: "free",
		price: "$0",
		period: "/month",
		features: [
			"Up to 3 active QR codes",
			"Basic view analytics",
			"One organization workspace",
		],
		comingSoon: false,
	},
	{
		name: "Growth",
		id: "pro",
		price: "$29",
		period: "/month",
		popular: true,
		comingSoon: true,
		features: [
			"Up to 100 active QR codes",
			"Advanced analytics and exports",
			"Member access controls",
		],
	},
	{
		name: "Scale",
		id: "business",
		price: "Custom",
		period: "",
		comingSoon: true,
		features: [
			"Unlimited active QR codes",
			"Priority support",
			"Custom onboarding and SLA",
		],
	},
];

const planRank: Record<string, number> = {
	free: 0,
	pro: 1,
	business: 2,
};
const PAID_PLANS_COMING_SOON = true;

function BillingPage() {
	const trpc = useTRPC();
	const posthog = usePostHog();
	const queryClient = useQueryClient();
	const subQuery = trpc.org.getSubscription.queryOptions();
	const { data: sub } = useQuery(subQuery);
	const { data: myMembership } = useQuery(
		trpc.org.getMyMembership.queryOptions(),
	);
	const canManageOrganization = myMembership?.canManageOrganization ?? false;
	const currentPlan = sub?.plan ?? "free";
	const [busyAction, setBusyAction] = useState<string | null>(null);

	if (!canManageOrganization) {
		return (
			<div className="mx-auto w-full max-w-[1320px]">
				<div className="mb-8">
					<h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">
						Billing
					</h1>
					<p className="text-ds-muted text-sm mt-1">Manage your subscription</p>
				</div>
				<div className="border-2 border-ds-border rounded-2xl bg-ds-surface/60 p-6 text-sm text-ds-muted">
					Member access: Billing is managed by organization owners and admins.
				</div>
			</div>
		);
	}

	const getReferenceParams = () => {
		if (sub?.scope === "organization" && sub.referenceId) {
			return {
				customerType: "organization" as const,
				referenceId: sub.referenceId,
			};
		}
		return {};
	};

	const runAction = async (key: string, fn: () => Promise<unknown>) => {
		setBusyAction(key);
		try {
			await fn();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Action failed";
			toast.error(message);
		} finally {
			setBusyAction(null);
		}
	};

	const handleUpgrade = async (planName: string) => {
		if (planName === "free") return;
		if (PAID_PLANS_COMING_SOON) {
			toast.info("Paid plans are coming soon.");
			return;
		}
		posthog.capture("subscription_upgrade_started", {
			from_plan: currentPlan,
			to_plan: planName,
		});
		await runAction(`upgrade:${planName}`, () =>
			authClient.subscription.upgrade({
				plan: planName,
				successUrl: window.location.href,
				cancelUrl: window.location.href,
				...getReferenceParams(),
			}),
		);
	};

	const handleManagePortal = async () => {
		await runAction("portal", () =>
			authClient.subscription.billingPortal({
				returnUrl: window.location.href,
				...getReferenceParams(),
			}),
		);
	};

	const handleCancel = async () => {
		posthog.capture("subscription_cancelled", {
			plan: currentPlan,
		});
		await runAction("cancel", () =>
			authClient.subscription.cancel({
				returnUrl: window.location.href,
				...getReferenceParams(),
			}),
		);
	};

	const handleRestore = async () => {
		await runAction("restore", () =>
			authClient.subscription.restore({
				...getReferenceParams(),
			}),
		);
		await queryClient.invalidateQueries({ queryKey: subQuery.queryKey });
		posthog.capture("subscription_restored", {
			plan: currentPlan,
		});
		toast.success("Subscription restored");
	};

	const isPaidPlan = currentPlan !== "free";
	const hasPendingCancel = !!sub?.cancelAtPeriodEnd;
	const isOrgScoped = sub?.scope === "organization";

	return (
		<div className="mx-auto w-full max-w-[1320px]">
			<div className="mb-8">
				<h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">
					Billing
				</h1>
				<p className="text-ds-muted text-sm mt-1">Manage your subscription</p>
			</div>
			{PAID_PLANS_COMING_SOON ? (
				<div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
					Paid plans are coming soon. Upgrade, downgrade, and Stripe checkout
					are temporarily disabled.
				</div>
			) : null}

			{isPaidPlan && (
				<div className="mb-6 border-2 border-ds-border rounded-2xl bg-ds-surface/60 p-4 sm:p-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<div className="font-extrabold tracking-wide text-sm">
								Current Subscription: {getPlanDisplayName(currentPlan)}
							</div>
							<div className="text-ds-muted text-xs mt-1">
								{isOrgScoped ? "Organization scoped" : "User scoped"}
								{sub?.periodEnd
									? ` Period ends: ${new Date(sub.periodEnd).toLocaleString()}`
									: ""}
							</div>
							{hasPendingCancel && (
								<div className="mt-2 inline-flex items-center gap-2 text-xs font-bold tracking-wide text-red-500">
									<TriangleAlert className="h-3.5 w-3.5" />
									Cancels at period end
								</div>
							)}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={handleManagePortal}
								disabled={busyAction !== null || PAID_PLANS_COMING_SOON}
								className="border-2 border-ds-border rounded-2xl bg-ds-surface/60 px-3 py-2 text-xs font-extrabold tracking-wide hover:bg-ds-surface disabled:opacity-50"
							>
								<Settings2 className="mr-2 inline h-3.5 w-3.5" />
								Manage in Stripe
							</button>
							{hasPendingCancel ? (
								<button
									type="button"
									onClick={handleRestore}
									disabled={busyAction !== null || PAID_PLANS_COMING_SOON}
									className="border-2 border-ds-accent px-3 py-2 text-xs font-extrabold tracking-wide text-ds-accent hover:bg-ds-accent hover:text-ds-accent-fg disabled:opacity-50"
								>
									<RotateCcw className="mr-2 inline h-3.5 w-3.5" />
									Restore
								</button>
							) : (
								<button
									type="button"
									onClick={handleCancel}
									disabled={busyAction !== null || PAID_PLANS_COMING_SOON}
									className="border-2 border-red-500 px-3 py-2 text-xs font-extrabold tracking-wide text-red-500 hover:bg-red-500 hover:text-black disabled:opacity-50"
								>
									Cancel Plan
								</button>
							)}
						</div>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-0">
				{plans.map((plan) => {
					const isCurrent = plan.id === currentPlan;
					const upgradeKey = `upgrade:${plan.id}`;
					const currentRank = planRank[currentPlan] ?? 0;
					const targetRank = planRank[plan.id] ?? 0;
					const isDowngrade = targetRank < currentRank;
					const disablePaidPlanActions =
						plan.comingSoon && PAID_PLANS_COMING_SOON;
					return (
						<div
							key={plan.id}
							className={`-mt-2 -ml-0 flex flex-col border-2 p-6 md:mt-0 md:-ml-2 md:p-8 first:ml-0 ${
								plan.popular
									? "bg-ds-accent text-ds-accent-fg border-ds-accent"
									: "border-ds-border"
							}`}
						>
							{plan.popular && (
								<div className="text-xs font-extrabold tracking-wide mb-4 bg-ds-bg text-ds-accent inline-block px-3 py-1 self-start">
									Recommended
								</div>
							)}
							<h3 className="text-2xl font-extrabold tracking-tighter">
								{plan.name}
							</h3>
							{disablePaidPlanActions ? (
								<div className="mt-2 inline-flex w-fit items-center rounded-lg border border-ds-border bg-ds-surface2 px-2 py-1 text-[11px] font-semibold text-ds-text-tertiary">
									Coming soon
								</div>
							) : null}
							<div className="mt-4">
								<span className="text-4xl font-extrabold sm:text-5xl">
									{plan.price}
								</span>
								<span
									className={`text-sm ${plan.popular ? "opacity-60" : "text-ds-muted"}`}
								>
									{plan.period}
								</span>
							</div>
							<ul className="mt-8 space-y-3 flex-1">
								{plan.features.map((f) => (
									<li key={f} className="flex items-center gap-2 text-sm">
										<Check className="w-4 h-4 shrink-0" />
										{f}
									</li>
								))}
							</ul>
							<div className="mt-8">
								{isCurrent ? (
									<button
										type="button"
										disabled
										className={`w-full py-3 font-extrabold text-sm tracking-wide opacity-50 ${
											plan.popular
												? "bg-ds-bg text-ds-accent"
												: "border-2 border-ds-muted3 rounded-xl text-ds-muted"
										}`}
									>
										Current Plan
									</button>
								) : plan.id === "free" ? (
									<button
										type="button"
										disabled
										className="w-full py-3 font-extrabold text-sm tracking-wide border-2 border-ds-muted3 rounded-xl text-ds-muted opacity-50"
									>
										Downgrade
									</button>
								) : disablePaidPlanActions ? (
									<button
										type="button"
										disabled
										className={`w-full py-3 font-extrabold text-sm tracking-wide opacity-70 ${
											plan.popular
												? "bg-ds-bg text-ds-accent"
												: "border-2 border-ds-muted3 rounded-xl text-ds-muted"
										}`}
									>
										Coming soon
									</button>
								) : (
									<button
										type="button"
										onClick={() => handleUpgrade(plan.id)}
										disabled={busyAction !== null}
										className={`w-full py-3 font-extrabold text-sm tracking-wide transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 ${
											plan.popular
												? "bg-ds-bg text-ds-accent hover:opacity-90"
												: "border-2 border-ds-border-strong rounded-2xl shadow-[4px 4px 0 0 var(--color-ds-border-strong)] hover:bg-ds-border-strong hover:text-ds-bg"
										}`}
									>
										<Zap className="w-4 h-4" />
										{busyAction === upgradeKey
											? isDowngrade
												? "Downgrading..."
												: "Upgrading..."
											: isDowngrade
												? "Downgrade"
												: "Upgrade"}
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
