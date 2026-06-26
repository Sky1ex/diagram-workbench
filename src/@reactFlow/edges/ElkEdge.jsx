import { memo } from 'react';
import { BaseEdge } from '@xyflow/react';

import {
	GRAPH_VISUAL_THEME,
	buildOrthogonalStepPath,
	pointsToSvgPath
} from '@graphLayout';

export const ElkEdge = memo(function ElkEdge({
	id,
	data,
	style,
	markerEnd,
	markerStart,
	interactionWidth,
	sourceX,
	sourceY,
	targetX,
	targetY
}) {
	const points = data?.points;

	const path =
		points && points.length >= 2 ?
			pointsToSvgPath(points) :
			buildOrthogonalStepPath(sourceX, sourceY, targetX, targetY);

	return (
		<BaseEdge
			id={id}
			path={path}
			style={{ stroke: GRAPH_VISUAL_THEME.edgeStroke, strokeWidth: 1.5, ...style }}
			markerEnd={markerEnd}
			markerStart={markerStart}
			interactionWidth={interactionWidth} 
		/>
	);
});

export const reactFlowEdgeTypes = {
	elkEdge: ElkEdge
};