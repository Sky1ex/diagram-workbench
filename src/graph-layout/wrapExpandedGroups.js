import { Position } from '@xyflow/react';

const GROUP_PADDING = 12;
const GROUP_HEADER = 28;

function nestingDepth(
	hostFlowId,
	nodes,
	expandedHostFlowIds
) {
	let depth = 0;
	let current = nodes.find((node) => node.id === hostFlowId);
	while (current?.data.parentHostFlowId && expandedHostFlowIds.has(current.data.parentHostFlowId)) {
		depth += 1;
		current = nodes.find((node) => node.id === current.data.parentHostFlowId);
	}
	return depth;
}

function wrapSingleHost(
	layoutedNodes,
	hostFlowId
) {
	const members = layoutedNodes.filter(
		(node) => node.id === hostFlowId || node.data.parentHostFlowId === hostFlowId
	);
	if (members.length === 0) return layoutedNodes;

	const consumed = new Set(members.map((member) => member.id));
	const anchor = members.find((node) => node.id === hostFlowId);
	const children = members.filter((node) => node.id !== hostFlowId);

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const member of members) {
		const w = member.data.width;
		const h = member.data.height;
		minX = Math.min(minX, member.position.x);
		minY = Math.min(minY, member.position.y);
		maxX = Math.max(maxX, member.position.x + w);
		maxY = Math.max(maxY, member.position.y + h);
	}

	const groupX = minX - GROUP_PADDING;
	const groupY = minY - GROUP_PADDING - GROUP_HEADER;
	const groupW = Math.max(maxX - minX + GROUP_PADDING * 2, anchor?.data.width ?? 120);
	const groupH = Math.max(maxY - minY + GROUP_PADDING * 2 + GROUP_HEADER, anchor?.data.height ?? 60);

	const meta = anchor?.data ?? children[0]?.data;
	const enclosingHostFlowId = anchor?.data.parentHostFlowId;

	const wrapped = [
		{
			id: hostFlowId,
			type: 'groupNode',
			position: { x: groupX, y: groupY },
			sourcePosition: Position.Top,
			targetPosition: Position.Bottom,
			style: { width: groupW, height: groupH },
			data: {
				label: meta?.label ?? 'Подграф',
				fullLabel: meta?.fullLabel ?? meta?.label ?? 'Подграф',
				localId: meta?.localId ?? hostFlowId,
				graphId: meta?.graphId ?? '',
				subgraphId: meta?.subgraphId,
				width: groupW,
				height: groupH,
				compact: meta?.compact,
				isExpanded: true,
				parentHostFlowId: enclosingHostFlowId
			},
			draggable: false
		},
		...children.map((child) => ({
			...child,
			parentId: hostFlowId,
			extent: 'parent',
			position: {
				x: child.position.x - groupX,
				y: child.position.y - groupY
			},
			data: {
				...child.data,
				parentHostFlowId: undefined,
				isLayoutAnchor: undefined
			}
		}))];

	return [...layoutedNodes.filter((node) => !consumed.has(node.id)), ...wrapped];
}

/**
 * После flat-layout превращает якорь + детей раскрытого folder в RF group node.
 * Вложенные группы оборачиваются изнутри наружу.
 */
export function wrapExpandedGroups(
	layoutedNodes,
	expandedHostFlowIds
) {
	if (expandedHostFlowIds.size === 0) return layoutedNodes;

	const hosts = [...expandedHostFlowIds].sort(
		(a, b) =>
			nestingDepth(b, layoutedNodes, expandedHostFlowIds) -
			nestingDepth(a, layoutedNodes, expandedHostFlowIds)
	);

	return hosts.reduce(
		(current, hostFlowId) => wrapSingleHost(current, hostFlowId),
		layoutedNodes
	);
}