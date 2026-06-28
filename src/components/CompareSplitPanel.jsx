import { lazy, Suspense } from 'react';
import styled from 'styled-components';
import { Option, Select } from '@admiral-ds/react-ui';

import { AnyChartGanttPanel } from '@anyChart';
import { useGraphInteraction, useGraphView } from '@graphContext';
import YFilesGraphPanel from '@yFiles/YFilesGraphPanel';

import { TabLoadingState } from './TabLoadingState';
import { MOBILE } from '../styles/breakpoints';
import { toolbarMobile } from '../styles/mobileStyles';

const DagLodPanel = lazy(() => import('@reactFlow/DagLodPanel'));
const ThreeScenePanel = lazy(() => import('@threeJs/ThreeScenePanel'));

const DEFAULT_LIBRARIES = ['yfiles', 'reactflow', 'anychart', 'threejs'];

export const COMPARE_DEFAULT_LIBRARIES = [...DEFAULT_LIBRARIES];

function gridColumns(panelCount) {
	if (panelCount === 3) return '1fr 1fr 1fr';
	return '1fr 1fr';
}

function gridRows(panelCount) {
	return panelCount === 4 ? '1fr 1fr' : '1fr';
}

function mobileGridRows(panelCount) {
	return `repeat(${panelCount}, minmax(min(42vh, 320px), 1fr))`;
}

function paneBorderFlags(index, panelCount) {
	const cols = panelCount === 3 ? 3 : 2;
	const rows = panelCount === 4 ? 2 : 1;
	const col = index % cols;
	const row = Math.floor(index / cols);
	return {
		$noRight: col === cols - 1,
		$noBottom: row === rows - 1
	};
}

const Root = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	width: 100%;
	height: 100%;
`;

const SharedToolbar = styled.div`
	flex-shrink: 0;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	padding: 8px 12px;
	border-bottom: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};
	background: ${({ theme }) => theme.color['Neutral/Neutral 05']};

	${toolbarMobile}
`;

const ToolbarLabel = styled.span`
	font-size: 12px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
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

const SplitGrid = styled.div`
	flex: 1;
	min-height: 0;
	display: grid;
	grid-template-columns: ${({ $panelCount }) => gridColumns($panelCount)};
	grid-template-rows: ${({ $panelCount }) => gridRows($panelCount)};
	gap: 0;

	${MOBILE} {
		grid-template-columns: 1fr;
		grid-template-rows: ${({ $panelCount }) => mobileGridRows($panelCount)};
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
`;

const Pane = styled.div`
	min-width: 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
	border-right: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};
	border-bottom: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};

	${({ $noRight }) => $noRight && 'border-right: none;'}
	${({ $noBottom }) => $noBottom && 'border-bottom: none;'}

	${MOBILE} {
		border-right: none;
		${({ $isLastPane }) => $isLastPane && 'border-bottom: none;'}
	}
`;

const PaneHeader = styled.div`
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-bottom: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};
	background: ${({ theme }) => theme.color['Neutral/Neutral 10']};

	${MOBILE} {
		padding: 6px 8px;
		flex-wrap: wrap;
	}
`;

const PaneTitle = styled.span`
	font-size: 12px;
	font-weight: 600;
	color: ${({ theme }) => theme.color['Neutral/Neutral 70']};
`;

const PaneSelectWrap = styled.div`
	flex: 1;
	min-width: 0;
	max-width: 200px;

	${MOBILE} {
		max-width: none;
		width: 100%;
	}
`;

const PaneBody = styled.div`
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
`;

const libraryOptions = [
	{ id: 'yfiles', label: 'yFiles' },
	{ id: 'anychart', label: 'AnyChart' },
	{ id: 'threejs', label: 'Three.js' },
	{ id: 'reactflow', label: 'React Flow' }
];

