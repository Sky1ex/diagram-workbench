# Diagram Workbench

Сравнительный workbench для визуализации **одного и того же графа** в четырёх библиотеках:

| Вкладка | Библиотека | Что показывает |
|---------|------------|----------------|
| yFiles | [yFiles](https://www.yworks.com/products/yfiles) | Иерархический граф с folding (папки / подграфы) |
| AnyChart | [AnyChart](https://www.anychart.com/) | Gantt-диаграмма по timeline-данным |
| Three.js | [Three.js](https://threejs.org/) + React Three Fiber | 3D DAG с dagre-layout |
| React Flow | [@xyflow/react](https://reactflow.dev/) | 2D граф с ELK/dagre layout и LOD |
| Слияние | — | 2–4 панели рядом для сравнения любых комбинаций |

Общее состояние (раскрытие папок, фильтры, контекстное меню) синхронизировано между всеми рендерерами через React-контексты.

---

## Требования

- **Node.js** 18+ (рекомендуется 20+)
- **npm** 9+
- Локальный архив **yFiles 24.0.7**
- Файл лицензии yFiles (`license.json`)

---

## Первый запуск

### 1. Клонировать репозиторий

```bash
git clone <url-репозитория>
cd test-node-3
```

### 2. Положить yFiles (обязательно)

Создайте папку `local-packages/` и поместите туда tarball:

```
local-packages/
  yfiles-24.0.7-dev.tgz
```

В `package.json` зависимость подключена как:

```json
"yfiles": "file:local-packages/yfiles-24.0.7-dev.tgz"
```

Папка `local-packages/` в `.gitignore` — каждый разработчик кладёт архив локально.

### 3. Положить лицензию yFiles (обязательно)

Скопируйте ваш `license.json` в:

```
src/@yFiles/license.json
```

Файл тоже в `.gitignore`. Без него yFiles не запустится.

### 4. Установить зависимости и запустить

```bash
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173`.

---

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер с HMR |
| `npm run build` | Production-сборка в `dist/` |
| `npm run generate:graph-1k` | Сгенерировать `graph-document-1k.json` (~1000 узлов) |
| `npm run generate:graph-5k` | Сгенерировать `graph-document-5k.json` (без timeline) |
| `npm run generate:graph-5k-timeline` | Сгенерировать `graph-document-5k-timeline.json` |
| `npm run assign:demo-timeline` | Добавить timeline-поля в demo-документ |

В UI доступны три датасета: **Demo** (~26 узлов), **Large 1k**, **Large 5k (timeline)**.

---

## Структура проекта

```
src/
├── main.jsx                 # Точка входа
├── DiagramWorkbench.jsx     # Оболочка: вкладки, выбор датасета
├── libraryTabs.js           # ID и подписи вкладок
│
├── graph-model/             # Загрузка и нормализация JSON-документа графа
├── graph-layout/            # Общий layout: ELK, dagre, inline-сцены, LOD
├── graph-context/           # React-контексты: документ, навигация, фильтры
├── adapters/                # Адаптеры данных под конкретные библиотеки
├── components/              # Общие UI: меню, compare-панель, фильтр
├── data/                    # JSON-документы графов
│
├── @yFiles/                 # Интеграция yFiles (GraphComponent, folding, layout)
├── @reactFlow/              # React Flow + ELK layout
├── @threeJs/                # Three.js / R3F сцена
└── @anyChart/               # AnyChart Gantt
```

### Алиасы путей

Настроены в `vite.config.js` и `jsconfig.json`:

| Алиас | Путь |
|-------|------|
| `@graphModel` | `src/graph-model` |
| `@graphLayout` | `src/graph-layout` |
| `@graphContext` | `src/graph-context` |
| `@graphData` | `src/data` |
| `@yFiles` | `src/@yFiles` |
| `@reactFlow` | `src/@reactFlow` |
| `@threeJs` | `src/@threeJs` |
| `@anyChart` | `src/@anyChart` |

> `@yFiles` — это **ваш код-адаптер**, а не npm-пакет. Сам пакет yFiles импортируется как `'yfiles'`.

---

## Как устроена архитектура

```
graph-document.json          ← единый источник данных
        │
        ▼
  graph-model                ← normalize, loadGraphDocument
        │
        ▼
  GraphDocumentProvider      ← document, expandedHostFlowIds, навигация
        │
        ▼
  GraphInteractionProvider   ← фильтры, видимость веток, context menu
        │
        ├─► @yFiles         ← master graph + FoldingManager + HierarchicLayout
        ├─► @reactFlow      ← buildInlineFlowScene + ELK/dagre
        ├─► @threeJs        ← buildGraph3DScene + dagre 3D
        └─► @anyChart       ← documentToGanttTree
```

**Ключевые концепции:**

- **flowId** — глобальный ID узла в формате `graphId:localId` (например `root:node-1`)
- **expandedHostFlowIds** — какие папки (подграфы) раскрыты; общий Set для всех рендереров
- **Фильтр** — по depth, label, timeline; скрытие веток через контекстное меню
- **GraphContextMenuLayer** — единое контекстное меню для всех вкладок

---

## Вкладка «Слияние»

Режим compare показывает 2–4 панели одновременно. На общем toolbar:

- выбор количества панелей (2 / 3 / 4)
- **Развернуть все / Свернуть все** — действует на все экраны
- сброс фильтра

Каждая панель может показывать любую из четырёх библиотек независимо.

---

## yFiles: особенности интеграции

yFiles встроен **императивно** (стандартный подход без React-обёртки):

1. `GraphComponent` создаётся в `useEffect`, уничтожается через `cleanUp()`
2. Документ конвертируется в `DefaultGraph` с вложенными группами (`graphDocumentToMasterGraph.js`)
3. `FoldingManager` + `CollapsibleNodeStyleDecorator` — папки с кнопками «+»/«−»
4. Фильтрация через `VoidNodeStyle` / `VoidEdgeStyle` — граф не пересобирается
5. Layout: `RecursiveGroupLayout` + `HierarchicLayout`

Лицензия регистрируется один раз при загрузке модуля (`registerLicense.js`).

---

## Формат graph-document

```json
{
  "schemaVersion": 1,
  "rootGraphId": "root",
  "timelineStart": 1700000000000,
  "timelineEnd": 1700100000000,
  "graphs": {
    "root": {
      "id": "root",
      "label": "Корневой граф",
      "nodes": [
        { "id": "a", "label": "Узел A", "depth": 0 },
        { "id": "b", "label": "Папка B", "depth": 0, "subgraphId": "sub-1" }
      ],
      "edges": [
        { "source": "a", "target": "b" }
      ]
    },
    "sub-1": {
      "id": "sub-1",
      "label": "Подграф",
      "nodes": [...],
      "edges": [...]
    }
  }
}
```

Узел с `subgraphId` — папка (folder). Узлы с `start` / `end` участвуют в timeline-фильтре и Gantt.