import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
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
	const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
		<>
			<header className="sticky top-0 z-40 border-b border-ds-border bg-ds-surface/95 backdrop-blur-sm">
				<div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
					<button
						type="button"
						aria-label="Open navigation menu"
						onClick={() => setMobileNavOpen(true)}
						className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-ds-border bg-ds-input-bg text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent lg:hidden"
					>
						<Menu className="h-5 w-5" />
					</button>
					<Link
						to="/"
						aria-label="Easy Access QR home"
						className="shrink-0 whitespace-nowrap text-xl font-extrabold leading-none tracking-tight text-[#de6346] sm:text-2xl lg:text-[30px]"
					>
						Easy Access QR
					</Link>
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
					<div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
						<div className="hidden lg:block">
							<ThemeToggle />
						</div>
						{!isLoggedIn ? (
							<Link
								to="/auth/sign-in"
								search={{ invitationId: undefined, email: undefined }}
								className="inline-flex px-2 py-2 text-xs font-semibold text-ds-accent transition-colors hover:text-ds-accent-hover sm:px-3 sm:text-sm lg:px-4"
							>
								Sign in
							</Link>
						) : null}
						<Link
							to={isLoggedIn ? "/app" : "/auth/sign-up"}
							aria-label={isLoggedIn ? "Open dashboard" : "Create free account"}
							search={
								isLoggedIn
									? undefined
									: { invitationId: undefined, email: undefined }
							}
							className="inline-flex shrink-0 items-center gap-2 border border-ds-accent bg-ds-accent px-3 py-2 text-xs font-semibold text-ds-accent-fg transition-colors hover:bg-ds-accent-hover sm:px-4 sm:text-sm"
						>
							<span className="sm:hidden">
								{isLoggedIn ? "Dashboard" : "Get started"}
							</span>
							<span className="hidden sm:inline">
								{isLoggedIn ? "Open dashboard" : "Create free account"}
							</span>
						</Link>
					</div>
				</div>
			</header>
			<Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
				<SheetContent
					side="left"
					className="w-[88vw] max-w-sm border-r border-ds-border bg-ds-surface p-0 text-ds-fg"
				>
					<SheetHeader className="border-b border-ds-border p-5 text-left">
						<SheetTitle className="text-xl font-extrabold text-[#de6346]">
							Easy Access QR
						</SheetTitle>
						<SheetDescription className="text-ds-text-secondary">
							Explore the product and account options.
						</SheetDescription>
					</SheetHeader>
					<nav
						aria-label="Mobile navigation"
						className="flex flex-col p-3 text-base font-semibold"
					>
						<a
							href={featuresHref}
							onClick={() => setMobileNavOpen(false)}
							className="rounded-xl px-3 py-3 hover:bg-ds-surface2"
						>
							Features
						</a>
						<a
							href={productHref}
							onClick={() => setMobileNavOpen(false)}
							className="rounded-xl px-3 py-3 hover:bg-ds-surface2"
						>
							Product
						</a>
						<a
							href={pricingHref}
							onClick={() => setMobileNavOpen(false)}
							className="rounded-xl px-3 py-3 hover:bg-ds-surface2"
						>
							Billing
						</a>
						<Link
							to="/terms"
							onClick={() => setMobileNavOpen(false)}
							className="rounded-xl px-3 py-3 hover:bg-ds-surface2"
						>
							Terms
						</Link>
						<Link
							to="/privacy"
							onClick={() => setMobileNavOpen(false)}
							className="rounded-xl px-3 py-3 hover:bg-ds-surface2"
						>
							Privacy
						</Link>
					</nav>
					<div className="mt-auto space-y-3 border-t border-ds-border p-4">
						<div className="grid grid-cols-2 gap-2">
							{!isLoggedIn ? (
								<Link
									to="/auth/sign-in"
									search={{ invitationId: undefined, email: undefined }}
									onClick={() => setMobileNavOpen(false)}
									className="inline-flex items-center justify-center border border-ds-border bg-ds-input-bg px-3 py-2 text-sm font-semibold text-ds-text-secondary"
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
								onClick={() => setMobileNavOpen(false)}
								className={`${isLoggedIn ? "col-span-2" : ""} inline-flex items-center justify-center border border-ds-accent bg-ds-accent px-3 py-2 text-sm font-semibold text-ds-accent-fg`}
							>
								{isLoggedIn ? "Open dashboard" : "Create account"}
							</Link>
						</div>
						<ThemeToggle />
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
