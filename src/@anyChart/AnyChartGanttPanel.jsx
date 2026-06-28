import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import { documentToGanttTree } from '../adapters/anychartAdapter';
import { useGraphInteraction, useGraphView } from '@graphContext';
import { findGraphNode, nodeToHitAttributes, parseFlowNodeId } from '@graphContext';

import {
	filterGanttTreePayload,
	resolveGanttRowAtEvent
} from
	'./anychartGraphInteraction';

import 'anychart/dist/css/anychart-ui.min.css';
import 'anychart/dist/fonts/css/anychart-font.min.css';
import { toolbarMobile } from '../styles/mobileStyles';
import { installLongPressMenu } from '../utils/installLongPressMenu';

const Root = styled.div`
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color['Neutral/Neutral 00']};
  border-radius: 0 0 8px 8px;
  overflow: hidden;
`;

const Toolbar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};

  ${toolbarMobile}
`;

const ToolbarLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
  margin-right: 4px;
`;

const ToolButton = styled.button`
  height: 28px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
  border-radius: 6px;
  background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
  color: ${({ theme }) => theme.color['Neutral/Neutral 90']};
  font-size: 13px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color['Neutral/Neutral 10']};
    border-color: ${({ theme }) => theme.color['Neutral/Neutral 40']};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const ZoomButton = styled.button`
  min-width: 32px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
  border-radius: 6px;
  background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
  color: ${({ theme }) => theme.color['Neutral/Neutral 90']};
  font-size: 14px;
  line-height: 1;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color['Neutral/Neutral 10']};
    border-color: ${({ theme }) => theme.color['Neutral/Neutral 40']};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const ChartMount = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  touch-action: pan-x pan-y;
