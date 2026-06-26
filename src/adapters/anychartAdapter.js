import { toFlowNodeId } from '@graphLayout';

import { collectFolderHostFlowIds } from '../graph-context/collectFolderHostFlowIds';

const MS_HOUR = 3_600_000;

function hasNodeTimeline(node) {
	return node.start !== undefined && node.end !== undefined;
}

function resolveNodeTimes(
	node,
	index
) {
	if (hasNodeTimeline(node)) {
		const actualStart = node.start;
		const actualEnd = Math.max(node.end, actualStart + MS_HOUR);
		return { actualStart, actualEnd };
	}

	const start = index.value++;
	return { actualStart: start, actualEnd: start + 1 };
}

function buildGraphRows(
	document,
	graph,
	index
) {
	const rows = [];

	for (const node of graph.nodes) {
		const hostFlowId = toFlowNodeId(graph.id, node.id);
		const { actualStart, actualEnd } = resolveNodeTimes(node, index);
		const row = {
			id: hostFlowId,
			name: node.label,
			actualStart,
			actualEnd,
			hostFlowId,
			subgraphId: node.subgraphId ?? null
		};

		if (node.subgraphId) {
			const subgraph = document.graphs[node.subgraphId];
			if (subgraph && subgraph.nodes.length > 0) {
				row.children = buildGraphRows(document, subgraph, index);
			}
		}

		rows.push(row);
	}

	return rows;
}

function collectRowTimelineRange(rows) {
	let minimum = Infinity;
	let maximum = -Infinity;

	const walk = (list) => {
		for (const row of list) {
			minimum = Math.min(minimum, row.actualStart);
			maximum = Math.max(maximum, row.actualEnd);
			if (row.children?.length) walk(row.children);
		}
	};

	walk(rows);
	if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return null;
	return { minimum, maximum };
}

function resolveDocumentTimeline(
	document,
	rows,
	index
) {
	if (document.timelineStart !== undefined && document.timelineEnd !== undefined) {
		return { minimum: document.timelineStart, maximum: document.timelineEnd };
	}

	const fromRows = collectRowTimelineRange(rows);
	if (fromRows) return fromRows;

	return { minimum: 0, maximum: Math.max(index.value, 1) };
}

/** Полное дерево документа для AnyChart Gantt (as-tree); сворачивание — через expandTask/collapseTask. */
export function documentToGanttTree(document) {
	const root = document.graphs[document.rootGraphId];
	if (!root) {
		return {
			rows: [],
			timeline: { minimum: 0, maximum: 1 },
			folderIds: []
		};
	}

	const index = { value: 0 };
	const rows = buildGraphRows(document, root, index);

	return {
		rows,
		timeline: resolveDocumentTimeline(document, rows, index),
		folderIds: collectFolderHostFlowIds(document)
	};
}