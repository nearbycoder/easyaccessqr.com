import { useCallback, useEffect, useRef, useState } from "react";
import type { z } from "zod";

// Never write until a preference is changed; loading another workspace cannot
// accidentally overwrite its existing values with the previous workspace's state.
export function useBrowserStorage<T>(
	key: string,
	schema: z.ZodType<T>,
	fallback: T,
) {
	const [entry, setEntry] = useState({ key: "", value: fallback });
	const current = useRef(entry);
	useEffect(() => {
		const read = () => {
			let value = fallback;
			try {
				const raw = localStorage.getItem(key);
				const result = raw ? schema.safeParse(JSON.parse(raw)) : null;
				if (result?.success) value = result.data;
			} catch {
				/* Storage may be blocked or contain an old schema. */
			}
			current.current = { key, value };
			setEntry(current.current);
		};
		read();
		const sync = (event: StorageEvent) => {
			if (event.key === key || event.key === null) read();
		};
		window.addEventListener("storage", sync);
		return () => window.removeEventListener("storage", sync);
	}, [key, schema, fallback]);
	const update = useCallback(
		(value: T | ((previous: T) => T)) => {
			if (current.current.key !== key) return false;
			const parsed = schema.safeParse(
				typeof value === "function"
					? (value as (previous: T) => T)(current.current.value)
					: value,
			);
			if (!parsed.success) return false;
			const next = parsed.data;
			try {
				localStorage.setItem(key, JSON.stringify(next));
			} catch {
				return false;
			}
			current.current = { key, value: next };
			setEntry(current.current);
			return true;
		},
		[key, schema],
	);
	return [entry.key === key ? entry.value : fallback, update] as const;
}
