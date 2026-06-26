import { memo } from 'react';

import { Handle, Position } from '@xyflow/react';
import styled from 'styled-components';

import { GRAPH_VISUAL_THEME } from '@graphLayout';

import { useReactFlowInteraction } from './reactFlowInteractionContext';

const NodeShell = styled.div`
	position: relative;
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	padding: ${({ $compact, $folder }) =>
		$compact ? '0' : $folder ? '8px 28px 8px 10px' : '8px 10px'};
	border-radius: ${({ $compact }) => $compact ? '4px' : '8px'};
	border: ${({ $compact, $folder, $selected }) => {
		const width = $selected ? '2px' : $compact ? '1px' : '1.5px';
		const color = $selected ?
			'#2563eb' :
			$folder ?
				GRAPH_VISUAL_THEME.folderStroke :
				GRAPH_VISUAL_THEME.nodeStroke;
		return `${width} solid ${color}`;
	}};
	background: ${({ $folder, $selected }) =>
		$selected ? '#eff6ff' : $folder ? GRAPH_VISUAL_THEME.folderFill : GRAPH_VISUAL_THEME.nodeFill};
	color: ${GRAPH_VISUAL_THEME.nodeText};
	font-size: ${({ $compact }) => $compact ? '0' : '11px'};
	line-height: 1.25;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2px;
	cursor: default;
	pointer-events: all;
	box-shadow: ${({ $compact, $selected }) =>
		$selected ? '0 0 0 2px rgba(37, 99, 235, 0.15)' : $compact ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.04)'};
	overflow: hidden;
`;

const NodeLabel = styled.span`
	width: 100%;
	max-width: 100%;
	overflow: hidden;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	line-clamp: 3;
	word-break: break-word;
	overflow-wrap: anywhere;
`;

const FolderExpandButton = styled.button`
	position: absolute;
	top: 4px;
	right: 4px;
	z-index: 2;
	width: 20px;
	height: 20px;
	padding: 0;
	border: 1px solid ${GRAPH_VISUAL_THEME.folderStroke};
	border-radius: 4px;
	background: #ffffff;
	color: ${GRAPH_VISUAL_THEME.folderAccent};
	font-size: 14px;
	line-height: 1;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover:not(:disabled) {
		background: ${GRAPH_VISUAL_THEME.folderFill};
		border-color: ${GRAPH_VISUAL_THEME.folderAccent};
	}

	&:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
`;

const CompactFolderDot = styled.span`
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: ${GRAPH_VISUAL_THEME.folderAccent};
	`;

const GroupShell = styled.div`
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	border-radius: ${({ $compact }) => $compact ? '6px' : '10px'};
	border: ${({ $compact, $selected }) =>
		$selected ?
			'2px solid #2563eb' :
			$compact ?
				`1px dashed ${GRAPH_VISUAL_THEME.folderStroke}` :
				`2px dashed ${GRAPH_VISUAL_THEME.folderStroke}`};
	background: ${({ $selected }) => $selected ? 'rgba(239, 246, 255, 0.55)' : GRAPH_VISUAL_THEME.folderFill};
	pointer-events: none;
	overflow: hidden;
	box-shadow: ${({ $selected }) => $selected ? '0 0 0 2px rgba(37, 99, 235, 0.12)' : 'none'};
`;

const GroupHeader = styled.div`
	box-sizing: border-box;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: ${({ $compact }) => $compact ? '2px 6px' : '4px 10px'};
	border-bottom: 1px dashed ${GRAPH_VISUAL_THEME.folderStroke};
	background: rgba(255, 255, 255, 0.65);
	color: ${GRAPH_VISUAL_THEME.folderAccent};
	font-size: ${({ $compact }) => $compact ? '9px' : '11px'};
	font-weight: 600;
	pointer-events: all;
	text-align: left;
	min-width: 0;
`;

const GroupTitle = styled.span`
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const GroupCollapseButton = styled.button`
	flex-shrink: 0;
	width: 18px;
	height: 18px;
	padding: 0;
	border: 1px solid ${GRAPH_VISUAL_THEME.folderStroke};
	border-radius: 4px;
	background: #ffffff;
	color: ${GRAPH_VISUAL_THEME.folderAccent};
	font-size: 13px;
	line-height: 1;
	cursor: pointer;

	&:hover {
		background: ${GRAPH_VISUAL_THEME.folderFill};
	}
