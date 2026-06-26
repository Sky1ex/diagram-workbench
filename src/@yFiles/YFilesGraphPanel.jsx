import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
	FoldingManager,
	GraphComponent,
	GraphEditorInputMode,
	GraphItemTypes,
	GraphOverviewComponent,
	EventRecognizers,
	Insets
} from 'yfiles';
import 'yfiles/yfiles.css';

import { useGraphView } from '@graphContext';
import { useGraphInteraction } from '@graphContext';

import { applyDefaultGraphStyles } from './applyYFilesStyles';
import {
	runHierarchicLayout
} from './applyYFilesLayout';

import { disposeEdgeBridges, installEdgeBridges } from './yFilesEdgeBridges';
import { buildMasterGraphFromDocument } from './graphDocumentToMasterGraph';
import { configureCanvasPanning } from './configureCanvasPanning';
import { createFolderNodeConverter } from './yFilesFolderConverter';
import { NodeInfoPanel } from './NodeInfoPanel';
import {
	applyEdgeSelectionHighlight,
	reapplyEdgeSelectionHighlight
} from './yFilesSelectionHighlight';

import {
	collapseAllFolders,
	expandAllFolders,
	syncFoldingViewToExpandedIds
} from './yFilesFoldingActions';

import { toFlowNodeId } from '@graphLayout';
import { registerYFilesLicense } from './registerLicense';

import {
	applyYFilesFilterVisibility,
	installYFilesContextMenuHandler,
	installYFilesFilterInputGuards
} from './yFilesGraphInteraction';

registerYFilesLicense();

const Root = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	width: 100%;
	height: 100%;
	position: relative;
	background: ${({ theme }) => theme.color['Neutral/Neutral 00']};
`;

const Toolbar = styled.div`
	flex-shrink: 0;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	padding: 8px 12px;
	border-bottom: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};
`;

const ToolbarLabel = styled.span`
	font-size: 12px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
	margin-right: 4px;
`;

const ToolButton = styled.button`
	height: 28px;
	padding: 0 12px;
	border: 1px solid
		${({ theme, $active }) =>
		$active ? theme.color['Primary/Primary 60 Main'] : theme.color['Neutral/Neutral 30']};
	border-radius: 6px;
	background: ${({ theme, $active }) =>
		$active ? theme.color['Primary/Primary 10'] : theme.color['Neutral/Neutral 05']};
	color: ${({ theme, $active }) =>
		$active ? theme.color['Primary/Primary 60 Main'] : theme.color['Neutral/Neutral 90']};
	font-size: 13px;
	cursor: pointer;

	&:hover:not(:disabled) {
		background: ${({ theme, $active }) =>
		$active ? theme.color['Primary/Primary 20'] : theme.color['Neutral/Neutral 10']};
		border-color: ${({ theme, $active }) =>
		$active ? theme.color['Primary/Primary 60 Main'] : theme.color['Neutral/Neutral 40']};
	}

	&:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
`;

const CanvasArea = styled.div`
	flex: 1;
	min-height: 0;
	position: relative;
	display: flex;
`;

const GraphHost = styled.div`
	flex: 1;
	min-width: 0;
	min-height: 0;
	width: 100%;
	height: 100%;
`;

const OverviewHost = styled.div`
	position: absolute;
	right: 12px;
	bottom: 12px;
	width: 200px;
	height: 140px;
	border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
	border-radius: 8px;
	background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	overflow: hidden;
	z-index: 2;
`;

const Hint = styled.div`
	position: absolute;
	left: 12px;
	bottom: 12px;
	padding: 6px 10px;
	border-radius: 6px;
	font-size: 12px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
	background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
	border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};
	z-index: 2;
	pointer-events: none;
