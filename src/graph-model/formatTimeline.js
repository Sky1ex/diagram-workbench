const timelineFormatter = new Intl.DateTimeFormat('ru-RU', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit'
});

function formatTimelineInstant(value) {
	return timelineFormatter.format(new Date(value));
}

export function formatTimelineRange(start, end) {
	if (start === end) return formatTimelineInstant(start);
	return `${formatTimelineInstant(start)} → ${formatTimelineInstant(end)}`;
}