/** Размеры узлов (согласованы с yFiles graphDocumentToMasterGraph). */
export const DAG_NODE_SIZE = { width: 152, height: 52 };
export const FOLDER_NODE_SIZE = { width: 196, height: 64 };

/** Компактные узлы для large-1k — меньше DOM и быстрее layout. */
export const COMPACT_DAG_NODE_SIZE = { width: 88, height: 22 };
export const COMPACT_FOLDER_NODE_SIZE = { width: 100, height: 26 };

/** Порог: dagre вместо ELK, LOD, упрощённые рёбра. */
export const LARGE_GRAPH_NODE_THRESHOLD = 200;

/** Максимум одновременно раскрытых folder на large-1k (inline expand). */
export const MAX_INLINE_EXPAND_LARGE = 3;

/** Ниже этого zoom — компактные узлы без подписей. */
export const LOD_ZOOM_THRESHOLD = 0.48;

/** Debounce перед layout при быстрой навигации по breadcrumbs. */
export const LAYOUT_DEBOUNCE_MS = 80;
export const LARGE_GRAPH_LAYOUT_DEBOUNCE_MS = 200;

/** Отступы dagre (близко к applyYFilesLayout). */
export const DAGRE_GRAPH_OPTIONS = {
	rankdir: 'TB',
	nodesep: 40,
	ranksep: 56,
	marginx: 24,
	marginy: 24
};

export const DAGRE_LARGE_GRAPH_OPTIONS = {
	rankdir: 'TB',
	nodesep: 20,
	ranksep: 36,
	marginx: 16,
	marginy: 16
};

export function isLargeGraph(nodeCount) {
	return nodeCount >= LARGE_GRAPH_NODE_THRESHOLD;
}



export function resolveGraphSizeProfile(nodeCount) {
	return isLargeGraph(nodeCount) ? 'compact' : 'default';
}