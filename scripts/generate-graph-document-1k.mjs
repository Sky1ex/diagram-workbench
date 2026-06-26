/**
 * Генерирует src/data/graph-document-1k.json:
 * — ~1000 узлов суммарно по всем графам;
 * — вложенные подграфы (подграф внутри подграфа);
 * — не более MAX_NODES_PER_LAYER узлов на один слой depth в каждом графе;
 * — start/end на узлах (Unix ms), timelineStart/timelineEnd в документе.
 *
 * Запуск: node scripts/generate-graph-document-1k.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assignDocumentTimeline } from './graph-timeline.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../src/data/graph-document-1k.json')

const TARGET_TOTAL_NODES = 1000
const TIMELINE_START = Date.parse('2024-01-01T00:00:00.000Z')
const TIMELINE_END = Date.parse('2025-07-01T00:00:00.000Z')
const MAX_NODES_PER_LAYER = 20
/** Узлов в одном графе (не считая вложенные). */
const MAX_NODES_PER_GRAPH = 120
/** Минимум узлов во вложенном подграфе. */
const MIN_SUBGRAPH_NODES = 14

/** Детерминированный псевдо-random [0, 1). */
function seeded(seed) {
	let s = seed >>> 0
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0
		return s / 0x100000000
	}
}

const rand = seeded(0x1a2b3c4d)

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

/**
 * Слоистый DAG внутри одного graph definition.
 * Слой 0 — вход; последний — выход; между ними ≤ MAX_NODES_PER_LAYER.
 */
