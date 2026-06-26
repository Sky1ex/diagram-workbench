/** Ломаная ортогональная линия source → target (TB: вниз — горизонталь — вверх). */
export function buildOrthogonalStepPath(
	sourceX,
	sourceY,
	targetX,
	targetY
) {
	const midY = sourceY + (targetY - sourceY) / 2;
	return `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
}