/**
 * Генерирует src/data/graph-document-5k-timeline.json:
 * — ~5000 узлов / ~5000 рёбер, вложенные подграфы, start/end на узлах (Unix ms).
 *
 * Запуск: node scripts/generate-graph-document-5k-timeline.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assignDocumentTimeline } from './graph-timeline.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../src/data/graph-document-5k-timeline.json')

const TARGET_TOTAL_NODES = 5000
const TARGET_TOTAL_EDGES = 5000
const TIMELINE_START = Date.parse('2024-01-01T00:00:00.000Z')
const TIMELINE_END = Date.parse('2025-07-01T00:00:00.000Z')
/** Максимум узлов в одном GraphDefinition (main или подграф). */
const MAX_NODES_PER_GRAPH = 10
/** Максимум узлов на один depth внутри графа. */
const MAX_NODES_PER_DEPTH = 10
const MIN_SUBGRAPH_NODES = 6

function seeded(seed) {
	let s = seed >>> 0
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0
		return s / 0x100000000
	}
}

const rand = seeded(0x7f4a2c19)

function pickInt(min, max) {
	return min + Math.floor(rand() * (max - min + 1))
}

function pickSome(array, count) {
	const copy = [...array]
	const picked = []
	while (picked.length < count && copy.length > 0) {
		const i = Math.floor(rand() * copy.length)
		picked.push(copy.splice(i, 1)[0])
	}
	return picked
}

function buildLayeredDag(graphId, label, nodeBudget) {
	const budget = Math.min(Math.max(2, nodeBudget), MAX_NODES_PER_GRAPH)
	const nodes = []
	const edges = []
	const layers = []

	if (budget <= 3) {
		const a = { id: `${graphId}-e`, depth: 0, label: `${label} · Entry` }
		const b = { id: `${graphId}-x`, depth: 1, label: `${label} · Exit` }
		nodes.push(a, b)
		edges.push({ source: a.id, target: b.id })
		return { id: graphId, label, nodes, edges }
	}

	const layerSizes = []
	let left = budget

	layerSizes.push(1)
	left -= 1

	while (left > 1) {
		const reserveExit = Math.min(2, left)
		const maxMiddle = left - reserveExit
		if (maxMiddle <= 0) break

		const size = Math.min(
			MAX_NODES_PER_DEPTH,
			maxMiddle,
			Math.max(1, pickInt(1, Math.min(MAX_NODES_PER_DEPTH, maxMiddle))),
		)
		layerSizes.push(size)
		left -= size
	}

	if (left > 0) {
		layerSizes.push(Math.min(left, MAX_NODES_PER_DEPTH))
	}

	for (let depth = 0; depth < layerSizes.length; depth++) {
		const layer = []
		for (let i = 0; i < layerSizes[depth]; i++) {
			const role =
				depth === 0 ? 'Entry' : depth === layerSizes.length - 1 ? 'Exit' : `S${depth}`
			layer.push({
				id: `${graphId}-d${depth}-n${i}`,
				depth,
				label: `${label} · ${role} · ${i + 1}`,
			})
		}
		layers.push(layer)
		nodes.push(...layer)
	}

	for (let depth = 0; depth < layers.length - 1; depth++) {
		const fromLayer = layers[depth]
		const toLayer = layers[depth + 1]
		const incomingCount = new Map(toLayer.map((n) => [n.id, 0]))

		for (const source of fromLayer) {
			const fanout = pickInt(1, Math.min(3, toLayer.length))
			const targets = pickSome(toLayer, fanout)
			for (const target of targets) {
				edges.push({ source: source.id, target: target.id })
				incomingCount.set(target.id, (incomingCount.get(target.id) ?? 0) + 1)
			}
		}

		for (const target of toLayer) {
			if ((incomingCount.get(target.id) ?? 0) > 0) continue
			const source = fromLayer[Math.floor(rand() * fromLayer.length)]
			edges.push({ source: source.id, target: target.id })
			incomingCount.set(target.id, 1)
		}
	}

	return { id: graphId, label, nodes, edges }
}

function countNodes(graphs) {
	return Object.values(graphs).reduce((sum, g) => sum + g.nodes.length, 0)
}

function countEdges(graphs) {
	return Object.values(graphs).reduce((sum, g) => sum + g.edges.length, 0)
}

function maxDepthLayerSize(graph) {
	const byDepth = new Map()
	for (const n of graph.nodes) {
		byDepth.set(n.depth, (byDepth.get(n.depth) ?? 0) + 1)
	}
	return Math.max(0, ...byDepth.values())
}

function edgeKey(source, target) {
	return `${source}|${target}`
}

function listCandidateEdges(graph) {
	const byDepth = new Map()
	for (const n of graph.nodes) {
		if (!byDepth.has(n.depth)) byDepth.set(n.depth, [])
		byDepth.get(n.depth).push(n)
	}
	const depths = [...byDepth.keys()].sort((a, b) => a - b)
	const existing = new Set(graph.edges.map((e) => edgeKey(e.source, e.target)))
	const candidates = []

	for (let i = 0; i < depths.length - 1; i++) {
		const fromLayer = byDepth.get(depths[i])
		const toLayer = byDepth.get(depths[i + 1])
		for (const source of fromLayer) {
			for (const target of toLayer) {
				const key = edgeKey(source.id, target.id)
				if (!existing.has(key)) {
					candidates.push({ source: source.id, target: target.id, key })
				}
			}
		}
	}

	return candidates
}

