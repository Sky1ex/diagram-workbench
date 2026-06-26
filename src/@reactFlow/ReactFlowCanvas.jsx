import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
	Background,
	Controls,
	MiniMap,
	ReactFlow,
	useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphInteraction, filterFlowScene } from '@graphContext';

import { GRAPH_VISUAL_THEME, MAX_INLINE_EXPAND_LARGE } from '@graphLayout';

import { reactFlowEdgeTypes } from './edges/ElkEdge';
import { NodeInfoPanel } from './NodeInfoPanel';
import { reactFlowNodeTypes } from './reactFlowNodeTypes';
import { ReactFlowInteractionProvider } from './reactFlowInteractionContext';
import { useReactFlowContextMenu } from './reactFlowGraphInteraction';
import { useElkLayout } from './useElkLayout';
import { useGraphLod } from './useGraphLod';

const EDGE_HIGHLIGHT_STROKE = '#2563eb';

const FlowHost = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  position: relative;
`;

const LayoutError = styled.div`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #8b1a1a;
  background: #fdecec;
  border: 1px solid #f5c2c2;
  pointer-events: none;
`;

const CanvasMessage = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  color: ${({ theme }) => theme.color['Neutral/Neutral 60']};
  pointer-events: none;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: ${({ theme }) => theme.color['Neutral/Neutral 00']};
  opacity: 0.35;
`;

const FilterBanner = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  max-width: min(320px, 90%);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color['Neutral/Neutral 70']};
  background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
  border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
  pointer-events: none;
`;

const LodBadge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.color['Neutral/Neutral 60']};
  background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
  border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};
  pointer-events: none;
`;

function FitViewAfterLayout({
	fitViewGeneration,
	hasNodes,
	isLargeGraphMode,
	onViewportChange
}) {
	const { fitView, getViewport } = useReactFlow();

	useEffect(() => {
		if (!hasNodes) return;
		const id = requestAnimationFrame(() => {
			void fitView({ padding: 0.15, duration: isLargeGraphMode ? 0 : 200 }).then(() => {
				onViewportChange(getViewport());
			});
		});
		return () => cancelAnimationFrame(id);
	}, [fitViewGeneration, fitView, getViewport, hasNodes, isLargeGraphMode, onViewportChange]);
	return null;
}