`;

function useNodeSelection(id) {
	const { selectedNodeId } = useReactFlowInteraction();
	return selectedNodeId === id;
}

function useFolderExpand(id) {
	const { canExpandFolder, onToggleFolderExpand } = useReactFlowInteraction();

	const handleExpand = (event) => {
		event.stopPropagation();
		if (!canExpandFolder(id)) return;
		onToggleFolderExpand(id);
	};

	return { canExpand: canExpandFolder(id), handleExpand };
}

function useGroupCollapse(id) {
	const { onToggleFolderExpand } = useReactFlowInteraction();

	const handleCollapse = (event) => {
		event.stopPropagation();
		onToggleFolderExpand(id);
	};

	return handleCollapse;
}

const DagNode = memo(function DagNode({ id, data }) {
	const selected = useNodeSelection(id);
	const label = data.fullLabel ?? data.label;

	return (
		<NodeShell $selected={selected} title={label}>
			<Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
			<NodeLabel>{label}</NodeLabel>
			<Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
		</NodeShell>);

});

const FolderNode = memo(function FolderNode({ id, data }) {
	const selected = useNodeSelection(id);
	const { canExpand, handleExpand } = useFolderExpand(id);
	const label = data.fullLabel ?? data.label;

	return (
		<NodeShell $folder $selected={selected} title={label}>
			<Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
			<FolderExpandButton
				type="button"
				title={canExpand ? 'Раскрыть подграф' : 'Достигнут лимит раскрытых подграфов'}
				disabled={!canExpand}
				onClick={handleExpand}>

				+
			</FolderExpandButton>
			<NodeLabel>{label}</NodeLabel>
			<Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
		</NodeShell>
	);
});

const CompactDagNode = memo(function CompactDagNode({ id, data }) {
	const selected = useNodeSelection(id);

	return (
		<NodeShell $compact $selected={selected} title={data.fullLabel ?? data.label}>
			<Handle type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1 }} />
			<Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
		</NodeShell>
	);
});

const CompactFolderNode = memo(function CompactFolderNode({ id, data }) {
	const selected = useNodeSelection(id);
	const { canExpand, handleExpand } = useFolderExpand(id);

	return (
		<NodeShell $compact $folder $selected={selected} title={data.fullLabel ?? data.label}>
			<Handle type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1 }} />
			<FolderExpandButton
				type="button"
				title={canExpand ? 'Раскрыть подграф' : 'Достигнут лимит раскрытых подграфов'}
				disabled={!canExpand}
				onClick={handleExpand}
				style={{ width: 14, height: 14, fontSize: 11, top: 2, right: 2 }}>

				+
			</FolderExpandButton>
			<CompactFolderDot aria-hidden />
			<Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
		</NodeShell>
	);
});

const GroupNode = memo(function GroupNode({ id, data }) {
	const selected = useNodeSelection(id);
	const handleCollapse = useGroupCollapse(id);
	const label = data.fullLabel ?? data.label;

	return (
		<GroupShell $selected={selected}>
			<Handle type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1 }} />
			<GroupHeader>
				<GroupTitle title={label}>{data.label}</GroupTitle>
				<GroupCollapseButton type="button" title="Свернуть подграф" onClick={handleCollapse}>
					−
				</GroupCollapseButton>
			</GroupHeader>
			<Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
		</GroupShell>
	);
});

const CompactGroupNode = memo(function CompactGroupNode({ id, data }) {
	const selected = useNodeSelection(id);
	const handleCollapse = useGroupCollapse(id);

	return (
		<GroupShell $compact $selected={selected}>
			<Handle type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1 }} />
			<GroupHeader $compact>
				<GroupTitle title={data.fullLabel ?? data.label}>{data.label}</GroupTitle>
				<GroupCollapseButton type="button" title="Свернуть подграф" onClick={handleCollapse}>
					−
				</GroupCollapseButton>
			</GroupHeader>
			<Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
		</GroupShell>
	);
});

const LayoutAnchor = memo(function LayoutAnchor() {
	return (
		<div style={{ width: '100%', height: '100%', opacity: 0, pointerEvents: 'none' }}>
			<Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
			<Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
		</div>
	);
});

export const reactFlowNodeTypes = {
	dagNode: DagNode,
	folderNode: FolderNode,
	compactDagNode: CompactDagNode,
	compactFolderNode: CompactFolderNode,
	groupNode: GroupNode,
	compactGroupNode: CompactGroupNode,
	layoutAnchor: LayoutAnchor
};