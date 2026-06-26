/**
 * Добавляет start/end узлам в demo graph-document.json (schemaVersion 2).
 * Запуск: node scripts/assign-demo-timeline.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assignDocumentTimeline } from './graph-timeline.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEMO = join(__dirname, '../src/data/graph-document.json')

const TIMELINE_START = Date.parse('2024-06-01T00:00:00.000Z')
const TIMELINE_END = Date.parse('2024-06-05T00:00:00.000Z')

const document = JSON.parse(readFileSync(DEMO, 'utf8'))
for (const graph of Object.values(document.graphs)) {
	for (const node of graph.nodes) {
		delete node.start
		delete node.end
	}
}
assignDocumentTimeline(document.graphs, document.rootGraphId, TIMELINE_START, TIMELINE_END)

document.schemaVersion = 2
document.timelineStart = TIMELINE_START
document.timelineEnd = TIMELINE_END

writeFileSync(DEMO, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
console.log(
	`Updated ${DEMO}\n` +
		`  timeline: ${new Date(TIMELINE_START).toISOString()} – ${new Date(TIMELINE_END).toISOString()}`,
)
