import demoDocument from '@graphData/graph-document.json';
import largeDocument from '@graphData/graph-document-1k.json';
import large5kDocument from '@graphData/graph-document-5k-timeline.json';

function isRecord(value) {
	return typeof value === 'object' && value !== null;
}

function parseOptionalNumber(raw) {
	return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function parseNode(raw) {
	if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.label !== 'string') {
		return null;
	}
	const depth = typeof raw.depth === 'number' ? raw.depth : 0;
	const subgraphId = typeof raw.subgraphId === 'string' ? raw.subgraphId : undefined;
	const start = parseOptionalNumber(raw.start);
	const end = parseOptionalNumber(raw.end);
	return { id: raw.id, label: raw.label, depth, subgraphId, start, end };
}

function parseEdge(raw) {
	if (!isRecord(raw) || typeof raw.source !== 'string' || typeof raw.target !== 'string') {
		return null;
	}
	return { source: raw.source, target: raw.target };
}

function parseGraphDefinition(raw) {
	if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.label !== 'string') {
		return null;
	}
	const nodesRaw = Array.isArray(raw.nodes) ? raw.nodes : [];
	const edgesRaw = Array.isArray(raw.edges) ? raw.edges : [];
	const nodes = nodesRaw.map(parseNode).filter((n) => n !== null);
	const edges = edgesRaw.map(parseEdge).filter((e) => e !== null);
	return { id: raw.id, label: raw.label, nodes, edges };
}

function normalizeGraphDocument(raw) {
	if (!isRecord(raw) || typeof raw.rootGraphId !== 'string') {
		throw new Error('Invalid graph document: missing rootGraphId');
	}
	const graphsRaw = isRecord(raw.graphs) ? raw.graphs : {};
	const graphs = {};
	for (const [key, value] of Object.entries(graphsRaw)) {
		const graph = parseGraphDefinition(value);
		if (graph) graphs[key] = graph;
	}
	if (!graphs[raw.rootGraphId]) {
		throw new Error(`Invalid graph document: root graph "${raw.rootGraphId}" not found`);
	}
	return {
		schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1,
		rootGraphId: raw.rootGraphId,
		timelineStart: parseOptionalNumber(raw.timelineStart),
		timelineEnd: parseOptionalNumber(raw.timelineEnd),
		graphs
	};
}

const DATASETS = {
	demo: normalizeGraphDocument(demoDocument),
	'large-1k': normalizeGraphDocument(largeDocument),
	'large-5k': normalizeGraphDocument(large5kDocument)
};

export function loadGraphDocument(datasetId) {
	const document = DATASETS[datasetId];
	if (!document) {
		throw new Error(`Unknown graph dataset: "${datasetId}"`);
	}
	return document;
}

export function getGraphDefinition(
	document,
	graphId
) {
	return document.graphs[graphId];
}