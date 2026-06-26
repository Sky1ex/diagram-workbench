import {
	DefaultGraph
} from 'yfiles';

import { getSubgraphEntryNodeId, getSubgraphExitNodeId } from '@graphLayout';

import { YFILES_DAG_NODE_SIZE, YFILES_FOLDER_NODE_SIZE } from './applyYFilesStyles';

const NODE_SIZE = YFILES_DAG_NODE_SIZE;
const FOLDER_NODE_SIZE = YFILES_FOLDER_NODE_SIZE;

function nodeRegistryKey(graphId, localId) {
	return `${graphId}:${localId}`;
}

function createLabeledNode(
	graph,
	graphId,
	nodeDef,
	parent
) {
	const size = nodeDef.subgraphId ? FOLDER_NODE_SIZE : NODE_SIZE;
	const layout = parent ?
		{ x: 20, y: 20, width: size.width, height: size.height } :
		{ x: 0, y: 0, width: size.width, height: size.height };

	const tag = {
		localId: nodeDef.id,
		label: nodeDef.label,
		subgraphId: nodeDef.subgraphId,
		graphId
	};

	const node = graph.createNode({
		layout,
		labels: [nodeDef.label],
		tag
	});

	if (parent) {
		graph.setParent(node, parent);
	}

	return node;
}

function resolveEdgeEndpoint(
	nodeDef,
	document,
	nodeRegistry,
	endpoint,
	mode
) {
	if (!nodeDef?.subgraphId || !endpoint) return endpoint;

	const subgraph = document.graphs[nodeDef.subgraphId];
	if (!subgraph) return endpoint;

	const portLocalId =
		mode === 'target' ?
			getSubgraphEntryNodeId(subgraph) :
			getSubgraphExitNodeId(subgraph);
	if (!portLocalId) return endpoint;

	return nodeRegistry.get(nodeRegistryKey(subgraph.id, portLocalId)) ?? endpoint;
}

function populateGraphLevel(
	master,
	document,
	graphDef,
	parentGroup,
	nodeRegistry
) {
	const nodeById = new Map();
	const nodeDefById = new Map(graphDef.nodes.map((node) => [node.id, node]));

	for (const nodeDef of graphDef.nodes) {
		const inode = createLabeledNode(master, graphDef.id, nodeDef, parentGroup);
		nodeById.set(nodeDef.id, inode);
		nodeRegistry.set(nodeRegistryKey(graphDef.id, nodeDef.id), inode);

		if (nodeDef.subgraphId) {
			const childDef = document.graphs[nodeDef.subgraphId];
			if (childDef) {
				populateGraphLevel(master, document, childDef, inode, nodeRegistry);
			}
		}
	}

	for (const edge of graphDef.edges) {
		const sourceDef = nodeDefById.get(edge.source);
		const targetDef = nodeDefById.get(edge.target);
		const source = resolveEdgeEndpoint(
			sourceDef,
			document,
			nodeRegistry,
			nodeById.get(edge.source),
			'source'
		);
		const target = resolveEdgeEndpoint(
			targetDef,
			document,
			nodeRegistry,
			nodeById.get(edge.target),
			'target'
		);
		if (source && target) {
			master.createEdge(source, target);
		}
	}

	return nodeById;
}

export function buildMasterGraphFromDocument(document) {
	const root = document.graphs[document.rootGraphId];
	if (!root) {
		throw new Error(`Root graph "${document.rootGraphId}" is missing`);
	}
	const master = new DefaultGraph();
	populateGraphLevel(master, document, root, null, new Map());
	return master;
}