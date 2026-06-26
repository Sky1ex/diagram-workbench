/**
 * Назначает start/end узлам на шкале [timelineStart, timelineEnd] (Unix ms UTC).
 */

export function getSubgraphEntryNodeId(subgraph) {
	if (!subgraph?.nodes?.length) return null
	const minDepth = Math.min(...subgraph.nodes.map((node) => node.depth))
	const entry = subgraph.nodes.find((node) => node.depth === minDepth)
	return entry?.id ?? null
}

export function getSubgraphExitNodeId(subgraph) {
	if (!subgraph?.nodes?.length) return null
	const maxDepth = Math.max(...subgraph.nodes.map((node) => node.depth))
	const candidates = subgraph.nodes.filter((node) => node.depth === maxDepth)
	const sinks = candidates.filter(
		(node) => !subgraph.edges.some((edge) => edge.source === node.id),
	)
	const exit = (sinks.length > 0 ? sinks : candidates)[0]
	return exit?.id ?? null
}

function layerBounds(spanStart, spanEnd, depth, layerCount) {
	const span = spanEnd - spanStart
	return {
		start: spanStart + (depth / layerCount) * span,
		end: spanStart + ((depth + 1) / layerCount) * span,
	}
}

function assignGraphTimeline(graph, graphs, spanStart, spanEnd) {
	const maxDepth = Math.max(...graph.nodes.map((node) => node.depth), 0)
	const layerCount = maxDepth + 1

	for (const node of graph.nodes) {
		if (!node.subgraphId) continue
		const child = graphs[node.subgraphId]
		if (!child) continue

		const hostLayer = layerBounds(spanStart, spanEnd, node.depth, layerCount)
		assignGraphTimeline(child, graphs, hostLayer.start, hostLayer.end)

		const entryId = getSubgraphEntryNodeId(child)
		const exitId = getSubgraphExitNodeId(child)
		const entry = entryId ? child.nodes.find((n) => n.id === entryId) : null
		const exit = exitId ? child.nodes.find((n) => n.id === exitId) : null

		if (entry && exit) {
			node.start = entry.start
			node.end = exit.end
		} else {
			node.start = hostLayer.start
			node.end = hostLayer.end
		}
	}

	for (const node of graph.nodes) {
		if (node.subgraphId) continue
		const bounds = layerBounds(spanStart, spanEnd, node.depth, layerCount)
		node.start = bounds.start
		node.end = bounds.end
	}
}

export function assignDocumentTimeline(graphs, rootGraphId, timelineStart, timelineEnd) {
	const root = graphs[rootGraphId]
	if (!root) throw new Error(`Root graph "${rootGraphId}" is missing`)
	assignGraphTimeline(root, graphs, timelineStart, timelineEnd)
	return { timelineStart, timelineEnd }
}
