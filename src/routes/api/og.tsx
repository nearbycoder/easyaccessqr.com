import { createFileRoute } from "@tanstack/react-router";
import { withServerSecurityHeaders } from "@/lib/server-security";

type OgPage = "home" | "docs" | "privacy" | "terms";

const themes: Record<
	OgPage,
	{
		label: string;
		title: string;
		subtitle: string;
		accent: string;
	}
> = {
	home: {
		label: "Easy Access QR",
		title: "QR campaigns, managed clearly.",
		subtitle: "Dynamic QR code creation and scan analytics for organizations.",
		accent: "#de6346",
	},
	docs: {
		label: "Easy Access QR",
		title: "Api reference",
		subtitle: "Use API keys to automate QR creation and scan reporting.",
		accent: "#3f8f8c",
	},
	privacy: {
		label: "Easy Access QR",
		title: "Privacy policy",
		subtitle: "How Easy Access QR handles data and security.",
		accent: "#3f8f8c",
	},
	terms: {
		label: "Easy Access QR",
		title: "Terms of service",
		subtitle: "Rules and responsibilities for using Easy Access QR.",
		accent: "#3f8f8c",
	},
};

function resolvePage(value: string | null): OgPage {
	if (value === "docs" || value === "privacy" || value === "terms") {
		return value;
	}
	return "home";
}

function sanitizeText(
	value: string | null,
	fallback: string,
	maxLength: number,
) {
	if (!value) return fallback;
	const trimmed = value.replace(/\s+/g, " ").trim();
	if (!trimmed) return fallback;
	return trimmed.slice(0, maxLength);
}

function buildOgImage(
	label: string,
	title: string,
	subtitle: string,
	accent: string,
	qrImageUrl: string,
) {
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				position: "relative",
				background: "linear-gradient(140deg, #1f2427 0%, #192126 100%)",
				fontFamily: "Inter, Segoe UI, Arial, sans-serif",
				overflow: "hidden",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: -80,
					bottom: -110,
					width: 360,
					height: 360,
					borderRadius: 9999,
					background: "rgba(222, 99, 70, 0.14)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					right: -60,
					top: -70,
					width: 300,
					height: 300,
					borderRadius: 9999,
					background: "rgba(63, 143, 140, 0.16)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 44,
					top: 40,
					width: 1112,
					height: 550,
					borderRadius: 30,
					border: "2px solid #3d4a4f",
					background: "linear-gradient(90deg, #242c31 0%, #1f272d 100%)",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						padding: "22px 40px",
						borderBottom: "1px solid #3d4a4f",
					}}
				>
					<div
						style={{
							fontSize: 60,
							fontWeight: 900,
							color: accent,
							letterSpacing: "-0.02em",
						}}
					>
						{label}
					</div>
				</div>
				<div
					style={{
						display: "flex",
						flex: 1,
						alignItems: "center",
						justifyContent: "space-between",
						padding: "44px 54px 48px",
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							maxWidth: 650,
							paddingRight: 26,
						}}
					>
						<h1
							style={{
								margin: 0,
								fontSize: 72,
								lineHeight: 1.06,
								fontWeight: 700,
								letterSpacing: "-0.03em",
								color: "#edf2f2",
							}}
						>
							{title}
						</h1>
						<p
							style={{
								margin: "22px 0 0",
								fontSize: 31,
								lineHeight: 1.28,
								fontWeight: 500,
								letterSpacing: "-0.01em",
								color: "#b2c0c1",
							}}
						>
							{subtitle}
						</p>
						<div
							style={{
								display: "flex",
								marginTop: 28,
								width: 304,
								height: 1,
								background: "rgba(63, 143, 140, 0.55)",
							}}
						/>
						<div
							style={{
								display: "flex",
								marginTop: 14,
								fontSize: 26,
								fontWeight: 700,
								letterSpacing: "-0.005em",
								color: "#9cd2ce",
							}}
						>
							easyaccessqr.com
						</div>
					</div>
					<div
						style={{
							display: "flex",
							width: 334,
							height: 334,
							alignItems: "center",
							justifyContent: "center",
							borderRadius: 26,
							border: "1px solid #46575c",
							background: "linear-gradient(180deg, #1f272d 0%, #202a2f 100%)",
						}}
					>
						<img
							src={qrImageUrl}
							alt="QR preview"
							style={{
								width: 300,
								height: 300,
								objectFit: "contain",
								borderRadius: 14,
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

const serverHandlers = import.meta.env.SSR
	? {
			GET: async ({ request }: { request: Request }) => {
				const { ImageResponse } = await import("@vercel/og");
				const url = new URL(request.url);
				const page = resolvePage(url.searchParams.get("page"));
				const theme = themes[page];
				const title = sanitizeText(
					url.searchParams.get("title"),
					theme.title,
					70,
				);
				const subtitle = sanitizeText(
					url.searchParams.get("subtitle"),
					theme.subtitle,
					140,
				);
				const qrImageUrl = new URL("/qr.png", url).toString();
				const image = new ImageResponse(
					buildOgImage(
						theme.label,
						title,
						subtitle,
						theme.accent,
						qrImageUrl,
					),
					{
						width: 1200,
						height: 630,
						headers: {
							"cache-control": "public, max-age=3600",
						},
					},
				);

				return withServerSecurityHeaders(image, {
					request,
					frameOptions: null,
				});
			},
		}
	: {};

export const Route = createFileRoute("/api/og")({
	server: {
		handlers: serverHandlers,
	},
});
