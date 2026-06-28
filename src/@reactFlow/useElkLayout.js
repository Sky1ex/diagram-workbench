import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	useEdgesState,
	useNodesState
} from '@xyflow/react';

import {
	applyElkResult,
	buildInlineFlowScene,
	disposeElkLayoutWorker,
	elkGraphFromFlowElements,
	getElkLayoutOptions,
	isLargeGraph,
	layoutExpandedInlineScene,
	LARGE_GRAPH_LAYOUT_DEBOUNCE_MS,
	LAYOUT_DEBOUNCE_MS,
	resolveGraphSizeProfile,
	resolveInlineExpandEdges,
	runDagreLayout,
	runElkLayout,
	wrapExpandedGroups
} from '@graphLayout';

function yieldToMain() {
	return new Promise((resolve) => {
		window.setTimeout(resolve, 0);
	});
}

function expandedSetKey(expandedHostFlowIds) {
	return [...expandedHostFlowIds].sort().join('|');
}

function countDocumentNodes(document) {
	return Object.values(document.graphs).reduce((sum, graph) => sum + graph.nodes.length, 0);
}

export function useElkLayout({
	document,
	datasetId,
	expandedHostFlowIds,
	layoutGeneration,
	onLayoutingChange,
	onLayoutApplied
}) {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [layoutError, setLayoutError] = useState(null);
	const [isLayouting, setIsLayouting] = useState(false);
	const [layoutEngine, setLayoutEngine] = useState(null);
	const [visibleNodeCount, setVisibleNodeCount] = useState(0);
	const [visibleEdgeCount, setVisibleEdgeCount] = useState(0);
	const layoutEpochRef = useRef(0);
	const layoutFitViewRef = useRef(true);

	const rootGraph = document.graphs[document.rootGraphId];
	const rootNodeCount = rootGraph?.nodes.length ?? 0;
	const documentNodeCount = useMemo(() => countDocumentNodes(document), [document]);
	const largeGraphMode =
		isLargeGraph(rootNodeCount) ||
		isLargeGraph(documentNodeCount) || (
			datasetId?.startsWith('large-') ?? false);
	const sizeProfile = resolveGraphSizeProfile(rootNodeCount);
	const expandedKey = useMemo(
		() => expandedSetKey(expandedHostFlowIds),
		[expandedHostFlowIds]
	);

	const setLayouting = useCallback(
		(value) => {
			setIsLayouting(value);
			onLayoutingChange?.(value);
		},
		[onLayoutingChange]
	);

	const runLayout = useCallback(async () => {
		const epoch = ++layoutEpochRef.current;
		const fitView = layoutFitViewRef.current;
		layoutFitViewRef.current = false;
		setLayouting(true);
		setLayoutError(null);

		try {
			if (!rootGraph || rootNodeCount === 0) {
				setNodes([]);
				setEdges([]);
				setLayoutEngine(null);
				setVisibleNodeCount(0);
				setVisibleEdgeCount(0);
				return;
			}

			const { nodes: rawNodes, edges: rawEdges } = buildInlineFlowScene(
				document,
				expandedHostFlowIds,
				{ sizeProfile }
			);

			const layoutNodes = rawNodes.filter((n) => n.type !== 'groupNode');
			setVisibleNodeCount(layoutNodes.length);
			setVisibleEdgeCount(rawEdges.length);

			if (layoutNodes.length === 0) {
				setNodes([]);
				setEdges([]);
				setLayoutEngine(null);
				return;
			}

			const useDagre = largeGraphMode || isLargeGraph(layoutNodes.length);
			const hasExpandedHosts = expandedHostFlowIds.size > 0;
			const displayEdges = hasExpandedHosts ?
				resolveInlineExpandEdges(rawEdges, document, expandedHostFlowIds) :
				rawEdges;

			if (hasExpandedHosts || useDagre) {
				setLayoutEngine('dagre');
				await yieldToMain();
				if (epoch !== layoutEpochRef.current) return;

				const layoutedNodes = hasExpandedHosts ?
					layoutExpandedInlineScene(
						layoutNodes,
						displayEdges,
						expandedHostFlowIds,
						document
					) :
					runDagreLayout(layoutNodes, rawEdges).nodes;
				if (epoch !== layoutEpochRef.current) return;

				const wrappedNodes = wrapExpandedGroups(layoutedNodes, expandedHostFlowIds);
				setNodes(wrappedNodes);
				setEdges(displayEdges);
				onLayoutApplied?.({ fitView });
				return;
			}

			setLayoutEngine('elk');
			const elkGraph = elkGraphFromFlowElements(
				layoutNodes,
				rawEdges,
				getElkLayoutOptions()
			);
			const layoutedGraph = await runElkLayout(elkGraph);

			if (epoch !== layoutEpochRef.current) return;

			const { nodes: layoutedNodes, edges: layoutedEdges } = applyElkResult(
				layoutNodes,
				rawEdges,
				layoutedGraph
			);
			const wrappedNodes = wrapExpandedGroups(layoutedNodes, expandedHostFlowIds);
			setNodes(wrappedNodes);
			setEdges(layoutedEdges);
			onLayoutApplied?.({ fitView });
		} catch (error) {
			if (epoch !== layoutEpochRef.current) return;
			const message = error instanceof Error ? error.message : String(error);
			if (message === 'Layout superseded') return;
			setLayoutError(message);
		} finally {
			if (epoch === layoutEpochRef.current) {
				setLayouting(false);
			}
		}
	}, [
		document,
		expandedHostFlowIds,
		largeGraphMode,
		onLayoutApplied,
		rootGraph,
		rootNodeCount,
		setLayouting,
		setNodes,
		setEdges,
		sizeProfile
	]);

	const debounceMs = largeGraphMode ? LARGE_GRAPH_LAYOUT_DEBOUNCE_MS : LAYOUT_DEBOUNCE_MS;
	const prevRootGraphIdRef = useRef(null);
	const prevLayoutGenerationRef = useRef(null);

	useEffect(() => {
		const isInitialLayout = prevRootGraphIdRef.current === null;
		const rootGraphChanged = prevRootGraphIdRef.current !== document.rootGraphId;
		const layoutGenerationChanged = prevLayoutGenerationRef.current !== layoutGeneration;
		layoutFitViewRef.current =
			isInitialLayout || rootGraphChanged || layoutGenerationChanged;
		prevRootGraphIdRef.current = document.rootGraphId;
		prevLayoutGenerationRef.current = layoutGeneration;

		const timer = window.setTimeout(() => {
			void runLayout();
		}, debounceMs);
		return () => window.clearTimeout(timer);
	}, [document.rootGraphId, layoutGeneration, expandedKey, runLayout, debounceMs]);

	useEffect(() => {
		return () => {
			layoutEpochRef.current += 1;
			disposeElkLayoutWorker();
		};
	}, []);

	const isEmptyGraph = !isLayouting && !layoutError && rootNodeCount === 0;

	return {
		nodes,
		edges,
		onNodesChange,
		onEdgesChange,
		layoutError,
		isLayouting,
		isEmptyGraph,
		isLargeGraphMode: largeGraphMode,
		layoutEngine,
		visibleNodeCount,
		visibleEdgeCount
	};
}