`;

function resolveAnyChart(mod) {
	const candidate = mod.default ?? mod;
	if (candidate && typeof candidate === 'object' && 'ganttProject' in candidate) {
		return candidate;
	}
	if (typeof candidate === 'function') {
		try {
			const r = candidate();
			return r && typeof r.ganttProject === 'function' ? r : null;
		} catch {
			return null;
		}
	}
	return null;
}

function applyProjectGanttLayout(chart) {
	const rowPx = 40;
	const barPx = 16;
	const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

	chart.animation(false);
	chart.defaultRowHeight(rowPx);
	chart.headerHeight(isMobile ? 44 : 52);
	chart.splitterPosition(isMobile ? 110 : 300);

	const dg = chart.dataGrid();
	dg.fixedColumns(true);
	dg.column(0).width(isMobile ? 32 : 40);
	dg.column(1).width(isMobile ? 110 : 220);

	const timeline = chart.getTimeline();
	timeline.zoomOnMouseWheel(true);

	const tasks = timeline.tasks();
	tasks.height(barPx);
	tasks.position('center');
}

function applyTimelineScale(chart, minimum, maximum) {
	const scale = chart.getTimeline().scale();
	scale.minimum(minimum);
	scale.maximum(maximum);

	const spanMs = Math.max(maximum - minimum, 1);
	const MS_DAY = 86_400_000;
	const zoomLevels =
		spanMs <= 14 * MS_DAY ?
			[
				[
					{ unit: 'hour', count: 6 },
					{ unit: 'day', count: 1 }]] :


			[
				[
					{ unit: 'day', count: 1 },
					{ unit: 'month', count: 1 }]];



	scale.zoomLevels(zoomLevels);
}

function applyFolderExpandState(
	chart,
	folderIds,
	expandedHostFlowIds) {
	if (expandedHostFlowIds.size === 0) {
		chart.collapseAll();
		return;
	}

	if (expandedHostFlowIds.size >= folderIds.length) {
		chart.expandAll();
		return;
	}

	chart.collapseAll();
	for (const folderId of folderIds) {
		if (expandedHostFlowIds.has(folderId)) {
			chart.expandTask(folderId);
		}
	}
}

const ZOOM_STEP = 1.25;

export function AnyChartGanttPanel({ chrome = 'full' }) {
	const {
		document,
		expandedHostFlowIds,
		toggleFolderExpand,
		expandAllFolders,
		collapseAllFolders
	} = useGraphView();
	const { openContextMenu, sceneVisibilityActive, visibility } = useGraphInteraction();
	const baseGanttData = useMemo(() => documentToGanttTree(document), [document]);
	const ganttData = useMemo(
		() =>
			filterGanttTreePayload(baseGanttData, visibility.visibleNodeIds, sceneVisibilityActive),
		[baseGanttData, visibility.visibleNodeIds, sceneVisibilityActive]
	);
	const expandedKey = useMemo(
		() => [...expandedHostFlowIds].sort().join('|'),
		[expandedHostFlowIds]
	);
	const expandedCount = expandedHostFlowIds.size;

	const toggleFolderExpandRef = useRef(toggleFolderExpand);
	toggleFolderExpandRef.current = toggleFolderExpand;
	const expandedHostFlowIdsRef = useRef(expandedHostFlowIds);
	expandedHostFlowIdsRef.current = expandedHostFlowIds;
	const folderIdsRef = useRef(ganttData.folderIds);
	folderIdsRef.current = ganttData.folderIds;
	const ganttDataRef = useRef(ganttData);
	ganttDataRef.current = ganttData;
	const openContextMenuRef = useRef(openContextMenu);
	openContextMenuRef.current = openContextMenu;
	const syncingFromContextRef = useRef(false);

	const mountRef = useRef(null);
	const chartRef = useRef(null);
	const [chartReady, setChartReady] = useState(false);

	const zoomIn = useCallback(() => {
		chartRef.current?.zoomIn(ZOOM_STEP);
	}, []);

	const zoomOut = useCallback(() => {
		chartRef.current?.zoomOut(ZOOM_STEP);
	}, []);

	const fitAll = useCallback(() => {
		chartRef.current?.fitAll();
	}, []);

	useEffect(() => {
		let chart = null;
		let ro = null;
		let cancelled = false;

		setChartReady(false);

		void import('anychart').then((mod) => {
			if (cancelled || !mountRef.current) return;
			const anychart = resolveAnyChart(mod);
			if (!anychart) {
				console.error('AnyChart: не удалось разрешить модуль', mod);
				return;
			}

			const next = anychart.ganttProject();
			next.data(baseGanttData.rows, 'as-tree');
			next.container(mountRef.current);
			next.credits(false);
			next.contextMenu(false);
			if (cancelled || !mountRef.current) {
				next.dispose();
				return;
			}
			applyProjectGanttLayout(next);
			applyTimelineScale(next, baseGanttData.timeline.minimum, baseGanttData.timeline.maximum);
			next.listen('rowCollapseExpand', (event) => {
				if (syncingFromContextRef.current) return;
				const item = event.item;
				if (!item?.get) return;
				const hostFlowId = item.get('hostFlowId');
				const subgraphId = item.get('subgraphId');
				if (typeof hostFlowId !== 'string' || !subgraphId) return;

				const expanded = expandedHostFlowIdsRef.current.has(hostFlowId);
				const collapsed = Boolean(event.collapsed);
				if (collapsed === expanded) {
					toggleFolderExpandRef.current(hostFlowId);
				}
			});
			chart = next;
			chartRef.current = next;
			chart.draw();

			syncingFromContextRef.current = true;
			try {
				chart.collapseAll();
				applyFolderExpandState(chart, folderIdsRef.current, expandedHostFlowIdsRef.current);
			} finally {
				syncingFromContextRef.current = false;
			}

			setChartReady(true);

			ro = new ResizeObserver(() => {
				if (!chart || !mountRef.current) return;
				const { clientWidth, clientHeight } = mountRef.current;
				chart.width(clientWidth);
				chart.height(clientHeight);
			});
			ro.observe(mountRef.current);
		});

		return () => {
			cancelled = true;
			setChartReady(false);
			ro?.disconnect();
			ro = null;
			chartRef.current = null;
			chart?.dispose();
			chart = null;
		};
	}, [baseGanttData]);

	useEffect(() => {
		const chart = chartRef.current;
		if (!chart || !chartReady) return;

		syncingFromContextRef.current = true;
		try {
			applyFolderExpandState(chart, folderIdsRef.current, expandedHostFlowIds);
		} finally {
			syncingFromContextRef.current = false;
		}
	}, [expandedKey, chartReady, expandedHostFlowIds]);

	useEffect(() => {
		const chart = chartRef.current;
		if (!chart || !chartReady) return;
		chart.data(ganttData.rows, 'as-tree');
		syncingFromContextRef.current = true;
		try {
			applyFolderExpandState(chart, folderIdsRef.current, expandedHostFlowIdsRef.current);
		} finally {
			syncingFromContextRef.current = false;
		}
		chart.draw();
	}, [ganttData, chartReady, expandedHostFlowIds]);

	useEffect(() => {
		const mount = mountRef.current;
		if (!mount || !chartReady) return;

		const openMenuAt = (clientX, clientY) => {
			const row = resolveGanttRowAtEvent(
				mount,
				{ clientX, clientY },
				ganttDataRef.current,
				expandedHostFlowIdsRef.current
			);
			if (!row || !openContextMenuRef.current) return;

			const graphNode = findGraphNode(document, row.hostFlowId);
			const parsed = parseFlowNodeId(row.hostFlowId);
			const attributes = graphNode && parsed ?
				nodeToHitAttributes(graphNode, parsed.graphId) :
				{ label: row.name, flowId: row.hostFlowId };

			openContextMenuRef.current({
				rendererId: 'anychart',
				clientX,
				clientY,
				target: {
					kind: 'node',
					flowId: row.hostFlowId,
					label: row.name,
					isFolder: Boolean(row.subgraphId),
					isExpanded: expandedHostFlowIdsRef.current.has(row.hostFlowId)
				},
				attributes
			});
		};

		const onContextMenu = (event) => {
			event.preventDefault();
			event.stopPropagation();
			openMenuAt(event.clientX, event.clientY);
		};

		mount.addEventListener('contextmenu', onContextMenu);
		const removeLongPress = installLongPressMenu(mount, ({ clientX, clientY }) => {
			openMenuAt(clientX, clientY);
		});
		return () => {
			mount.removeEventListener('contextmenu', onContextMenu);
			removeLongPress();
		};
	}, [chartReady, document]);

	return (
		<Root>
			{chrome === 'full' &&
				<Toolbar>
					<ToolbarLabel>
						Подграфы: ± в таблице или двойной клик · масштаб таймлайна
					</ToolbarLabel>
					<ToolButton type="button" disabled={!chartReady} onClick={expandAllFolders}>
						Развернуть все
					</ToolButton>
					<ToolButton
						type="button"
						disabled={!chartReady || expandedCount === 0}
						onClick={collapseAllFolders}>

						Свернуть все
					</ToolButton>
					<ZoomButton type="button" title="Уменьшить" onClick={zoomOut}>
						−
					</ZoomButton>
					<ZoomButton type="button" title="Увеличить" onClick={zoomIn}>
						+
					</ZoomButton>
					<ZoomButton type="button" title="Вписать весь диапазон" onClick={fitAll}>
						Вписать
					</ZoomButton>
				</Toolbar>
			}
			<ChartMount ref={mountRef} />
		</Root>
	);
}