export function formatFilterDateNativeInput(ms) {
	if (ms === undefined) return '';
	const date = new Date(ms);
	if (Number.isNaN(date.getTime())) return '';
	const yyyy = date.getUTCFullYear();
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(date.getUTCDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

export function parseFilterDateNativeInput(value) {
	const trimmed = value.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
	const ms = Date.parse(`${trimmed}T00:00:00.000Z`);
	return Number.isNaN(ms) ? undefined : ms;
}

/** UTC-границы календарного дня (как timestamps в graph-document). */
export function startOfUtcDay(ms) {
	const date = new Date(ms);
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function endOfUtcDay(ms) {
	return startOfUtcDay(ms) + 24 * 60 * 60 * 1000 - 1;
}