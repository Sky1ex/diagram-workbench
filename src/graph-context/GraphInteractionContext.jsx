import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState
} from 'react';

import { applyBranchHidingToVisibility } from './branchVisibility';
import { computeFilterVisibility } from './filterGraphScene';
import {
	emptyFilterCriteria,
	isFilterActive
} from './graphFilterTypes';

import { useGraphView } from './GraphDocumentContext';

const GraphInteractionContext = createContext(null);

export function GraphInteractionProvider({ children }) {
	const { datasetId, document, expandedHostFlowIds } = useGraphView();
	const [contextMenu, setContextMenu] = useState(null);
	const [filterCriteria, setFilterCriteria] = useState(null);
	const [hiddenBranchAnchors, setHiddenBranchAnchors] = useState(
		() => new Set()
	);

	const filterVisibility = useMemo(
		() => computeFilterVisibility(document, filterCriteria, expandedHostFlowIds),
		[document, filterCriteria, expandedHostFlowIds]
	);

	const visibility = useMemo(
		() =>
			applyBranchHidingToVisibility(
				filterVisibility,
				hiddenBranchAnchors,
				document,
				expandedHostFlowIds
			),
		[filterVisibility, hiddenBranchAnchors, document, expandedHostFlowIds]
	);

	const filterActive = isFilterActive(filterCriteria);
	const branchChildrenHiddenActive = hiddenBranchAnchors.size > 0;
	const sceneVisibilityActive = filterActive || branchChildrenHiddenActive;

	const openContextMenu = useCallback((request) => {
		setContextMenu(request);
	}, []);

	const closeContextMenu = useCallback(() => {
		setContextMenu(null);
	}, []);

	const applyFilter = useCallback((criteria) => {
		setFilterCriteria(isFilterActive(criteria) ? criteria : null);
	}, []);

	const clearFilter = useCallback(() => {
		setFilterCriteria(null);
	}, []);

	const toggleBranchChildrenHidden = useCallback((anchorFlowId) => {
		setHiddenBranchAnchors((prev) => {
			const next = new Set(prev);
			if (next.has(anchorFlowId)) {
				next.delete(anchorFlowId);
			} else {
				next.add(anchorFlowId);
			}
			return next;
		});
	}, []);

	const isBranchChildrenHidden = useCallback(
		(anchorFlowId) => hiddenBranchAnchors.has(anchorFlowId),
		[hiddenBranchAnchors]
	);

	useEffect(() => {
		setHiddenBranchAnchors(new Set());
	}, [datasetId, document.rootGraphId]);

	const value = useMemo(
		() => ({
			contextMenu,
			filterCriteria,
			filterActive,
			branchChildrenHiddenActive,
			sceneVisibilityActive,
			filterVisibility,
			visibility,
			openContextMenu,
			closeContextMenu,
			applyFilter,
			clearFilter,
			toggleBranchChildrenHidden,
			isBranchChildrenHidden
		}),
		[
			contextMenu,
			filterCriteria,
			filterActive,
			branchChildrenHiddenActive,
			sceneVisibilityActive,
			filterVisibility,
			visibility,
			openContextMenu,
			closeContextMenu,
			applyFilter,
			clearFilter,
			toggleBranchChildrenHidden,
			isBranchChildrenHidden
		]
	);

	return (
		<GraphInteractionContext.Provider value={value}>{children}</GraphInteractionContext.Provider>
	);
}

export function useGraphInteraction() {
	const ctx = useContext(GraphInteractionContext);
	if (!ctx) {
		throw new Error('useGraphInteraction must be used within GraphInteractionProvider');
	}
	return ctx;
}

export function buildInitialFilterDraft(
	_target,
	current
) {
	if (current && isFilterActive(current)) {
		return { ...current };
	}
	return emptyFilterCriteria();
}