`;

export default function YFilesGraphPanel({
	style,
	chrome = 'full',
	yfilesControllerId
}) {
	const {
		document,
		openSubgraph,
		resetNavigation,
		registerYFilesController,
		expandedHostFlowIds,
		toggleFolderExpand,
		expandAllFolders: expandAllFoldersInContext,
		collapseAllFolders: collapseAllFoldersInContext
	} = useGraphView();

	const { openContextMenu, sceneVisibilityActive, visibility } = useGraphInteraction();
	const graphHostRef = useRef(null);
	const overviewHostRef = useRef(null);
	const runtimeRef = useRef(null);
	const suppressFoldSyncRef = useRef(false);
	const openSubgraphRef = useRef(openSubgraph);
	const resetNavigationRef = useRef(resetNavigation);
	const openContextMenuRef = useRef(openContextMenu);
	const toggleFolderExpandRef = useRef(toggleFolderExpand);
	const expandedHostFlowIdsRef = useRef(expandedHostFlowIds);

	openSubgraphRef.current = openSubgraph;
	resetNavigationRef.current = resetNavigation;
	openContextMenuRef.current = openContextMenu;
	toggleFolderExpandRef.current = toggleFolderExpand;
	expandedHostFlowIdsRef.current = expandedHostFlowIds;

	const expandedKey = useMemo(
		() => [...expandedHostFlowIds].sort().join('|'),
		[expandedHostFlowIds]
	);

	const [canvasReady, setCanvasReady] = useState(false);
	const [nodeSelection, setNodeSelection] = useState(null);
	const [edgeRoutingMode, setEdgeRoutingMode] =
		useState('orthogonal');
	const edgeRoutingModeRef = useRef(edgeRoutingMode);
	edgeRoutingModeRef.current = edgeRoutingMode;
	const filterContextRef = useRef({
		visibilityActive: false,
		visibleNodeIds: new Set(),
		visibleEdgeIds: new Set()
	});
	filterContextRef.current = {
		visibilityActive: sceneVisibilityActive,
		visibleNodeIds: visibility.visibleNodeIds,
		visibleEdgeIds: visibility.visibleEdgeIds
	};

	useEffect(() => {
		const graphHost = graphHostRef.current;
		const overviewHost = overviewHostRef.current;
		if (!graphHost || !overviewHost) return;

		setCanvasReady(false);
		setNodeSelection(null);
		runtimeRef.current = null;

		const graphComponent = new GraphComponent(graphHost);
		const overviewComponent = new GraphOverviewComponent(overviewHost);
		overviewComponent.graphComponent = graphComponent;

		const masterGraph = buildMasterGraphFromDocument(document);
		const foldingManager = new FoldingManager(masterGraph);
		foldingManager.folderNodeConverter = createFolderNodeConverter();
		const foldingView = foldingManager.createFoldingView();
		const viewGraph = foldingView.graph;

		graphComponent.graph = viewGraph;
		applyDefaultGraphStyles(viewGraph);

		collapseAllFolders(foldingView);

		const inputMode = new GraphEditorInputMode({
			allowCreateNode: false,
			allowCreateEdge: false,
			allowEditLabel: false,
			deletableItems: GraphItemTypes.NONE,
			showHandleItems: GraphItemTypes.NONE,
			selectableItems: GraphItemTypes.NODE | GraphItemTypes.EDGE,
			focusableItems: GraphItemTypes.NODE | GraphItemTypes.EDGE
		});

		inputMode.moveInputMode.enabled = false;
		inputMode.moveLabelInputMode.enabled = false;
		inputMode.multiSelectionRecognizer = EventRecognizers.NEVER;
		inputMode.ignoreVoidStyles = true;
		installYFilesFilterInputGuards(inputMode);
		configureCanvasPanning(inputMode);
		const nav = inputMode.navigationInputMode;
		nav.enabled = true;
		nav.allowCollapseGroup = true;
		nav.allowExpandGroup = true;
		nav.fitContentAfterGroupActions = true;
		graphComponent.inputMode = inputMode;
		installEdgeBridges(graphComponent);

		const removeContextMenuHandler = installYFilesContextMenuHandler({
			graphComponent,
			inputMode,
			foldingView,
			document,
			onOpenContextMenu: (request) => {
				openContextMenuRef.current?.(request);
			}
		});

		const syncSelection = () => {
			const selected = graphComponent.selection.selectedNodes.toArray();
			const filter = filterContextRef.current;
			if (selected.length !== 1) {
				applyEdgeSelectionHighlight(viewGraph, graphComponent, null, filter);
				setNodeSelection(null);
				return;
			}

			const node = selected[0];
			applyEdgeSelectionHighlight(viewGraph, graphComponent, node, filter);
			const tag = node.tag;
			if (!tag) {
				setNodeSelection(null);
				return;
			}

			const masterNode = foldingView.getMasterItem(node) ?? node;
			setNodeSelection({
				tag,
				isFolder: Boolean(tag.subgraphId),
				isExpanded: tag.subgraphId ? foldingView.isExpanded(masterNode) : false
			});
		};

		graphComponent.selection.addItemSelectionChangedListener(syncSelection);

		let layoutGeneration = 0;
		const scheduleLayout = (fromSketch) => {
			const gen = ++layoutGeneration;
			void runHierarchicLayout(graphComponent, {
				fromSketch,
				edgeRouting: edgeRoutingModeRef.current
			}).then(() => {
				if (gen !== layoutGeneration) return;
				reapplyEdgeSelectionHighlight(graphComponent, filterContextRef.current);
				graphComponent.invalidate();
				graphComponent.fitGraphBounds(new Insets(40));
			});
		};

		runtimeRef.current = { graphComponent, foldingView, scheduleLayout };
		setCanvasReady(true);

		scheduleLayout(false);

		const syncExpandedHostFromFold = (item, expanded) => {
			if (suppressFoldSyncRef.current || !item) return;
			const masterNode = foldingView.getMasterItem(item) ?? item;
			const tag = masterNode.tag;
			if (!tag?.subgraphId) return;
			const flowId = toFlowNodeId(tag.graphId, tag.localId);
			const inSet = expandedHostFlowIdsRef.current.has(flowId);
			if (expanded === inSet) return;
			toggleFolderExpandRef.current(flowId);
		};

		const onStructureChange = () => scheduleLayout(true);
		const onGroupCollapsed = (_, evt) => {
			syncExpandedHostFromFold(evt.item ?? null, false);
			onStructureChange();
		};
		const onGroupExpanded = (_, evt) => {
			syncExpandedHostFromFold(evt.item ?? null, true);
			onStructureChange();
		};
		const onGroupEntered = (_, evt) => {
			const tag = evt.item?.tag;
			if (tag?.subgraphId) openSubgraphRef.current(tag.localId);
		};

		nav.addGroupCollapsedListener(onGroupCollapsed);
		nav.addGroupExpandedListener(onGroupExpanded);
		nav.addGroupEnteredListener(onGroupEntered);

		const resizeObserver = new ResizeObserver(() => {
			graphComponent.updateContentRect();
		});
		resizeObserver.observe(graphHost);

		return () => {
			layoutGeneration++;
			removeContextMenuHandler();
			runtimeRef.current = null;
			setCanvasReady(false);
			setNodeSelection(null);
			graphComponent.selection.removeItemSelectionChangedListener(syncSelection);
			resizeObserver.disconnect();
			nav.removeGroupCollapsedListener(onGroupCollapsed);
			nav.removeGroupExpandedListener(onGroupExpanded);
			nav.removeGroupEnteredListener(onGroupEntered);
			disposeEdgeBridges(graphComponent);
			overviewComponent.cleanUp();
			graphComponent.cleanUp();
		};
	}, [document]);

	useEffect(() => {
		if (!canvasReady) return;
		runtimeRef.current?.scheduleLayout(false);
	}, [edgeRoutingMode, canvasReady]);

	const handleExpandAll = useCallback(() => {
		const runtime = runtimeRef.current;
		if (!runtime) return;
		expandAllFolders(runtime.foldingView);
		runtime.scheduleLayout(true);
	}, []);

	const handleCollapseAll = useCallback(() => {
		const runtime = runtimeRef.current;
		if (!runtime) return;
		collapseAllFolders(runtime.foldingView);
		resetNavigationRef.current();
		runtime.scheduleLayout(true);
	}, []);

	useEffect(() => {
		const runtime = runtimeRef.current;
		if (!runtime || !canvasReady) return;

		suppressFoldSyncRef.current = true;
		const structureChanged = syncFoldingViewToExpandedIds(
			runtime.foldingView,
			expandedHostFlowIds
		);
		suppressFoldSyncRef.current = false;

		applyYFilesFilterVisibility(
			runtime.graphComponent,
			runtime.foldingView,
			document,
			visibility.visibleNodeIds,
			visibility.visibleEdgeIds,
			sceneVisibilityActive
		);

		if (structureChanged) {
			runtime.scheduleLayout(true);
		}
		// expandedKey сериализует expandedHostFlowIds (Set нестабилен по ссылке в deps)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		canvasReady,
		document,
		expandedKey,
		sceneVisibilityActive,
		visibility.visibleNodeIds,
		visibility.visibleEdgeIds,
		visibility.noMatchesInView
	]);

	useEffect(() => {
		if (!yfilesControllerId || !canvasReady) return;
		return registerYFilesController(yfilesControllerId, {
			expandAll: handleExpandAll,
			collapseAll: handleCollapseAll
		});
	}, [
		yfilesControllerId,
		canvasReady,
		registerYFilesController,
		handleExpandAll,
		handleCollapseAll]
	);

	return (
		<Root style={style}>
			{chrome === 'full' &&
				<Toolbar>
					<ToolbarLabel>Подграфы</ToolbarLabel>
					<ToolButton
						type="button"
						disabled={!canvasReady}
						title="Раскрыть все папки"
						onClick={expandAllFoldersInContext}>

						Раскрыть все
					</ToolButton>
					<ToolButton
						type="button"
						disabled={!canvasReady}
						title="Свернуть все папки"
						onClick={collapseAllFoldersInContext}>

						Свернуть все
					</ToolButton>
					<ToolbarLabel>Рёбра</ToolbarLabel>
					<ToolButton
						type="button"
						disabled={!canvasReady}
						$active={edgeRoutingMode === 'orthogonal'}
						title="Ортогональная трассировка (прямые углы)"
						onClick={() => setEdgeRoutingMode('orthogonal')}>

						Прямые
					</ToolButton>
					<ToolButton
						type="button"
						disabled={!canvasReady}
						$active={edgeRoutingMode === 'polyline'}
						title="Ломаная трассировка"
						onClick={() => setEdgeRoutingMode('polyline')}>

						Ломаные
					</ToolButton>
				</Toolbar>
			}
			<CanvasArea>
				<GraphHost ref={graphHostRef} />
				<NodeInfoPanel selection={nodeSelection} document={document} />
				<OverviewHost ref={overviewHostRef} title="Панорама графа" />
				<Hint>ЛКМ по узлу — информация · ПКМ — контекстное меню · ЛКМ+drag — пан · «+» на папке — подграф</Hint>
			</CanvasArea>
		</Root>
	);
}