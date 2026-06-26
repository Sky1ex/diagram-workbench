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

/** Admiral DateField: DD.MM.YYYY, календарные даты в UTC (как в graph-document timestamps). */
export function startOfUtcDay(ms) {
	const date = new Date(ms);
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function endOfUtcDay(ms) {
	return startOfUtcDay(ms) + 24 * 60 * 60 * 1000 - 1;
}

export function formatFilterDateInput(ms) {
	if (ms === undefined) return '';
	const date = new Date(ms);
	if (Number.isNaN(date.getTime())) return '';
	const dd = String(date.getUTCDate()).padStart(2, '0');
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
	const yyyy = date.getUTCFullYear();
	return `${dd}.${mm}.${yyyy}`;
}

/** Парсит DD.MM.YYYY из DateField; ISO YYYY-MM-DD — запасной вариант. */
export function parseFilterDateInput(value) {
	const trimmed = value.trim();
	if (!trimmed) return undefined;

	if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		const [ddStr, mmStr, yyyyStr] = trimmed.split('.');
		const dd = Number(ddStr);
		const mm = Number(mmStr);
		const yyyy = Number(yyyyStr);
		if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return undefined;
		const ms = Date.UTC(yyyy, mm - 1, dd);
		return Number.isNaN(ms) ? undefined : ms;
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		const ms = Date.parse(`${trimmed}T00:00:00.000Z`);
		return Number.isNaN(ms) ? undefined : ms;
	}

	return undefined;
}