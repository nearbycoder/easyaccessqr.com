import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";

type MarketingHeaderProps = {
	isHome?: boolean;
	featuresSectionId?: string;
	productSectionId?: string;
	pricingSectionId?: string;
};

export function MarketingHeader({
	isHome = false,
	featuresSectionId = "features",
	productSectionId = "product",
	pricingSectionId = "pricing",
}: MarketingHeaderProps) {
	const { data: session } = authClient.useSession();
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	const isLoggedIn = isHydrated && Boolean(session?.user);
	const featuresHref = isHome
		? `#${featuresSectionId}`
		: `/#${featuresSectionId}`;
	const productHref = isHome ? `#${productSectionId}` : `/#${productSectionId}`;
	const pricingHref = isHome ? `#${pricingSectionId}` : `/#${pricingSectionId}`;

	return (
		<header className="sticky top-0 z-40 border-b border-ds-border bg-ds-surface/95 backdrop-blur-sm">
			<div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
				<button
					type="button"
					className="inline-flex h-9 w-9 items-center justify-center text-ds-text-tertiary lg:hidden"
				>
					<Menu className="h-4 w-4" />
				</button>
				<div className="text-[30px] font-extrabold leading-none tracking-tight text-[#de6346]">
					Easy Access QR
				</div>
				<nav className="ml-4 hidden items-center gap-6 text-[15px] font-medium text-ds-text-secondary lg:flex">
					<a href={featuresHref} className="hover:text-ds-fg">
						Features
					</a>
					<a href={productHref} className="hover:text-ds-fg">
						Product
					</a>
					<a href={pricingHref} className="hover:text-ds-fg">
						Billing
					</a>
					<Link to="/terms" className="hover:text-ds-fg">
						Terms
					</Link>
					<Link to="/privacy" className="hover:text-ds-fg">
						Privacy
					</Link>
				</nav>
				<div className="ml-auto flex items-center gap-2">
					<div className="hidden lg:block">
						<ThemeToggle />
					</div>
					{!isLoggedIn ? (
						<Link
							to="/auth/sign-in"
							search={{ invitationId: undefined, email: undefined }}
							className="px-4 py-2 text-sm font-semibold text-ds-accent"
						>
							Sign in
						</Link>
					) : null}
					<Link
						to={isLoggedIn ? "/app" : "/auth/sign-up"}
						search={
							isLoggedIn
								? undefined
								: { invitationId: undefined, email: undefined }
						}
						className="inline-flex items-center gap-2 border border-ds-accent bg-ds-accent px-4 py-2 text-sm font-semibold text-ds-accent-fg transition-colors hover:bg-ds-accent-hover"
					>
						{isLoggedIn ? "Open dashboard" : "Create free account"}
					</Link>
				</div>
			</div>
		</header>
	);
}
