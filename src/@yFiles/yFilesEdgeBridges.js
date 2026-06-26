import {
	BridgeCrossingPolicy,
	BridgeCrossingStyle,
	BridgeManager,
	BridgeOrientationStyle,
	GraphObstacleProvider
} from 'yfiles';

const bridgeManagers = new WeakMap();

/**
 * Мостики на пересечениях рёбер (PolylineEdgeStyle подхватывает BridgeManager автоматически).
 */
export function installEdgeBridges(graphComponent) {
	let bridgeManager = bridgeManagers.get(graphComponent);
	if (bridgeManager) {
		bridgeManager.canvasComponent = graphComponent;
		graphComponent.invalidate();
		return;
	}

	bridgeManager = new BridgeManager({
		canvasComponent: graphComponent,
		bridgeCrossingPolicy: BridgeCrossingPolicy.HORIZONTAL_BRIDGES_VERTICAL,
		defaultBridgeCrossingStyle: BridgeCrossingStyle.ARC,
		defaultBridgeOrientationStyle: BridgeOrientationStyle.POSITIVE,
		considerCurves: true
	});
	bridgeManager.addObstacleProvider(new GraphObstacleProvider());
	bridgeManagers.set(graphComponent, bridgeManager);
	graphComponent.invalidate();
}

export function disposeEdgeBridges(graphComponent) {
	const bridgeManager = bridgeManagers.get(graphComponent);
	if (!bridgeManager) return;
	bridgeManager.dispose();
	bridgeManagers.delete(graphComponent);
}