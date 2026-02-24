export const MAX_QR_DESTINATIONS = 8;

export type QrDestinationRule = {
	id: string;
	label: string | null;
	url: string;
	weight: number;
};

type QrDestinationRuleInput = {
	id?: string | null;
	label?: string | null;
	url?: string | null;
	weight?: number | null;
};

const PERCENT_TOTAL = 100;

export function isHttpDestinationUrl(value: string) {
	try {
		const parsed = new URL(value.trim());
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

export function normalizeQrDestinations(
	input: unknown,
	fallbackUrl?: string | null,
): QrDestinationRule[] {
	const rawRows = Array.isArray(input)
		? (input as QrDestinationRuleInput[])
		: [];
	const cleaned = rawRows
		.slice(0, MAX_QR_DESTINATIONS)
		.map((row, index) => {
			const url = typeof row?.url === "string" ? row.url.trim() : "";
			if (!isHttpDestinationUrl(url)) return null;
			const rawWeight = Number(row?.weight);
			const weight = Number.isFinite(rawWeight)
				? Math.max(1, Math.round(rawWeight))
				: 1;
			const label =
				typeof row?.label === "string" ? row.label.trim().slice(0, 80) : "";

			return {
				id: normalizeDestinationId(row?.id, index),
				label: label || null,
				url,
				weight,
			} satisfies QrDestinationRule;
		})
		.filter((row): row is QrDestinationRule => Boolean(row));

	if (
		cleaned.length === 0 &&
		typeof fallbackUrl === "string" &&
		isHttpDestinationUrl(fallbackUrl)
	) {
		cleaned.push({
			id: "dest-1",
			label: "Primary",
			url: fallbackUrl.trim(),
			weight: PERCENT_TOTAL,
		});
	}

	if (cleaned.length === 0) {
		return [];
	}

	const normalizedWeights = normalizePercentWeights(
		cleaned.map((row) => row.weight),
	);
	return cleaned.map((row, index) => ({
		...row,
		weight: normalizedWeights[index] ?? 0,
	}));
}

export function hasValidDestinationConfig(input: unknown) {
	const destinations = normalizeQrDestinations(input);
	return (
		destinations.length > 0 &&
		destinations.every(
			(row) => row.weight > 0 && isHttpDestinationUrl(row.url),
		) &&
		destinations.reduce((sum, row) => sum + row.weight, 0) === PERCENT_TOTAL
	);
}

export function pickWeightedDestination(
	destinations: QrDestinationRule[],
	randomValue: number,
) {
	if (!destinations.length) return null;
	const clamped = Number.isFinite(randomValue)
		? Math.min(0.999999, Math.max(0, randomValue))
		: Math.random();
	const threshold = clamped * PERCENT_TOTAL;
	let cumulative = 0;
	for (const destination of destinations) {
		cumulative += destination.weight;
		if (threshold < cumulative) {
			return destination;
		}
	}
	return destinations[destinations.length - 1] ?? null;
}

export function getPrimaryDestinationUrl(
	destinations: unknown,
	fallbackDestinationUrl?: string | null,
) {
	const normalized = normalizeQrDestinations(
		destinations,
		fallbackDestinationUrl,
	);
	return normalized[0]?.url ?? "";
}

function normalizeDestinationId(id: string | null | undefined, index: number) {
	const trimmed = typeof id === "string" ? id.trim() : "";
	return trimmed || `dest-${index + 1}`;
}

function normalizePercentWeights(weights: number[]) {
	if (weights.length === 0) return [];
	const positive = weights.map((weight) =>
		Number.isFinite(weight) ? Math.max(1, weight) : 1,
	);
	const total = positive.reduce((sum, weight) => sum + weight, 0);
	if (total <= 0) {
		return distributeEvenly(weights.length);
	}

	const scaled = positive.map((weight) => (weight / total) * PERCENT_TOTAL);
	const floors = scaled.map((value) => Math.floor(value));
	let remaining = PERCENT_TOTAL - floors.reduce((sum, value) => sum + value, 0);

	const order = scaled
		.map((value, index) => ({ index, decimal: value - floors[index] }))
		.sort((a, b) => b.decimal - a.decimal || a.index - b.index);

	let cursor = 0;
	while (remaining > 0 && order.length > 0) {
		const target = order[cursor % order.length];
		if (!target) break;
		floors[target.index] += 1;
		remaining -= 1;
		cursor += 1;
	}

	return floors;
}

function distributeEvenly(length: number) {
	if (length <= 0) return [];
	const base = Math.floor(PERCENT_TOTAL / length);
	let remainder = PERCENT_TOTAL - base * length;
	return Array.from({ length }, () => {
		if (remainder > 0) {
			remainder -= 1;
			return base + 1;
		}
		return base;
	});
}
