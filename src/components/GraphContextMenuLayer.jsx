import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

import {
	buildInitialFilterDraft,
	useGraphInteraction,
	useGraphView
} from '@graphContext';
import {
	collectDistinctDepthsInScope,
	documentHasTimeline
} from '@graphContext/filterGraphScene';

import { useContextMenuPlacement, VIEWPORT_PADDING } from './contextMenuPlacement';
import {
	GraphContextMenuFilter,
	normalizeFilterCriteria
} from './GraphContextMenuFilter';

const MenuRoot = styled.div`
	position: fixed;
	z-index: 1200;
	min-width: ${({ $filterExpanded }) => $filterExpanded ? '240px' : '168px'};
	padding: 4px 0;
	border-radius: 8px;
	background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
	border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
	box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
	box-sizing: border-box;
	max-height: ${({ $scrollable }) =>
		$scrollable ? `calc(100dvh - ${VIEWPORT_PADDING * 2}px)` : 'none'};
	overflow-y: ${({ $scrollable }) => $scrollable ? 'auto' : 'visible'};
	overflow-x: ${({ $scrollable }) => $scrollable ? 'hidden' : 'visible'};
`;

const MenuItemButton = styled.button`
	display: block;
	width: 100%;
	padding: 8px 14px;
	border: none;
	background: ${({ theme, $active }) =>
		$active ? theme.color['Neutral/Neutral 10'] : 'transparent'};
	text-align: left;
	font-size: 13px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 90']};
	cursor: pointer;

	&:hover:not(:disabled) {
		background: ${({ theme }) => theme.color['Neutral/Neutral 10']};
	}

	&:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
`;

const MenuDivider = styled.div`
	height: 1px;
	margin: 4px 0;
	background: ${({ theme }) => theme.color['Neutral/Neutral 20']};
`;

const TargetHint = styled.div`
	padding: 6px 14px 4px;
	font-size: 11px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 280px;
`;

function GraphContextMenu() {
	const menuRef = useRef(null);
	const [filterExpanded, setFilterExpanded] = useState(false);
	const [filterDraft, setFilterDraft] = useState({});
	const {
		contextMenu,
		filterActive,
		filterCriteria,
		closeContextMenu,
		applyFilter,
		clearFilter,
		toggleBranchChildrenHidden,
		isBranchChildrenHidden
	} = useGraphInteraction();

	const { document: graphDocument, expandedHostFlowIds, toggleFolderExpand } = useGraphView();

	const depthOptions = useMemo(
		() => collectDistinctDepthsInScope(graphDocument, expandedHostFlowIds),
		[graphDocument, expandedHostFlowIds]
	);
	const hasTimeline = useMemo(() => documentHasTimeline(graphDocument), [graphDocument]);

	useEffect(() => {
		if (!contextMenu) {
			setFilterExpanded(false);
			return;
		}
		setFilterExpanded(false);
		setFilterDraft(buildInitialFilterDraft(contextMenu, filterCriteria));
	}, [contextMenu, filterCriteria]);

	useEffect(() => {
		if (!contextMenu) return;

		const handlePointerDown = (event) => {
			const target = event.target;
			if (menuRef.current?.contains(target ?? null)) return;
			closeContextMenu();
		};

		const handleKeyDown = (event) => {
			if (event.key === 'Escape') {
				if (filterExpanded) {
					setFilterExpanded(false);
					return;
				}
				closeContextMenu();
			}
		};

		window.addEventListener('pointerdown', handlePointerDown, true);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('pointerdown', handlePointerDown, true);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [contextMenu, filterExpanded, closeContextMenu]);

	const placementLayoutKey = [
		filterExpanded ? 'filter' : 'base',
		hasTimeline ? 'timeline' : 'no-timeline',
		depthOptions.length,
		filterActive ? 'filter-active' : 'no-filter'].
		join('|');
	const placement = useContextMenuPlacement(
		contextMenu?.clientX ?? null,
		contextMenu?.clientY ?? null,
		menuRef,
		placementLayoutKey
	);

	if (!contextMenu) return null;

	const { target } = contextMenu;
	const showFolderActions = target.kind === 'node' && target.isFolder;

	const toggleFilter = () => {
		if (!filterExpanded) {
			setFilterDraft(buildInitialFilterDraft(contextMenu, filterCriteria));
		}
		setFilterExpanded((prev) => !prev);
	};

	const handleApplyFilter = () => {
		applyFilter(normalizeFilterCriteria(filterDraft));
		closeContextMenu();
	};

	const handleResetFilter = () => {
		clearFilter();
		closeContextMenu();
	};

	return createPortal(
		<MenuRoot
			ref={menuRef}
			$scrollable={filterExpanded}
			$filterExpanded={filterExpanded}
			style={{ left: placement.left, top: placement.top }}
		>
			{filterExpanded &&
				<>
					<GraphContextMenuFilter
						draft={filterDraft}
						depthOptions={depthOptions}
						hasTimeline={hasTimeline}
						onDraftChange={setFilterDraft}
						onApply={handleApplyFilter}
						onReset={handleResetFilter}
					/>
					<MenuDivider />
				</>
			}
			<TargetHint>
				{target.kind === 'edge' ? 'Ребро' : 'Узел'}: {target.label}
			</TargetHint>
			<MenuItemButton type="button" $active={filterExpanded} onClick={toggleFilter}>
				{filterExpanded ? 'Скрыть фильтр' : 'Фильтр…'}
			</MenuItemButton>
			{target.kind === 'node' &&
				<MenuItemButton
					type="button"
					onClick={() => {
						toggleBranchChildrenHidden(target.flowId);
						closeContextMenu();
					}}>

					{isBranchChildrenHidden(target.flowId) ? 'Показать детей' : 'Скрыть детей'}
				</MenuItemButton>
			}
			{showFolderActions &&
				<MenuItemButton
					type="button"
					onClick={() => {
						toggleFolderExpand(target.flowId);
						closeContextMenu();
					}}
				>
					{target.isExpanded ? 'Свернуть' : 'Раскрыть'}
				</MenuItemButton>
			}
			{filterActive &&
				<>
					<MenuDivider />
					<MenuItemButton
						type="button"
						onClick={() => {
							clearFilter();
							closeContextMenu();
						}}
					>
						Сбросить фильтр
					</MenuItemButton>
				</>
			}
		</MenuRoot>,
		document.body
	);
}

export function GraphContextMenuLayer() {
	return <GraphContextMenu />;
}