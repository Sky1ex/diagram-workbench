import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import { useGraphView, useGraphInteraction, filterGraph3DScene } from '@graphContext';

import { buildGraph3DScene } from './buildGraph3DScene';
import { GraphScene3D } from './GraphScene3D';
import { NodeInfoPanel } from './NodeInfoPanel';
import { useThreeGraphContextMenu } from './threeGraphInteraction';

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

const GraphTitle = styled.span`
	font-size: 13px;
	font-weight: 500;
	color: ${({ theme }) => theme.color['Neutral/Neutral 90']};
	margin-right: 8px;
`;

const GraphStats = styled.span`
	font-size: 12px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
	margin-right: 8px;
`;

const EngineBadge = styled.span`
	font-size: 11px;
	padding: 2px 8px;
	border-radius: 999px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 60']};
	background: ${({ theme }) => theme.color['Neutral/Neutral 10']};
	border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};
`;

const InfoBanner = styled.div`
	flex-shrink: 0;
	padding: 6px 12px;
	font-size: 12px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 70']};
	background: ${({ theme }) => theme.color['Neutral/Neutral 10']};
	border-bottom: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
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
	color: ${({ theme }) => theme.color['Neutral/Neutral 90']};
	font-size: 13px;
	cursor: pointer;

	&:hover:not(:disabled) {
		background: ${({ theme, $active }) =>
		$active ? theme.color['Primary/Primary 20'] : theme.color['Neutral/Neutral 10']};
		border-color: ${({ theme }) => theme.color['Neutral/Neutral 40']};
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

export default function ThreeScenePanel({ chrome = 'full' }) {
	const {
		datasetId,
		document,
		expandedHostFlowIds,
		expandAllFolders,
		collapseAllFolders
	} = useGraphView();

	const { sceneVisibilityActive, visibility } = useGraphInteraction();
	const openGraphContextMenu = useThreeGraphContextMenu();
	const canvasAreaRef = useRef(null);
	const [nodeShape, setNodeShape] = useState('cube');
	const [layoutMode, setLayoutMode] = useState('uniform');
	const [selectedNodeId, setSelectedNodeId] = useState(null);
	const [fitGeneration, setFitGeneration] = useState(0);

	const rootGraph = document.graphs[document.rootGraphId];
	const rootNodeCount = rootGraph?.nodes.length ?? 0;
	const isLargeDataset = datasetId.startsWith('large-') || rootNodeCount >= 200;
	const expandedCount = expandedHostFlowIds.size;

	const scene = useMemo(() => {
		const built = buildGraph3DScene(document, expandedHostFlowIds, layoutMode);
		return filterGraph3DScene(
			built,
			visibility.visibleNodeIds,
			visibility.visibleEdgeIds,
			sceneVisibilityActive
		);
	}, [document, expandedHostFlowIds, layoutMode, visibility, sceneVisibilityActive]);

	const fitKey = useMemo(
		() => `${datasetId}|${fitGeneration}`,
		[datasetId, fitGeneration]
	);

	const handleNodeSelect = useCallback((nodeId) => {
		setSelectedNodeId(nodeId || null);
	}, []);

	const handleNodeContextMenu = useCallback(
		(hit) => {
			setSelectedNodeId(hit.nodeId);
			openGraphContextMenu(hit);
		},
		[openGraphContextMenu]
	);

	const handleRefit = useCallback(() => {
		setFitGeneration((g) => g + 1);
	}, []);

	useEffect(() => {
		setSelectedNodeId(null);
		setFitGeneration((g) => g + 1);
	}, [datasetId]);

	const graphTitle = rootGraph?.label ?? 'Граф';

	return (
		<Root>
			{chrome === 'full' && isLargeDataset &&
				<InfoBanner>
					Большой граф: 3D-раскладка · ЛКМ — информация об узле · ПКМ — контекстное меню
				</InfoBanner>
			}
			<Toolbar>
				<GraphTitle>{graphTitle}</GraphTitle>
				<GraphStats>
					{scene.nodes.length} узл · {scene.edges.length} рёбер
					{expandedCount > 0 ? ` · раскрыто ${expandedCount}` : ''}
				</GraphStats>
				<EngineBadge>Three.js</EngineBadge>

				<ToolbarLabel>Раскладка</ToolbarLabel>
				<ToolButton
					type="button"
					$active={layoutMode === 'uniform'}
					title="Равномерная 3D-решётка"
					onClick={() => setLayoutMode('uniform')}>

					Объём
				</ToolButton>
				<ToolButton
					type="button"
					$active={layoutMode === 'byLevel'}
					title="Слои по depth: от старших к младшим"
					onClick={() => setLayoutMode('byLevel')}>

					По уровням
				</ToolButton>

				<ToolbarLabel>Форма</ToolbarLabel>
				<ToolButton
					type="button"
					$active={nodeShape === 'cube'}
					onClick={() => setNodeShape('cube')}>

					Куб
				</ToolButton>
				<ToolButton
					type="button"
					$active={nodeShape === 'sphere'}
					onClick={() => setNodeShape('sphere')}>

					Сфера
				</ToolButton>

				{chrome === 'full' &&
					<>
						<ToolbarLabel>Подграфы</ToolbarLabel>
						<ToolButton
							type="button"
							title="Раскрыть все folder"
							onClick={expandAllFolders}>

							Развернуть все
						</ToolButton>
						<ToolButton
							type="button"
							disabled={expandedCount === 0}
							title="Свернуть все раскрытые подграфы"
							onClick={collapseAllFolders}>

							Свернуть все
						</ToolButton>
					</>
				}

				<ToolbarLabel>Камера</ToolbarLabel>
				<ToolButton type="button" title="Подогнать камеру под сцену" onClick={handleRefit}>
					Вписать
				</ToolButton>
			</Toolbar>
			<CanvasArea ref={canvasAreaRef}>
				<GraphScene3D
					scene={scene}
					shape={nodeShape}
					expandedHostFlowIds={expandedHostFlowIds}
					selectedNodeId={selectedNodeId}
					fitKey={fitKey}
					onNodeSelect={handleNodeSelect}
					onNodeContextMenu={handleNodeContextMenu} />

				<NodeInfoPanel
					selectedNodeId={selectedNodeId}
					nodes={scene.nodes}
					document={document}
					expandedHostFlowIds={expandedHostFlowIds} />

				{chrome === 'full' &&
					<Hint>
						ЛКМ — выделить · ПКМ — контекстное меню · орбита: ЛКМ+drag на фоне · zoom: колесо · пан: ПКМ на фоне
					</Hint>
				}
			</CanvasArea>
		</Root>
	);
}