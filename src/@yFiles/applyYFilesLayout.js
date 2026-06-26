import {
	HierarchicLayout,
	HierarchicLayoutData,
	LayoutExecutor,
	LayoutOrientation,
	RecursiveGroupLayout
} from 'yfiles';

function createHierarchicCoreLayout(edgeRouting) {
	const orthogonal = edgeRouting === 'orthogonal';
	return new HierarchicLayout({
		layoutOrientation: LayoutOrientation.TOP_TO_BOTTOM,
		minimumLayerDistance: 56,
		nodeToNodeDistance: 40,
		nodeToEdgeDistance: 28,
		edgeToEdgeDistance: 20,
		orthogonalRouting: orthogonal,
		// Несколько внешних рёбер часто сходятся в один entry/exit — группировка склеивает их в одну линию.
		automaticEdgeGrouping: false
	});
}

export async function runHierarchicLayout(
	graphComponent,
	options = {}) {
	const fromSketch = options.fromSketch ?? false;
	const edgeRouting = options.edgeRouting ?? 'orthogonal';
	const coreLayout = createHierarchicCoreLayout(edgeRouting);

	const layout = new RecursiveGroupLayout({
		coreLayout,
		fromSketchMode: fromSketch
	});

	const layoutData = new HierarchicLayoutData();

	const executor = new LayoutExecutor({
		graphComponent,
		layout,
		layoutData,
		duration: fromSketch ? '150ms' : '300ms'
	});

	await executor.start();
}