function addEdgesUntilTarget(graphs, target) {
	const graphList = Object.values(graphs)

	while (countEdges(graphs) < target) {
		let progress = false
		for (const graph of graphList) {
			if (countEdges(graphs) >= target) break
			const candidates = listCandidateEdges(graph)
			if (candidates.length === 0) continue
			const pick = candidates[Math.floor(rand() * candidates.length)]
			graph.edges.push({ source: pick.source, target: pick.target })
			progress = true
			if (countEdges(graphs) >= target) break
		}
		if (!progress) break
	}
}

function trimEdgesUntilTarget(graphs, target) {
	while (countEdges(graphs) > target) {
		const graphList = Object.values(graphs).filter((g) => g.edges.length > 0)
		if (graphList.length === 0) break

		const graph = graphList[Math.floor(rand() * graphList.length)]
		const idx = Math.floor(rand() * graph.edges.length)
		graph.edges.splice(idx, 1)
	}
}

function listSubgraphHostCandidates(graphs) {
	const candidates = []
	for (const graph of Object.values(graphs)) {
		if (graph.nodes.length === 0) continue
		const maxDepth = Math.max(...graph.nodes.map((n) => n.depth))
		for (const node of graph.nodes) {
			if (node.subgraphId) continue
			if (node.depth === 0) continue
			if (node.depth >= maxDepth) continue
			candidates.push(node)
		}
	}
	return candidates
}

function attachSubgraphToHost(host, graphs, nodeBudget) {
	const childId = `sg-${host.id}`
	if (graphs[childId]) return false

	const child = buildLayeredDag(childId, `Sub ${host.label}`, nodeBudget)
	if (child.nodes.length > MAX_NODES_PER_GRAPH) {
		throw new Error(`child "${childId}" has ${child.nodes.length} nodes`)
	}

	graphs[childId] = child
	host.subgraphId = childId
	return true
}

function growNestedGraphs(graphs, nodeTarget) {
	let stuckPasses = 0

	while (countNodes(graphs) < nodeTarget && stuckPasses < 200) {
		const remaining = nodeTarget - countNodes(graphs)
		if (remaining < MIN_SUBGRAPH_NODES) break

		const candidates = listSubgraphHostCandidates(graphs)
		if (candidates.length === 0) {
			stuckPasses += 1
			continue
		}

		const host = candidates[Math.floor(rand() * candidates.length)]
		const childBudget = Math.min(
			MAX_NODES_PER_GRAPH,
			Math.max(MIN_SUBGRAPH_NODES, pickInt(MIN_SUBGRAPH_NODES, MAX_NODES_PER_GRAPH)),
			remaining,
		)

		if (attachSubgraphToHost(host, graphs, childBudget)) {
			stuckPasses = 0
		} else {
			stuckPasses += 1
		}
	}
}

function validateGraphs(graphs) {
	for (const [graphId, graph] of Object.entries(graphs)) {
		if (graph.nodes.length > MAX_NODES_PER_GRAPH) {
			throw new Error(
				`graph "${graphId}": ${graph.nodes.length} узлов (лимит ${MAX_NODES_PER_GRAPH} на граф)`,
			)
		}
		const depthMax = maxDepthLayerSize(graph)
		if (depthMax > MAX_NODES_PER_DEPTH) {
			throw new Error(
				`graph "${graphId}": depth-слой содержит ${depthMax} узлов (лимит ${MAX_NODES_PER_DEPTH})`,
			)
		}
	}
}

function buildDocument() {
	const graphs = {}
	graphs.main = buildLayeredDag('main', 'Root pipeline 5k', MAX_NODES_PER_GRAPH)

	growNestedGraphs(graphs, TARGET_TOTAL_NODES)

	addEdgesUntilTarget(graphs, TARGET_TOTAL_EDGES)
	trimEdgesUntilTarget(graphs, TARGET_TOTAL_EDGES)

	assignDocumentTimeline(graphs, 'main', TIMELINE_START, TIMELINE_END)

	return graphs
}

const graphs = buildDocument()
validateGraphs(graphs)

const subgraphCount = Object.keys(graphs).length - 1
const nestedHosts = Object.values(graphs).reduce(
	(acc, g) => acc + g.nodes.filter((n) => n.subgraphId).length,
	0,
)
const totalNodes = countNodes(graphs)
const totalEdges = countEdges(graphs)

const document = {
	schemaVersion: 2,
	rootGraphId: 'main',
	timelineStart: TIMELINE_START,
	timelineEnd: TIMELINE_END,
	graphs,
}

writeFileSync(OUT, JSON.stringify(document), 'utf8')

console.log(
	`Wrote ${OUT}\n` +
		`  schemaVersion: 2 (${new Date(TIMELINE_START).toISOString()} – ${new Date(TIMELINE_END).toISOString()})\n` +
		`  hosts with subgraphId: ${nestedHosts}\n` +
		`  total node records: ${totalNodes}\n` +
		`  total edges: ${totalEdges}\n` +
		`  main: ${graphs.main.nodes.length} nodes, ${graphs.main.edges.length} edges\n` +
		`  max nodes in any graph: ${Math.max(...Object.values(graphs).map((g) => g.nodes.length))}\n` +
		`  max nodes per depth (any graph): ${Math.max(
			...Object.values(graphs).map((g) => maxDepthLayerSize(g)),
		)}`,
)

if (graphs.main.nodes.length > MAX_NODES_PER_GRAPH) {
	throw new Error(`main has ${graphs.main.nodes.length} nodes (limit ${MAX_NODES_PER_GRAPH})`)
}
if (totalNodes < TARGET_TOTAL_NODES * 0.98) {
	throw new Error(`Too few nodes: ${totalNodes} (target ${TARGET_TOTAL_NODES})`)
}
if (totalEdges < TARGET_TOTAL_EDGES * 0.98) {
	throw new Error(`Too few edges: ${totalEdges} (target ${TARGET_TOTAL_EDGES})`)
}