function buildLayeredDag(graphId, label, nodeBudget) {
	const nodes = []
	const edges = []
	const layers = []

	if (nodeBudget < 6) {
		const a = { id: `${graphId}-e`, depth: 0, label: `${label} · Entry` }
		const b = { id: `${graphId}-x`, depth: 1, label: `${label} · Exit` }
		nodes.push(a, b)
		edges.push({ source: a.id, target: b.id })
		return { id: graphId, label, nodes, edges }
	}

	const layerSizes = []
	let left = nodeBudget

	layerSizes.push(1)
	left -= 1

	while (left > 3) {
		const reserveExit = Math.min(3, left)
		const maxMiddle = left - reserveExit
		if (maxMiddle <= 0) break

		const size = Math.min(
			MAX_NODES_PER_LAYER,
			maxMiddle,
			Math.max(4, pickInt(6, Math.min(MAX_NODES_PER_LAYER, maxMiddle))),
		)
		layerSizes.push(size)
		left -= size
	}

	const exitSize = Math.max(1, Math.min(MAX_NODES_PER_LAYER, left))
	layerSizes.push(exitSize)

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

function maxLayerSize(graph) {
	const byDepth = new Map()
	for (const n of graph.nodes) {
		byDepth.set(n.depth, (byDepth.get(n.depth) ?? 0) + 1)
	}
	return Math.max(0, ...byDepth.values())
}

/**
 * Рекурсивно добавляет подграфы к узлам средних слоёв, пока не исчерпан бюджет ~1000.
 */
function attachNestedSubgraphs(graph, graphs, globalBudget, options = {}) {
	const { maxNewHosts = 5, attachProbability = 0.55 } = options
	const depths = [...new Set(graph.nodes.map((n) => n.depth))].sort((a, b) => a - b)
	if (depths.length < 3) return 0

	const minDepth = depths[1]
	const maxDepth = depths[depths.length - 2]

	const hostCandidates = graph.nodes.filter(
		(n) =>
			!n.subgraphId &&
			n.depth >= minDepth &&
			n.depth <= maxDepth &&
			n.depth < depths[depths.length - 1],
	)

	let added = 0
	for (const host of hostCandidates) {
		if (added >= maxNewHosts) break

		const remaining = globalBudget - countNodes(graphs)
		if (remaining < MIN_SUBGRAPH_NODES) break

		if (rand() > attachProbability) continue

		const childBudget = Math.min(
			MAX_NODES_PER_GRAPH,
			Math.max(MIN_SUBGRAPH_NODES, Math.floor(remaining * pickInt(18, 35) * 0.01)),
		)

		const childId = `sg-${host.id}`
		if (graphs[childId]) continue

		const child = buildLayeredDag(childId, `Sub ${host.label}`, childBudget)
		if (child.nodes.length < MIN_SUBGRAPH_NODES) continue

		graphs[childId] = child
		host.subgraphId = childId
		added += 1

		attachNestedSubgraphs(child, graphs, globalBudget, {
			maxNewHosts: 3,
			attachProbability: 0.5,
		})
	}

	return added
}

/** Первый уровень подграфов на main — равномерно по слоям. */
function seedMainSubgraphHosts(main, graphs, globalBudget) {
	const byDepth = new Map()
	for (const n of main.nodes) {
		if (n.subgraphId || n.depth < 2) continue
		const maxD = Math.max(...main.nodes.map((x) => x.depth))
		if (n.depth >= maxD - 1) continue
		if (!byDepth.has(n.depth)) byDepth.set(n.depth, [])
		byDepth.get(n.depth).push(n)
	}

	const layers = [...byDepth.entries()].sort((a, b) => a[0] - b[0])
	const hostsPerLayer = 2

	for (const [, layer] of layers) {
		const picks = pickSome(layer, Math.min(hostsPerLayer, layer.length))
		for (const host of picks) {
			if (countNodes(graphs) >= globalBudget - MIN_SUBGRAPH_NODES) return
			if (host.subgraphId) continue

			const remaining = globalBudget - countNodes(graphs)
			const childBudget = Math.min(55, Math.max(MIN_SUBGRAPH_NODES, Math.floor(remaining * 0.08)))
			const childId = `sg-${host.id}`
			if (graphs[childId]) continue

			const child = buildLayeredDag(childId, `Sub ${host.label}`, childBudget)
			graphs[childId] = child
			host.subgraphId = childId
		}
	}
}

function buildDocument() {
	const graphs = {}

	const mainBudget = Math.min(220, Math.floor(TARGET_TOTAL_NODES * 0.24))
	const main = buildLayeredDag('main', 'Root pipeline', mainBudget)
	graphs.main = main

	seedMainSubgraphHosts(main, graphs, TARGET_TOTAL_NODES)

	let passes = 0
	while (countNodes(graphs) < TARGET_TOTAL_NODES * 0.9 && passes < 50) {
		passes += 1
		const graphList = Object.values(graphs).sort((a, b) => a.nodes.length - b.nodes.length)
		for (const graph of graphList) {
			const isSub = graph.id.startsWith('sg-')
			attachNestedSubgraphs(graph, graphs, TARGET_TOTAL_NODES, {
				maxNewHosts: graph.id === 'main' ? 5 : isSub ? 2 : 3,
				attachProbability: isSub ? 0.62 : 0.5,
			})
			if (countNodes(graphs) >= TARGET_TOTAL_NODES) break
		}
	}

	// Внутри уже созданных подграфов — ещё один уровень вложенности (цепочки и ветки).
	for (let d = 0; d < 12 && countNodes(graphs) < TARGET_TOTAL_NODES * 0.95; d++) {
		for (const graph of Object.values(graphs)) {
			if (!graph.id.startsWith('sg-')) continue
			attachNestedSubgraphs(graph, graphs, TARGET_TOTAL_NODES, {
				maxNewHosts: 2,
				attachProbability: 0.72,
			})
		}
	}

	// Добираем узлами в main, если не хватает (без нарушения лимита слоя)
	while (countNodes(graphs) < TARGET_TOTAL_NODES) {
		const mainGraph = graphs.main
		const byDepth = new Map()
		for (const n of mainGraph.nodes) {
			if (!byDepth.has(n.depth)) byDepth.set(n.depth, [])
			byDepth.get(n.depth).push(n)
		}

		let added = false
		for (const [depth, layer] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
			if (layer.length >= MAX_NODES_PER_LAYER) continue
			if (depth === 0) continue

			const newId = `main-d${depth}-extra-${layer.length}`
			mainGraph.nodes.push({
				id: newId,
				depth,
				label: `Root pipeline · extra · ${layer.length + 1}`,
			})

			const prevDepth = depth - 1
			const prevLayer = byDepth.get(prevDepth) ?? mainGraph.nodes.filter((n) => n.depth === prevDepth)
			const sources = prevLayer.length > 0 ? prevLayer : [mainGraph.nodes.find((n) => n.depth === 0)]
			const source = sources[Math.floor(rand() * sources.length)]
			mainGraph.edges.push({ source: source.id, target: newId })

			const nextLayer = mainGraph.nodes.filter((n) => n.depth === depth + 1)
			if (nextLayer.length > 0) {
				const target = nextLayer[Math.floor(rand() * nextLayer.length)]
				mainGraph.edges.push({ source: newId, target: target.id })
			}

			added = true
			break
		}

		if (!added) break
	}

	assignDocumentTimeline(graphs, 'main', TIMELINE_START, TIMELINE_END)

	return graphs
}

const graphs = buildDocument()

for (const [graphId, graph] of Object.entries(graphs)) {
	const maxLayer = maxLayerSize(graph)
	if (maxLayer > MAX_NODES_PER_LAYER) {
		throw new Error(`graph "${graphId}": слой содержит ${maxLayer} узлов (лимит ${MAX_NODES_PER_LAYER})`)
	}
}

const subgraphCount = Object.keys(graphs).length - 1
const nestedHosts = Object.values(graphs).reduce(
	(acc, g) => acc + g.nodes.filter((n) => n.subgraphId).length,
	0,
)
const totalNodes = countNodes(graphs)
const maxDepthMain = Math.max(...graphs.main.nodes.map((n) => n.depth))

const document = {
	schemaVersion: 2,
	rootGraphId: 'main',
	timelineStart: TIMELINE_START,
	timelineEnd: TIMELINE_END,
	graphs,
}

writeFileSync(OUT, JSON.stringify(document, null, 2), 'utf8')

console.log(
	`Wrote ${OUT}\n` +
		`  schemaVersion: 2 (${new Date(TIMELINE_START).toISOString()} – ${new Date(TIMELINE_END).toISOString()})\n` +
		`  graphs: ${Object.keys(graphs).length} (main + ${subgraphCount} subgraphs)\n` +
		`  hosts with subgraphId: ${nestedHosts}\n` +
		`  total node records: ${totalNodes}\n` +
		`  main: ${graphs.main.nodes.length} nodes, ${graphs.main.edges.length} edges, max depth ${maxDepthMain}\n` +
		`  max nodes per layer (any graph): ${Math.max(
			...Object.values(graphs).map((g) => maxLayerSize(g)),
		)}`,
)
