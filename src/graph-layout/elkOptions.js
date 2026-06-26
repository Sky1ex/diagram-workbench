/** Опции ELK layered — близко к HierarchicLayout в applyYFilesLayout. */
export const ELK_LAYOUT_OPTIONS = {
	'elk.algorithm': 'layered',
	'elk.direction': 'DOWN',
	'elk.spacing.nodeNode': '40',
	'elk.layered.spacing.nodeNodeBetweenLayers': '56',
	'elk.spacing.edgeNode': '28',
	'elk.spacing.edgeEdge': '20',
	'elk.edgeRouting': 'ORTHOGONAL',
	'elk.layered.mergeEdges': 'false',
	'elk.padding': '[top=24,left=24,bottom=24,right=24]'
};

export function getElkLayoutOptions() {
	return ELK_LAYOUT_OPTIONS;
}