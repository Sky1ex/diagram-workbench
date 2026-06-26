export function isFilterActive(criteria) {
	if (!criteria) return false;
	if (criteria.labelContains?.trim()) return true;
	if (criteria.maxDepth !== undefined) return true;
	if (criteria.hasSubgraph !== undefined) return true;
	if (criteria.startAfter !== undefined) return true;
	if (criteria.startBefore !== undefined) return true;
	if (criteria.endAfter !== undefined) return true;
	if (criteria.endBefore !== undefined) return true;
	return false;
}

export function emptyFilterCriteria() {
	return {};
}