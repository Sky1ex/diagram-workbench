import { runDagreLayout } from '@graphLayout';

/** Равномерный шаг по осям. */
const NODE_GAP = 3.6;
const LEVEL_Y_GAP = 4.8;
const Z_SIBLING_GAP = 10;
const CLUSTER_NODE_GAP = 3;
const CLUSTER_LEVEL_Y_GAP = 3.2;

function nodeCenter2d(node) {
	return {
		x: node.position.x + node.data.width / 2,
		y: node.position.y + node.data.height / 2
	};
}

function getNodeDepth(nodeData, document) {
	const graph = document.graphs[nodeData.graphId];
	const def = graph?.nodes.find((n) => n.id === nodeData.localId);
	return def?.depth ?? 0;
}

function orderNodesByDagre(layouted) {
	return [...layouted].
		map((node) => ({ node, ...nodeCenter2d(node) })).
		sort((a, b) => a.y - b.y || a.x - b.x).
		map((item) => item.node);
}

function placeGridOnXZ(
	ordered,
	y,
	out,
	gap) {
	const count = ordered.length;
	if (count === 0) return;

	const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
	const rows = Math.ceil(count / cols);

	for (let i = 0; i < count; i++) {
		const col = i % cols;
		const row = Math.floor(i / cols);
		const x = (col - (cols - 1) / 2) * gap;
		const z = (row - (rows - 1) / 2) * gap;
		out.set(ordered[i].id, [x, y, z]);
	}
}

/** Равномерная 3D-решётка (текущий режим). */
function placeUniform3DGrid(
	layouted,
	out,
	gap) {
	const ordered = orderNodesByDagre(layouted);
	const count = ordered.length;
	if (count === 0) return;

	const nx = Math.max(1, Math.ceil(Math.cbrt(count)));
	const ny = Math.max(1, Math.ceil(Math.sqrt(count / nx)));
	const nz = Math.max(1, Math.ceil(count / (nx * ny)));

	for (let i = 0; i < count; i++) {
		const ix = i % nx;
		const iy = Math.floor(i / nx) % ny;
		const iz = Math.floor(i / (nx * ny));
		const x = (ix - (nx - 1) / 2) * gap;
		const y = (iy - (ny - 1) / 2) * gap;
		const z = (iz - (nz - 1) / 2) * gap;
		out.set(ordered[i].id, [x, y, z]);
	}
}

/**
 * По уровням depth: старший (0) сверху, младшие ниже; внутри уровня — сетка X×Z.
 */
function placeByLevel3D(
	layouted,
	document,
	out,
	gap,
	levelYGap) {
	const byLevel = new Map();

	for (const node of layouted) {
		const level = getNodeDepth(node.data, document);
		const bucket = byLevel.get(level) ?? [];
		bucket.push(node);
		byLevel.set(level, bucket);
	}

	const levels = [...byLevel.keys()].sort((a, b) => a - b);

	for (const level of levels) {
		const atLevel = byLevel.get(level) ?? [];
		const ordered = [...atLevel].
			map((node) => ({ node, ...nodeCenter2d(node) })).
			sort((a, b) => a.x - b.x).
			map((item) => item.node);

		const y = -level * levelYGap;
		placeGridOnXZ(ordered, y, out, gap);
	}
}

function placeLayoutedNodes(
	layouted,
	document,
	out,
	mode,
	gap,
	levelYGap) {
	if (mode === 'byLevel') {
		placeByLevel3D(layouted, document, out, gap, levelYGap);
	} else {
		placeUniform3DGrid(layouted, out, gap);
	}
}

function computeSiblingZOffset(
	hostFlowId,
	expandedHostFlowIds,
	nodeById) {
	const host = nodeById.get(hostFlowId);
	const parentKey = host?.data.parentHostFlowId ?? null;

	const siblings = [...expandedHostFlowIds].
		filter((id) => (nodeById.get(id)?.data.parentHostFlowId ?? null) === parentKey).
		sort();

	const siblingIndex = siblings.indexOf(hostFlowId);
	if (siblingIndex <= 0) return 0;
	return siblingIndex * Z_SIBLING_GAP;
}

function centerPositionsByGlobalNodes(
	positions,
	globalIds) {
	let sx = 0;
	let sy = 0;
	let sz = 0;
	let count = 0;

	for (const id of globalIds) {
		const pos = positions.get(id);
		if (!pos) continue;
		sx += pos[0];
		sy += pos[1];
		sz += pos[2];
		count += 1;
	}

	if (count === 0) return;

	const cx = sx / count;
	const cy = sy / count;
	const cz = sz / count;

	for (const [id, pos] of positions) {
		positions.set(id, [pos[0] - cx, pos[1] - cy, pos[2] - cz]);
	}
}

function layoutClusterAtHost(
	hostFlowId,
	members,
	memberEdges,
	anchorWorld,
	positions,
	document,
	mode) {
	if (members.length === 0) return;

	const { nodes: layouted } = runDagreLayout(members, memberEdges);
	const local = new Map();

	placeLayoutedNodes(layouted, document, local, mode, CLUSTER_NODE_GAP, CLUSTER_LEVEL_Y_GAP);

	const anchorLocal = local.get(hostFlowId);
	if (!anchorLocal) return;

	for (const [id, pos] of local) {
		positions.set(id, [
			pos[0] - anchorLocal[0] + anchorWorld[0],
			pos[1] - anchorLocal[1] + anchorWorld[1],
			pos[2] - anchorLocal[2] + anchorWorld[2]
		]);
	}
}

export function assignDagreLayout3D(
	nodes,
	edges,
	expandedHostFlowIds,
	document,
	mode) {
	const positions = new Map();
	if (nodes.length === 0) return positions;

	const nodeById = new Map(nodes.map((n) => [n.id, n]));

	const globalNodes = nodes.filter((n) => !n.data.parentHostFlowId);
	const globalIds = new Set(globalNodes.map((n) => n.id));
	const globalEdges = edges.filter((e) => globalIds.has(e.source) && globalIds.has(e.target));

	const { nodes: globalLayouted } = runDagreLayout(globalNodes, globalEdges);

	placeLayoutedNodes(globalLayouted, document, positions, mode, NODE_GAP, LEVEL_Y_GAP);

	const expandedHosts = [...expandedHostFlowIds].sort((a, b) => {
		const hostA = nodeById.get(a);
		const hostB = nodeById.get(b);
		const parentA = hostA?.data.parentHostFlowId ?? '';
		const parentB = hostB?.data.parentHostFlowId ?? '';
		if (parentA !== parentB) return parentA.localeCompare(parentB);
		return a.localeCompare(b);
	});

	for (const hostFlowId of expandedHosts) {
		const members = nodes.filter(
			(n) => n.id === hostFlowId || n.data.parentHostFlowId === hostFlowId
		);
		if (members.length === 0) continue;

		const memberIds = new Set(members.map((m) => m.id));
		const memberEdges = edges.filter(
			(e) => memberIds.has(e.source) && memberIds.has(e.target)
		);

		const baseAnchor = positions.get(hostFlowId);
		if (!baseAnchor) continue;

		const zOffset = computeSiblingZOffset(hostFlowId, expandedHostFlowIds, nodeById);
		const anchorWorld = [
			baseAnchor[0],
			baseAnchor[1],
			baseAnchor[2] + zOffset
		];

		layoutClusterAtHost(
			hostFlowId,
			members,
			memberEdges,
			anchorWorld,
			positions,
			document,
			mode
		);
	}

	centerPositionsByGlobalNodes(positions, globalIds);
	return positions;
}