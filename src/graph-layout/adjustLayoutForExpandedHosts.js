import { runDagreLayout } from './runDagreLayout';
import { getSubgraphEntryFlowId, getSubgraphExitFlowId } from './subgraphPorts';

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

function resizeNode(node, bbox) {
	return {
		...node,
		data: {
			...node.data,
			width: bbox.width,
			height: bbox.height
		},
		style: {
			...node.style,
			width: bbox.width,
			height: bbox.height
		}
	};
}

function computeClusterLayout(
	layouted,
	anchor
) {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const node of layouted) {
		minX = Math.min(minX, node.position.x);
		minY = Math.min(minY, node.position.y);
		maxX = Math.max(maxX, node.position.x + node.data.width);
		maxY = Math.max(maxY, node.position.y + node.data.height);
	}

	const originX = minX - GROUP_PADDING;
	const originY = minY - GROUP_PADDING - GROUP_HEADER;
	const width = Math.max(maxX - minX + GROUP_PADDING * 2, anchor?.data.width ?? 120);
	const height = Math.max(maxY - minY + GROUP_PADDING * 2 + GROUP_HEADER, anchor?.data.height ?? 60);

	const relativePositions = new Map();
	for (const node of layouted) {
		relativePositions.set(node.id, {
			x: node.position.x - originX,
			y: node.position.y - originY
		});
	}

	return { bbox: { width, height }, relativePositions };
}

function getDirectClusterMembers(
	hostFlowId,
	nodes,
	expandedHostFlowIds,
	clusterBboxes
) {
	const members = [];

	for (const node of nodes) {
		if (node.id === hostFlowId) {
			members.push(node);
			continue;
		}
		if (node.data.parentHostFlowId !== hostFlowId) continue;

		if (expandedHostFlowIds.has(node.id)) {
			const bbox = clusterBboxes.get(node.id);
			members.push(bbox ? resizeNode(node, bbox) : node);
			continue;
		}

		members.push(node);
	}

	return members;
}

function syntheticLayoutEdge(source, target) {
	return {
		id: `layout-bridge:${source}->${target}`,
		source,
		target,
		type: 'step'
	};
}

function buildClusterLayoutEdges(
	hostFlowId,
	members,
	memberEdges,
	document
) {
	const layoutEdges = [...memberEdges];
	const memberIds = new Set(members.map((member) => member.id));

	const entryId = getSubgraphEntryFlowId(document, hostFlowId);
	const exitId = getSubgraphExitFlowId(document, hostFlowId);

	if (entryId && memberIds.has(entryId) && entryId !== hostFlowId) {
		layoutEdges.push(syntheticLayoutEdge(hostFlowId, entryId));
	}
	if (exitId && memberIds.has(exitId) && exitId !== hostFlowId) {
		layoutEdges.push(syntheticLayoutEdge(exitId, hostFlowId));
	}

	return layoutEdges;
}

function layoutSingleCluster(
	hostFlowId,
	nodes,
	edges,
	document,
	expandedHostFlowIds,
	clusterBboxes
) {
	const members = getDirectClusterMembers(hostFlowId, nodes, expandedHostFlowIds, clusterBboxes);
	const memberIds = new Set(members.map((member) => member.id));
	const memberEdges = edges.filter(
		(edge) => memberIds.has(edge.source) && memberIds.has(edge.target)
	);
	const layoutEdges = buildClusterLayoutEdges(hostFlowId, members, memberEdges, document);
	const anchor = members.find((member) => member.id === hostFlowId);
	const { nodes: layouted } = runDagreLayout(members, layoutEdges);
	return computeClusterLayout(layouted, anchor);
}

function resolveToGlobalHost(
	nodeId,
	nodeById,
	expandedHostFlowIds
) {
	const node = nodeById.get(nodeId);
	if (!node) return nodeId;
	if (expandedHostFlowIds.has(nodeId)) return nodeId;

	let host = node.data.parentHostFlowId;
	while (host) {
		if (expandedHostFlowIds.has(host)) return host;
		host = nodeById.get(host)?.data.parentHostFlowId;
	}

	return nodeId;
}

