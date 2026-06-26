import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';

import {
	getGraphDefinition,
	loadGraphDocument
} from '@graphModel';

import { collectFolderHostFlowIds } from './collectFolderHostFlowIds';

const GraphDocumentContext = createContext(null);

function findHostNode(document, hostNodeId) {
	for (const graph of Object.values(document.graphs)) {
		const node = graph.nodes.find((n) => n.id === hostNodeId);
		if (node) return node;
	}
	return null;
}

function resolveActiveGraph(
	document,
	stack
) {
	if (stack.length === 0) {
		return document.graphs[document.rootGraphId];
	}
	const last = stack[stack.length - 1];
	return getGraphDefinition(document, last.subgraphId) ?? document.graphs[document.rootGraphId];
}

export function GraphDocumentProvider({
	datasetId,
	children
}) {
	const document = useMemo(() => loadGraphDocument(datasetId), [datasetId]);
	const [navigationStack, setNavigationStack] = useState([]);
	const [expandedHostFlowIds, setExpandedHostFlowIds] = useState(() => new Set());
	const yfilesControllersRef = useRef(new Map());

	useEffect(() => {
		setNavigationStack([]);
		setExpandedHostFlowIds(new Set());
	}, [datasetId]);

	const openSubgraph = useCallback(
		(hostNodeId) => {
			const host = findHostNode(document, hostNodeId);
			if (!host?.subgraphId) return;
			const subgraph = getGraphDefinition(document, host.subgraphId);
			if (!subgraph) return;
			setNavigationStack((prev) => {
				const existing = prev.findIndex((e) => e.hostNodeId === hostNodeId);
				const entry = {
					hostNodeId,
					subgraphId: host.subgraphId,
					label: host.label
				};
				if (existing >= 0) return prev.slice(0, existing + 1);
				return [...prev, entry];
			});
		},
		[document]
	);

	const navigateToStackIndex = useCallback((index) => {
		if (index < 0) {
			setNavigationStack([]);
			return;
		}
		setNavigationStack((prev) => prev.slice(0, index + 1));
	}, []);

	const resetNavigation = useCallback(() => setNavigationStack([]), []);

	const toggleFolderExpand = useCallback((hostFlowId) => {
		setExpandedHostFlowIds((prev) => {
			const next = new Set(prev);
			if (next.has(hostFlowId)) {
				next.delete(hostFlowId);
				return next;
			}
			next.add(hostFlowId);
			return next;
		});
	}, []);

	const expandAllFolders = useCallback(() => {
		setExpandedHostFlowIds(new Set(collectFolderHostFlowIds(document)));
		resetNavigation();
		for (const controller of yfilesControllersRef.current.values()) {
			controller.expandAll();
		}
	}, [document, resetNavigation]);

	const collapseAllFolders = useCallback(() => {
		setExpandedHostFlowIds(new Set());
		resetNavigation();
		for (const controller of yfilesControllersRef.current.values()) {
			controller.collapseAll();
		}
	}, [resetNavigation]);

	const registerYFilesController = useCallback(
		(id, controller) => {
			yfilesControllersRef.current.set(id, controller);
			return () => {
				yfilesControllersRef.current.delete(id);
			};
		},
		[]
	);

	const activeGraph = useMemo(
		() => resolveActiveGraph(document, navigationStack),
		[document, navigationStack]
	);

	const value = useMemo(
		() => ({
			document,
			datasetId,
			activeGraph,
			navigationStack,
			expandedHostFlowIds,
			openSubgraph,
			navigateToStackIndex,
			resetNavigation,
			toggleFolderExpand,
			expandAllFolders,
			collapseAllFolders,
			registerYFilesController
		}),
		[
			document,
			datasetId,
			activeGraph,
			navigationStack,
			expandedHostFlowIds,
			openSubgraph,
			navigateToStackIndex,
			resetNavigation,
			toggleFolderExpand,
			expandAllFolders,
			collapseAllFolders,
			registerYFilesController
		]
	);

	return (
		<GraphDocumentContext.Provider value={value}>{children}</GraphDocumentContext.Provider>
	);
}

export function useGraphView() {
	const ctx = useContext(GraphDocumentContext);
	if (!ctx) {
		throw new Error('useGraphView must be used within GraphDocumentProvider');
	}
	return ctx;
}