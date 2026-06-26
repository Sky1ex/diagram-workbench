import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ReactFlowProvider } from '@xyflow/react';

import { useGraphView, useGraphInteraction } from '@graphContext';
import { MAX_INLINE_EXPAND_LARGE } from '@graphLayout';

import { ReactFlowCanvas } from './ReactFlowCanvas';
import { ReactFlowChromeStyles } from './reactFlowChromeStyles';

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

const LayoutStatus = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
`;

const CanvasArea = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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

export default function DagLodPanel({ chrome = 'full' }) {
	const {
		datasetId,
		document,
		expandedHostFlowIds,
		toggleFolderExpand,
		expandAllFolders,
		collapseAllFolders
	} = useGraphView();
	const { filterActive, filterVisibility, clearFilter } = useGraphInteraction();
	const [layoutGeneration, setLayoutGeneration] = useState(0);
	const [fitViewGeneration, setFitViewGeneration] = useState(0);
	const [isLayouting, setIsLayouting] = useState(false);
	const [sceneStats, setSceneStats] = useState({ nodeCount: 0, edgeCount: 0 });

	const rootGraph = document.graphs[document.rootGraphId];
	const rootNodeCount = rootGraph?.nodes.length ?? 0;
	const isLargeDataset = datasetId.startsWith('large-') || rootNodeCount >= 200;
	const expandedCount = expandedHostFlowIds.size;

	const handleRelayout = useCallback(() => {
		setLayoutGeneration((g) => g + 1);
	}, []);

	const handleLayoutApplied = useCallback(() => {
		setFitViewGeneration((g) => g + 1);
	}, []);

	const handleSceneStatsChange = useCallback(
		(stats) => {
			setSceneStats(stats);
		},
		[]
	);

	useEffect(() => {
		setLayoutGeneration((g) => g + 1);
	}, [datasetId]);

	const graphTitle = useMemo(() => rootGraph?.label ?? 'Граф', [rootGraph?.label]);

	return (
		<Root>
			{chrome === 'full' && isLargeDataset &&
				<InfoBanner>
					Большой граф: layout dagre · компактные узлы · inline expand до{' '}
					{MAX_INLINE_EXPAND_LARGE} folder · zoom для подписей
				</InfoBanner>
			}
			<ReactFlowChromeStyles />
			<Toolbar>
				<GraphTitle>{graphTitle}</GraphTitle>
				<GraphStats>
					{sceneStats.nodeCount} узл · {sceneStats.edgeCount} рёбер
					{expandedCount > 0 ? ` · раскрыто ${expandedCount}` : ''}
				</GraphStats>
				{isLargeDataset && <EngineBadge>dagre + LOD</EngineBadge>}
				{chrome === 'full' &&
					<>
						<ToolbarLabel>Подграфы</ToolbarLabel>
						<ToolButton
							type="button"
							disabled={isLayouting || rootNodeCount === 0}
							title="Раскрыть все folder на канвасе"
							onClick={expandAllFolders}>

							Развернуть все
						</ToolButton>
						<ToolButton
							type="button"
							disabled={expandedCount === 0 || isLayouting}
							title="Свернуть все раскрытые подграфы на канвасе"
							onClick={collapseAllFolders}>

							Свернуть все
						</ToolButton>
					</>
				}
				<ToolbarLabel>Раскладка</ToolbarLabel>
				<ToolButton
					type="button"
					disabled={isLayouting || rootNodeCount === 0}
					title={
						isLargeDataset ?
							'Пересчитать позиции (dagre)' :
							'Пересчитать позиции (ELK, Web Worker)'
					}
					onClick={handleRelayout}>

					Переложить
				</ToolButton>
				{isLayouting &&
					<LayoutStatus>
						{isLargeDataset ? 'Раскладка dagre…' : 'Раскладка ELK…'}
					</LayoutStatus>
				}
				{chrome === 'full' && filterActive &&
					<>
						<ToolbarLabel>
							{filterVisibility.noMatchesInView ?
								'Фильтр: нет совпадений на экране' :
								`Фильтр: ${filterVisibility.matchedNodes} подошло · ${filterVisibility.shownNodes} видно`}
						</ToolbarLabel>
						<ToolButton type="button" title="Сбросить фильтр" onClick={clearFilter}>
							Сбросить фильтр
						</ToolButton>
					</>
				}
			</Toolbar>
			<CanvasArea>
				<ReactFlowProvider>
					<ReactFlowCanvas
						document={document}
						datasetId={datasetId}
						expandedHostFlowIds={expandedHostFlowIds}
						onToggleFolderExpand={toggleFolderExpand}
						layoutGeneration={layoutGeneration}
						fitViewGeneration={fitViewGeneration}
						onLayoutingChange={setIsLayouting}
						onLayoutApplied={handleLayoutApplied}
						onSceneStatsChange={handleSceneStatsChange} />

				</ReactFlowProvider>
				{chrome === 'full' &&
					<Hint>
						{isLargeDataset ?
							'ЛКМ — информация и подсветка рёбер · ПКМ — контекстное меню · + на folder — раскрыть · − на группе — свернуть' :
							'ЛКМ — информация · ПКМ — контекстное меню · + на folder — раскрыть · − на группе — свернуть · ELK orthogonal'}
					</Hint>
				}
			</CanvasArea>
		</Root>
	);
}