import { Canvas } from '@react-three/fiber';

import { DagOrbitControls } from './DagOrbitControls';
import { CameraZoomBridge } from './CameraZoomBridge';
import { GraphEdges3D } from './GraphEdges3D';
import { GraphNodes3D } from './GraphNodes3D';
import { InitialCameraFit } from './InitialCameraFit';

export function GraphScene3D({
	scene,
	shape,
	expandedHostFlowIds,
	selectedNodeId,
	fitKey,
	onNodeSelect,
	onNodeContextMenu,
	mobile = false,
	touchMode = 'pan',
	cameraZoomApiRef
}) {
	return (
		<Canvas
			camera={{ fov: 45, near: 0.1, far: 2000, position: [8, 6, 10] }}
			style={{ width: '100%', height: '100%', background: '#f1f5f9' }}
			dpr={[1, 2]}
			onPointerMissed={() => onNodeSelect('')}
		>
			<color attach="background" args={['#f1f5f9']} />
			<ambientLight intensity={0.55} />
			<directionalLight position={[12, 18, 8]} intensity={1.1} />
			<directionalLight position={[-10, -6, -8]} intensity={0.35} />

			<GraphEdges3D
				edges={scene.edges}
				nodes={scene.nodes}
				positionsByNodeId={scene.positionsByNodeId}
				selectedNodeId={selectedNodeId}
			/>

			<GraphNodes3D
				nodes={scene.nodes}
				shape={shape}
				expandedHostFlowIds={expandedHostFlowIds}
				selectedNodeId={selectedNodeId}
				onNodeSelect={onNodeSelect}
				onNodeContextMenu={onNodeContextMenu}
			/>

			<DagOrbitControls enabled mobile={mobile} touchMode={touchMode} />
			<CameraZoomBridge apiRef={cameraZoomApiRef} />
			<InitialCameraFit nodes={scene.nodes} fitKey={fitKey} />
		</Canvas>
	);
}