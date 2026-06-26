import { useGraphInteraction, useGraphView } from '@graphContext';
import { findGraphNode, nodeToHitAttributes, parseFlowNodeId } from '@graphContext';

function isFolderNodeType(type) {
	return type === 'folderNode' || type === 'compactFolderNode';
}

function isGroupNodeType(type) {
	return type === 'groupNode' || type === 'compactGroupNode';
}

export function buildReactFlowNodeContextMenuRequest(
	document,
	expandedHostFlowIds,
	clientX,
	clientY,
	node
) {
	const label = node.data.fullLabel ?? node.data.label;
	const isFolder = isFolderNodeType(node.type);
	const isGroup = isGroupNodeType(node.type);
	const isExpanded = isGroup || expandedHostFlowIds.has(node.id);
	const parsed = parseFlowNodeId(node.id);
	const graphNode = findGraphNode(document, node.id);
	const attributes =
		graphNode && parsed ?
			nodeToHitAttributes(graphNode, parsed.graphId) :
			{ label, flowId: node.id };

	return {
		rendererId: 'reactflow',
		clientX,
		clientY,
		target: {
			kind: 'node',
			flowId: node.id,
			label,
			isFolder: isFolder || isGroup,
			isExpanded
		},
		attributes
	};
}

export function buildReactFlowEdgeContextMenuRequest(
	clientX,
	clientY,
	edge
) {
	return {
		rendererId: 'reactflow',
		clientX,
		clientY,
		target: {
			kind: 'edge',
			flowId: edge.id,
			label: `${edge.source} → ${edge.target}`
		},
		attributes: {
			label: `${edge.source} → ${edge.target}`,
			flowId: edge.id
		}
	};
}

export function useReactFlowContextMenu() {
	const { document, expandedHostFlowIds } = useGraphView();
	const { openContextMenu } = useGraphInteraction();

	return {
		onNodeContextMenu: (event, node) => {
			event.preventDefault();
			openContextMenu(
				buildReactFlowNodeContextMenuRequest(
					document,
					expandedHostFlowIds,
					event.clientX,
					event.clientY,
					node
				)
			);
		},
		onEdgeContextMenu: (event, edge) => {
			event.preventDefault();
			openContextMenu(
				buildReactFlowEdgeContextMenuRequest(event.clientX, event.clientY, edge)
			);
		}
	};
}