function buildGlobalNodes(
	nodes,
	expandedHostFlowIds,
	clusterBboxes
) {
	return nodes.
		filter((node) => !node.data.parentHostFlowId).
		map((node) => {
			if (!expandedHostFlowIds.has(node.id)) return node;
			const bbox = clusterBboxes.get(node.id);
			return bbox ? resizeNode(node, bbox) : node;
		});
}

function buildGlobalEdges(
	edges,
	nodeById,
	expandedHostFlowIds
) {
	const result = [];
	const seen = new Set();

	for (const edge of edges) {
		const source = resolveToGlobalHost(edge.source, nodeById, expandedHostFlowIds);
		const target = resolveToGlobalHost(edge.target, nodeById, expandedHostFlowIds);
		if (source === target) continue;

		const key = `${source}->${target}`;
		if (seen.has(key)) continue;
		seen.add(key);

		result.push({
			...edge,
			id: `global:${key}`,
			source,
			target
		});
	}

	return result;
}

/**
 * Двухфазная раскладка inline expand (как RecursiveGroupLayout в yFiles):
 * 1) локальный dagre внутри каждого раскрытого подграфа → bbox;
 * 2) глобальный dagre с виртуальными узлами размером bbox;
 * 3) размещение детей относительно origin группы.
 */
export function layoutExpandedInlineScene(
	nodes,
	edges,
	expandedHostFlowIds,
	document
) {
	if (expandedHostFlowIds.size === 0) return nodes;

	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const clusterLayouts = new Map();
	const clusterBboxes = new Map();

	const hostsDeepFirst = [...expandedHostFlowIds].sort(
		(a, b) =>
			nestingDepth(b, nodes, expandedHostFlowIds) - nestingDepth(a, nodes, expandedHostFlowIds)
	);

	for (const hostFlowId of hostsDeepFirst) {
		const cluster = layoutSingleCluster(
			hostFlowId,
			nodes,
			edges,
			document,
			expandedHostFlowIds,
			clusterBboxes
		);
		clusterLayouts.set(hostFlowId, cluster);
		clusterBboxes.set(hostFlowId, cluster.bbox);
	}

	const globalNodes = buildGlobalNodes(nodes, expandedHostFlowIds, clusterBboxes);
	const globalEdges = buildGlobalEdges(edges, nodeById, expandedHostFlowIds);
	const { nodes: globalLayouted } = runDagreLayout(globalNodes, globalEdges);

	const positions = new Map();
	const clusterOrigins = new Map();

	for (const node of globalLayouted) {
		if (!expandedHostFlowIds.has(node.id)) {
			positions.set(node.id, { ...node.position });
		}
	}

	const hostsShallowFirst = [...expandedHostFlowIds].sort(
		(a, b) =>
			nestingDepth(a, nodes, expandedHostFlowIds) - nestingDepth(b, nodes, expandedHostFlowIds)
	);

	for (const hostFlowId of hostsShallowFirst) {
		const cluster = clusterLayouts.get(hostFlowId);
		if (!cluster) continue;

		const parentHost = nodeById.get(hostFlowId)?.data.parentHostFlowId;
		let originX;
		let originY;

		if (parentHost && expandedHostFlowIds.has(parentHost)) {
			const parentOrigin = clusterOrigins.get(parentHost);
			const relInParent = clusterLayouts.get(parentHost)?.relativePositions.get(hostFlowId);
			if (!parentOrigin || !relInParent) continue;
			originX = parentOrigin.x + relInParent.x;
			originY = parentOrigin.y + relInParent.y;
		} else {
			const virtualNode = globalLayouted.find((node) => node.id === hostFlowId);
			if (!virtualNode) continue;
			originX = virtualNode.position.x;
			originY = virtualNode.position.y;
		}

		clusterOrigins.set(hostFlowId, { x: originX, y: originY });

		for (const [nodeId, relPos] of cluster.relativePositions) {
			positions.set(nodeId, {
				x: originX + relPos.x,
				y: originY + relPos.y
			});
		}
	}

	return nodes.map((node) => ({
		...node,
		position: positions.get(node.id) ?? node.position
	}));
}