import { useGraphInteraction, useGraphView } from '@graphContext';
import { findGraphNode, nodeToHitAttributes, parseFlowNodeId } from '@graphContext';

export function useThreeGraphContextMenu(rendererId = 'threejs') {
	const { document } = useGraphView();
	const { openContextMenu } = useGraphInteraction();

	return (hit) => {
		const parsed = parseFlowNodeId(hit.nodeId);
		const graphNode = findGraphNode(document, hit.nodeId);
		const attributes = graphNode && parsed ?
			nodeToHitAttributes(graphNode, parsed.graphId) :
			{ label: hit.label, flowId: hit.nodeId };

		const request = {
			rendererId,
			clientX: hit.clientX,
			clientY: hit.clientY,
			target: {
				kind: 'node',
				flowId: hit.nodeId,
				label: hit.label,
				isFolder: hit.isFolder,
				isExpanded: hit.isExpanded
			},
			attributes
		};
		openContextMenu(request);
	};
}