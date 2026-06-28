import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';

import {
	HorizontalTab,
	LIGHT_THEME,
	MenuItem,
	Option,
	Select,
	TabMenuHorizontal,
	TabText
} from '@admiral-ds/react-ui';

import { AnyChartGanttPanel } from '@anyChart';
import { TabLoadingState } from './components/TabLoadingState';

import {
	GraphBreadcrumbBar,
	GraphDocumentProvider,
	GraphInteractionProvider
} from '@graphContext';

import YFilesGraphPanel from '@yFiles/YFilesGraphPanel';

import { CompareSplitPanel, COMPARE_DEFAULT_LIBRARIES } from './components/CompareSplitPanel';
import { GraphContextMenuLayer } from './components/GraphContextMenuLayer';
import { LIBRARY_TAB_IDS, libraryTabLabels } from './libraryTabs';
import { MOBILE } from './styles/breakpoints';

const DagLodPanel = lazy(() => import('@reactFlow/DagLodPanel'));
const ThreeScenePanel = lazy(() => import('@threeJs/ThreeScenePanel'));

const Shell = styled.div`
	box-sizing: border-box;
	flex: 1;
	min-height: 0;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	background: ${({ theme }) => theme.color['Neutral/Neutral 00']};
`;

const TabBarChrome = styled.div`
	flex-shrink: 0;
	background: ${({ theme }) => theme.color['Neutral/Neutral 10']};
	border-bottom: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};
	padding: 8px 12px 0;
	display: flex;
	align-items: flex-end;
	gap: 16px;

	${MOBILE} {
		flex-direction: column;
		align-items: stretch;
		gap: 8px;
		padding: 8px 8px 0;
	}
`;

const DatasetSelectWrap = styled.div`
	flex-shrink: 0;
	width: 220px;
	padding-bottom: 6px;

	${MOBILE} {
		width: 100%;
		padding-bottom: 0;
	}
`;

const TabMenuWrap = styled.div`
	flex: 1;
	min-width: 0;
	padding-bottom: 6px;

	${MOBILE} {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
`;

const datasetOptions = [
	{ id: 'demo', label: 'Demo (~26 узлов)' },
	{ id: 'large-1k', label: 'Large (~1k узлов)' },
	{ id: 'large-5k', label: 'Large (~5k, timeline)' }
];

const CanvasFrame = styled.div`
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	padding: 0 12px 12px;

	${MOBILE} {
		padding: 0 4px 4px;
	}
`;

const Viewport = styled.div`
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	margin-top: 0;
	border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};
	border-top: none;
	border-radius: 0 0 8px 8px;
	background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
	overflow: hidden;
`;

const TabPanel = styled.div`
	flex: 1;
	min-height: 0;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
`;

const MenuItemLabel = styled.span`
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

export function DiagramWorkbench() {
	const [selectedTabId, setSelectedTabId] = useState('yfiles');
	const [datasetId, setDatasetId] = useState('demo');
	const [comparePanelCount, setComparePanelCount] = useState(2);
	const [compareLibraries, setCompareLibraries] = useState(() => [
		...COMPARE_DEFAULT_LIBRARIES]
	);

	const setCompareLibraryAt = useCallback((index, id) => {
		setCompareLibraries((prev) => {
			const next = [...prev];
			next[index] = id;
			return next;
		});
	}, []);

	const tabsId = useMemo(() => [...LIBRARY_TAB_IDS], []);

	const tabIsDisabled = useCallback(() => false, []);

	const renderDropMenuItem = useCallback((tabId) => {
		return (options) =>
			<MenuItem dimension="l" {...options} key={tabId}>
				<MenuItemLabel>{libraryTabLabels[tabId] ?? tabId}</MenuItemLabel>
			</MenuItem>;

	}, []);

	const renderTab = useCallback(
		(tabId, selected, onSelectTab) => {
			const label = libraryTabLabels[tabId] ?? tabId;
			return (
				<HorizontalTab
					tabId={tabId}
					key={tabId}
					dimension="l"
					selected={selected}
					onSelectTab={onSelectTab}>

					<TabText>{label}</TabText>
				</HorizontalTab>
			);
		},
		[]
	);

	return (
		<ThemeProvider theme={LIGHT_THEME}>
			<GraphDocumentProvider datasetId={datasetId} key={datasetId}>
				<GraphInteractionProvider>
					<Shell>
						<TabBarChrome>
							<DatasetSelectWrap>
								<Select
									dimension="m"
									value={datasetId}
									onChange={(e) => setDatasetId(e.target.value)}
								>
									{datasetOptions.map((opt) =>
										<Option key={opt.id} value={opt.id}>
											{opt.label}
										</Option>
									)}
								</Select>
							</DatasetSelectWrap>
							<TabMenuWrap>
								<TabMenuHorizontal
									dimension="l"
									appearance="primary"
									showUnderline
									tabsId={tabsId}
									selectedTabId={selectedTabId}
									defaultSelectedTabId="yfiles"
									onSelectTab={setSelectedTabId}
									renderTab={renderTab}
									renderDropMenuItem={renderDropMenuItem}
									tabIsDisabled={tabIsDisabled}
								/>
							</TabMenuWrap>
						</TabBarChrome>
						<CanvasFrame>
							{selectedTabId !== 'compare' && <GraphBreadcrumbBar />}
							<Viewport>
								{selectedTabId === 'compare' &&
									<TabPanel>
										<CompareSplitPanel
											panelCount={comparePanelCount}
											onPanelCountChange={setComparePanelCount}
											libraries={compareLibraries}
											onLibraryChange={setCompareLibraryAt}
										/>
									</TabPanel>
								}
								{selectedTabId === 'yfiles' &&
									<TabPanel>
										<YFilesGraphPanel style={{ flex: 1, minHeight: 0, height: '100%' }} />
									</TabPanel>
								}
								{selectedTabId === 'anychart' &&
									<TabPanel>
										<AnyChartGanttPanel />
									</TabPanel>
								}
								{selectedTabId === 'threejs' &&
									<TabPanel>
										<Suspense fallback={<TabLoadingState label="Three.js" />}>
											<ThreeScenePanel />
										</Suspense>
									</TabPanel>
								}
								{selectedTabId === 'reactflow' &&
									<TabPanel>
										<Suspense fallback={<TabLoadingState label="React Flow" />}>
											<DagLodPanel />
										</Suspense>
									</TabPanel>
								}
							</Viewport>
						</CanvasFrame>
						<GraphContextMenuLayer />
					</Shell>
				</GraphInteractionProvider>
			</GraphDocumentProvider>
		</ThemeProvider>
	);
}