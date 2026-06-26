export function pointsToSvgPath(points) {
	if (points.length === 0) return '';
	if (points.length === 1) {
		const p = points[0];
		return `M ${p.x} ${p.y}`;
	}
	return points.
		map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).
		join(' ');
}