function ComparePane({
	title,
	libraryId,
	onLibraryChange,
	yfilesControllerId,
	panelCount,
	paneIndex
}) {
	const borders = paneBorderFlags(paneIndex, panelCount);

	return (
		<Pane {...borders} $isLastPane={paneIndex === panelCount - 1}>
			<PaneHeader>
				<PaneTitle>{title}</PaneTitle>
				<PaneSelectWrap>
					<Select
						dimension="s"
						value={libraryId}
						onChange={(e) => onLibraryChange(e.target.value)}
					>
						{libraryOptions.map((opt) =>
							<Option key={opt.id} value={opt.id}>
								{opt.label}
							</Option>
						)}
					</Select>
				</PaneSelectWrap>
			</PaneHeader>
			<PaneBody>
				{libraryId === 'yfiles' &&
					<YFilesGraphPanel
						chrome="minimal"
						yfilesControllerId={yfilesControllerId}
						style={{ flex: 1, minHeight: 0, height: '100%' }}
					/>
				}
				{libraryId === 'anychart' && <AnyChartGanttPanel chrome="minimal" />}
				{libraryId === 'threejs' &&
					<Suspense fallback={<TabLoadingState label="Three.js" />}>
						<ThreeScenePanel chrome="minimal" />
					</Suspense>
				}
				{libraryId === 'reactflow' &&
					<Suspense fallback={<TabLoadingState label="React Flow" />}>
						<DagLodPanel chrome="minimal" />
					</Suspense>
				}
			</PaneBody>
		</Pane>
	);
}

export function CompareSplitPanel({
	panelCount,
	onPanelCountChange,
	libraries,
	onLibraryChange
}) {
	const { expandAllFolders, collapseAllFolders } = useGraphView();
	const { filterActive, filterVisibility, clearFilter } = useGraphInteraction();

	const visiblePaneCount = panelCount;

	return (
		<Root>
			<SharedToolbar>
				<ToolbarLabel>Панели</ToolbarLabel>
				<ToolButton
					type="button"
					$active={panelCount === 2}
					title="Две панели рядом"
					onClick={() => onPanelCountChange(2)}
				>
					2
				</ToolButton>
				<ToolButton
					type="button"
					$active={panelCount === 3}
					title="Три панели в ряд"
					onClick={() => onPanelCountChange(3)}
				>
					3
				</ToolButton>
				<ToolButton
					type="button"
					$active={panelCount === 4}
					title="Четыре панели (сетка 2×2)"
					onClick={() => onPanelCountChange(4)}
				>
					4
				</ToolButton>
				<ToolbarLabel>Подграфы (все экраны)</ToolbarLabel>
				<ToolButton type="button" title="Раскрыть все folder на всех экранах" onClick={expandAllFolders}>
					Развернуть все
				</ToolButton>
				<ToolButton type="button" title="Свернуть все подграфы на всех экранах" onClick={collapseAllFolders}>
					Свернуть все
				</ToolButton>
				{filterActive &&
					<>
						<ToolbarLabel>
							{filterVisibility.noMatchesInView ?
								'Фильтр: нет совпадений на экране' :
								`Фильтр: ${filterVisibility.matchedNodes} подошло · ${filterVisibility.shownNodes} видно`}
						</ToolbarLabel>
						<ToolButton type="button" title="Сбросить фильтр на всех экранах" onClick={clearFilter}>
							Сбросить фильтр
						</ToolButton>
					</>
				}
			</SharedToolbar>
			<SplitGrid $panelCount={panelCount}>
				{Array.from({ length: visiblePaneCount }, (_, index) =>
					<ComparePane
						key={index}
						title={`Экран ${index + 1}`}
						libraryId={libraries[index] ?? DEFAULT_LIBRARIES[index]}
						onLibraryChange={(id) => onLibraryChange(index, id)}
						yfilesControllerId={`compare-${index + 1}`}
						panelCount={panelCount}
						paneIndex={index}
					/>
				)}
			</SplitGrid>
		</Root>
	);
}