export function ReactFlowCanvas({
	document,
	datasetId,
	expandedHostFlowIds,
	onToggleFolderExpand,
	layoutGeneration,
	fitViewGeneration,
	onLayoutingChange,
	onLayoutApplied,
	onSceneStatsChange
}) {
	const rootGraph = document.graphs[document.rootGraphId];
	const [selectedNodeId, setSelectedNodeId] = useState(null);
	const { filterVisibility, sceneVisibilityActive, visibility } = useGraphInteraction();
	const { onNodeContextMenu, onEdgeContextMenu } = useReactFlowContextMenu();

	const {
		nodes,
		edges,
		onNodesChange,
		onEdgesChange,
		layoutError,
		isLayouting,
		isEmptyGraph,
		isLargeGraphMode
	} = useElkLayout({
		document,
		datasetId,
		expandedHostFlowIds,
		layoutGeneration,
		onLayoutingChange,
		onLayoutApplied
	});

	const filteredScene = useMemo(
		() =>
			filterFlowScene(
				nodes,
				edges,
				visibility.visibleNodeIds,
				visibility.visibleEdgeIds,
				sceneVisibilityActive,
				expandedHostFlowIds
			),
		[nodes, edges, visibility, sceneVisibilityActive, expandedHostFlowIds]
	);

	useEffect(() => {
		const visibleNodes = filteredScene.nodes.filter((node) => node.type !== 'layoutAnchor');
		onSceneStatsChange?.({ nodeCount: visibleNodes.length, edgeCount: filteredScene.edges.length });
	}, [onSceneStatsChange, filteredScene]);

	useEffect(() => {
		setSelectedNodeId(null);
	}, [datasetId, document.rootGraphId]);

	useEffect(() => {
		if (!selectedNodeId) return;
		if (filteredScene.nodes.some((node) => node.id === selectedNodeId)) return;
		setSelectedNodeId(null);
	}, [filteredScene.nodes, selectedNodeId]);

	const { displayNodes, displayEdges, lodActive, onViewportChange } = useGraphLod(
		filteredScene.nodes,
		filteredScene.edges,
		isLargeGraphMode
	);

	const styledEdges = useMemo(() => {
		if (!selectedNodeId) return displayEdges;

		return displayEdges.map((edge) => {
			const incident = edge.source === selectedNodeId || edge.target === selectedNodeId;
			if (!incident) return edge;

			return {
				...edge,
				style: {
					...edge.style,
					stroke: EDGE_HIGHLIGHT_STROKE,
					strokeWidth: 2.5
				},
				zIndex: 2
			};
		});
	}, [displayEdges, selectedNodeId]);

	const onFlowInit = useCallback(
		(instance) => {
			onViewportChange(instance.getViewport());
		},
		[onViewportChange]
	);

	const onNodeClick = useCallback((_, node) => {
		setSelectedNodeId(node.id);
	}, []);

	const onPaneClick = useCallback(() => {
		setSelectedNodeId(null);
	}, []);

	const canExpandFolder = useCallback(
		(hostFlowId) => {
			if (expandedHostFlowIds.has(hostFlowId)) return true;
			if (isLargeGraphMode && expandedHostFlowIds.size >= MAX_INLINE_EXPAND_LARGE) return false;
			return true;
		},
		[expandedHostFlowIds, isLargeGraphMode]
	);

	const interactionValue = useMemo(
		() => ({
			selectedNodeId,
			expandedHostFlowIds,
			canExpandFolder,
			onToggleFolderExpand
		}),
		[selectedNodeId, expandedHostFlowIds, canExpandFolder, onToggleFolderExpand]
	);

	const showLoadingOverlay = isLayouting && nodes.length > 0;

	const defaultEdgeOptions = useMemo(
		() => ({
			type: 'step',
			pathOptions: { borderRadius: 0 },
			style: { stroke: GRAPH_VISUAL_THEME.edgeStroke, strokeWidth: 1.5 }
		}),
		[]
	);

	return (
		<ReactFlowInteractionProvider value={interactionValue}>
			<FlowHost>
				{layoutError && <LayoutError>Ошибка раскладки: {layoutError}</LayoutError>}
				{filterVisibility.noMatchesInView &&
					<FilterBanner>Фильтр: нет совпадений на экране — показан весь граф</FilterBanner>
				}
				{isEmptyGraph &&
					<CanvasMessage>Граф «{rootGraph?.label ?? '—'}» не содержит узлов.</CanvasMessage>
				}
				{lodActive && <LodBadge>Компактный режим · приблизьте для подписей</LodBadge>}
				<NodeInfoPanel
					selectedNodeId={selectedNodeId}
					nodes={filteredScene.nodes}
					document={document}
					expandedHostFlowIds={expandedHostFlowIds} />

				{showLoadingOverlay && <LoadingOverlay aria-hidden />}
				<ReactFlow
					nodes={displayNodes}
					edges={styledEdges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					nodeTypes={reactFlowNodeTypes}
					edgeTypes={reactFlowEdgeTypes}
					onNodeClick={onNodeClick}
					onPaneClick={onPaneClick}
					onNodeContextMenu={onNodeContextMenu}
					onEdgeContextMenu={onEdgeContextMenu}
					onViewportChange={onViewportChange}
					onInit={onFlowInit}
					defaultEdgeOptions={defaultEdgeOptions}
					nodesDraggable={false}
					nodesConnectable={false}
					elementsSelectable={false}
					nodesFocusable={false}
					elevateEdgesOnSelect={false}
					onlyRenderVisibleElements
					minZoom={0.02}
					maxZoom={2}
					proOptions={{ hideAttribution: true }}
					style={{ opacity: isLayouting && nodes.length === 0 ? 0.35 : 1 }}>

					<Background gap={16} size={1} />
					<Controls showInteractive={false} />
					<MiniMap zoomable pannable nodeStrokeWidth={isLargeGraphMode ? 1 : 2} />
					<FitViewAfterLayout
						fitViewGeneration={fitViewGeneration}
						hasNodes={filteredScene.nodes.length > 0}
						isLargeGraphMode={isLargeGraphMode}
						onViewportChange={onViewportChange} />

				</ReactFlow>
			</FlowHost>
		</ReactFlowInteractionProvider>
	);
}