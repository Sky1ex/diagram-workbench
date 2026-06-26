# Архитектура Diagram Workbench

Подробное описание того, **как устроен проект**, **как данные проходят через слои** и **как четыре рендерера взаимодействуют с общим состоянием**.

Для установки и первого запуска см. [README.md](./README.md).

---

## 1. Назначение

Приложение — **сравнительный workbench**: один JSON-документ графа отображается в четырёх библиотеках визуализации. Пользователь может:

- переключать датасет (demo / 1k / 5k);
- раскрывать и сворачивать папки (подграфы);
- фильтровать узлы по label, depth, timeline, типу;
- скрывать исходящие ветки от узла;
- открывать единое контекстное меню на любом рендерере;
- сравнивать библиотеки side-by-side во вкладке «Слияние».

Ключевая идея: **одна модель данных → несколько адаптеров отображения**, связанных через **два React-контекста**.

---

## 2. Дерево компонентов при запуске

```
main.jsx
└── App.jsx
    └── DiagramWorkbench.jsx
        ├── ThemeProvider (Admiral DS)
        └── GraphDocumentProvider          ← данные + навигация + expand
            └── GraphInteractionProvider   ← фильтр + меню + видимость
                ├── TabBar (датасет + вкладки)
                ├── GraphBreadcrumbBar     ← (кроме вкладки compare)
                ├── Viewport
                │   ├── YFilesGraphPanel
                │   ├── AnyChartGanttPanel
                │   ├── ThreeScenePanel    (lazy)
                │   ├── DagLodPanel        (lazy)
                │   └── CompareSplitPanel
                └── GraphContextMenuLayer  ← portal, поверх всего
```

При смене датасета `GraphDocumentProvider` получает `key={datasetId}` — **всё дерево пересоздаётся**, сбрасывая локальный state рендереров.

---

## 3. Слои кодовой базы

```
┌─────────────────────────────────────────────────────────────┐
│  UI: DiagramWorkbench, components/, @yFiles, @reactFlow,    │
│       @threeJs, @anyChart                                   │
├─────────────────────────────────────────────────────────────┤
│  graph-context: React-контексты, фильтр, видимость, меню    │
├─────────────────────────────────────────────────────────────┤
│  graph-layout: inline-сцена, ELK/dagre, LOD, flowId         │
├─────────────────────────────────────────────────────────────┤
│  graph-model: загрузка и нормализация JSON                  │
├─────────────────────────────────────────────────────────────┤
│  src/data/*.json                                            │
└─────────────────────────────────────────────────────────────┘
```

## 4. Модель данных

### 4.1. GraphDocument

Документ загружается через `loadGraphDocument(datasetId)` из `graph-model/loadGraphDocument.js`.

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
        { "id": "b", "label": "Папка B", "depth": 0, "subgraphId": "sub-1", "start": 1700000000000, "end": 1700010000000 }
      ],
      "edges": [
        { "source": "a", "target": "b" }
      ]
    },
    "sub-1": { "...": "..." }
  }
}
```

**Узел с `subgraphId`** — folder/host: при раскрытии показывает содержимое вложенного графа.  
**Поля `start` / `end`** — миллисекунды UTC; используются в timeline-фильтре и AnyChart Gantt.

### 4.2. flowId — глобальный идентификатор узла

Все рендереры и контексты оперируют **flowId**, а не локальным `id` внутри графа:

```
flowId = graphId + ":" + localId
Пример: "root:node-42"
```

Рёбра:

```
flowEdgeId = graphId + ":" + source + "->" + target + ":" + index
Пример: "root:a->b:0"
```

Функции: `toFlowNodeId`, `toFlowEdgeId` в `graph-layout/flowNodeId.js`.


## 5. GraphDocumentProvider — «что показываем»

Файл: `graph-context/GraphDocumentContext.jsx`  
Хук: `useGraphView()`

### 5.1. Состояние

| Поле | Тип | Смысл |
|------|-----|-------|
| `document` | GraphDocument | Текущий загруженный документ |
| `datasetId` | string | Ключ датасета |
| `expandedHostFlowIds` | `Set<flowId>` | Какие папки раскрыты (inline) |
| `navigationStack` | массив | Цепочка «вошли в подграф» для breadcrumb |
| `activeGraph` | GraphDefinition | Граф по вершине стека (сейчас почти не читается рендерерами) |

### 5.2. Действия

| Метод | Что делает |
|-------|------------|
| `toggleFolderExpand(flowId)` | Добавить/убрать папку из `expandedHostFlowIds` |
| `expandAllFolders()` | Раскрыть все папки + сбросить breadcrumb + уведомить yFiles-контроллеры |
| `collapseAllFolders()` | Свернуть все + сбросить breadcrumb + yFiles |
| `openSubgraph(hostNodeId)` | Push в `navigationStack` (yFiles: вход в группу) |
| `navigateToStackIndex` / `resetNavigation` | Breadcrumb-клики |
| `registerYFilesController(id, api)` | Регистрация инстанса yFiles для compare-режима |

### 5.3. expandedHostFlowIds — центральная концепция

Это **единый источник правды** о том, какие подграфы «развёрнуты inline»:

- React Flow и Three.js строят сцену из root + содержимое раскрытых папок;
- фильтр работает только в пределах этой inline-сцены;
- yFiles синхронизирует folding view с этим Set через `syncFoldingViewToExpandedIds`;
- AnyChart раскрывает строки Gantt по тем же flowId.

---

## 6. GraphInteractionProvider — «как взаимодействуем»

Файл: `graph-context/GraphInteractionContext.jsx`  
Хук: `useGraphInteraction()`

### 6.1. Состояние

| Поле | Смысл |
|------|-------|
| `filterCriteria` | Активный фильтр (или `null`) |
| `hiddenBranchAnchors` | Set flowId — от этих узлов скрыты исходящие ветки |
| `contextMenu` | Текущий запрос контекстного меню (или `null`) |
| `filterVisibility` | Результат фильтра до скрытия веток |
| `visibility` | Итоговая видимость: `visibleNodeIds`, `visibleEdgeIds` |
| `sceneVisibilityActive` | `true`, если фильтр или скрытие веток активны |

### 6.2. Pipeline видимости

```
buildInlineFlowScene(document, expandedHostFlowIds)
        │
        ▼
computeFilterVisibility(document, filterCriteria, expandedHostFlowIds)
        │  → filterVisibility
        ▼
applyBranchHidingToVisibility(filterVisibility, hiddenBranchAnchors, ...)
        │  → visibility { visibleNodeIds, visibleEdgeIds, shownNodes, ... }
        ▼
Каждый рендерер применяет visibility к своей сцене
```

**Важно:** фильтр не ищет по всему документу — только по узлам **текущей inline-сцены** (root + раскрытые folder). Это согласовано между React Flow, Three.js и yFiles.

---

## 7. graph-layout — построение сцены и раскладка

### 7.1. buildInlineFlowScene

Файл: `graph-layout/buildInlineFlowScene.js`

Рекурсивно обходит граф:

1. Берёт узлы текущего уровня (`root` или subgraph).
2. Если узел — папка и его flowId **в** `expandedHostFlowIds`:
   - создаёт `groupNode` (обёртка);
   - рекурсивно добавляет узлы/рёбра подграфа внутрь группы;
   - добавляет entry/exit anchors для layout.
3. Если папка **свёрнута** — остаётся один `folderNode`.
4. Обычные узлы — `dagNode`.

Результат: массивы `nodes` и `edges` в формате React Flow (даже если целевой рендерер — не React Flow). Это **универсальное представление inline-сцены**.

### 7.2. Layout для React Flow

Цепочка в `useElkLayout.js`:

```
buildInlineFlowScene
    → resolveInlineExpandEdges (порты подграфов)
    → wrapExpandedGroups (parentId для group nodes)
    → runElkLayout / runDagreLayout (по размеру графа)
    → applyElkResult (позиции + SVG paths для рёбер)
    → layoutExpandedInlineScene (дораскладка раскрытых групп)
```

На больших графах (`large-*`): debounce 200 ms, компактный size profile, LOD при отдалении zoom.

### 7.3. Layout для Three.js

`buildGraph3DScene` → `assignDagreLayout3D` (dagre в плоскости XZ, высота по depth).

### 7.4. Layout для yFiles

Отдельный путь: `graphDocumentToMasterGraph` строит **полный master graph** со всеми уровнями вложенности, затем `FoldingManager` сворачивает папки. Layout: `RecursiveGroupLayout` + `HierarchicLayout` в `applyYFilesLayout.js`.

yFiles **не использует** `buildInlineFlowScene` — у него своя модель folding, синхронизированная с `expandedHostFlowIds`.

---

## 8. Фильтрация

### 8.1. Критерии (`graphFilterTypes.js`)

Фильтр активен, если задано хотя бы одно поле:

- `labelContains` — подстрока в label (без учёта регистра);
- `maxDepth` — максимальная глубина узла;
- `hasSubgraph` — только папки / только не-папки;
- `startAfter`, `startBefore`, `endAfter`, `endBefore` — диапазоны timeline (UTC).

Условия между полями — **AND**.

### 8.2. Алгоритм (`filterGraphScene.js`)

1. Построить inline-сцену → получить `scopeNodeIds` (все узлы «на экране»).
2. Найти узлы, подходящие под критерии → `matching`.
3. Для каждого подходящего — добавить предков-папок (`addAncestorFolders`), чтобы можно было навигировать.
4. Пересчитать видимые рёбра: оба конца в `visibleNodeIds`.

Статистика: `matchedNodes`, `shownNodes`, `noMatchesInView`.

### 8.3. Скрытие веток (`branchVisibility.js`)

По ПКМ → «Скрыть исходящие ветки»:

1. От anchor flowId обход **только по исходящим рёбрам** в пределах inline-сцены.
2. Все достижимые узлы (кроме anchor) убираются из `visibleNodeIds`.
3. Anchor остаётся видимым.

Можно включить/выключить повторным выбором в меню.

### 8.4. Применение в рендерерах

| Рендерер | Механизм |
|----------|----------|
| React Flow | `filterFlowScene(nodes, edges, visibleNodeIds, visibleEdgeIds, ...)` |
| Three.js | `filterGraph3DScene(nodes, edges, ...)` |
| yFiles | `VoidNodeStyle` / `VoidEdgeStyle` через `applyYFilesFilterVisibility` |
| AnyChart | `filterGanttTreePayload` в `anychartGraphInteraction.js` |

---

## 9. Контекстное меню

`GraphContextMenuLayer` — один компонент на всё приложение (не per-renderer). Каждый рендерер только **открывает** меню с унифицированным `ContextMenuRequest`:

```ts
{
  rendererId: 'yfiles' | 'reactflow' | 'threejs' | 'anychart',
  clientX, clientY,
  target: { kind: 'node' | 'edge', flowId, label, isFolder?, isExpanded? },
  attributes: { label, graphId, localId, depth, start, end, ... }
}
```

`contextMenuPlacement.js` — `useContextMenuPlacement` измеряет DOM меню и сдвигает его, чтобы не выходило за viewport.

---

## 10. Рендереры — детально

### 10.1. yFiles (`@yFiles/`)

**Модель:** полный master graph + folding, не inline.

| Этап | Модуль |
|------|--------|
| Лицензия | `registerLicense.js` |
| JSON → DefaultGraph | `graphDocumentToMasterGraph.js` |
| Folding + стили папок | `yFilesFolderConverter.js`, `applyYFilesStyles.js` |
| GraphComponent lifecycle | `YFilesGraphPanel.jsx` (useEffect) |
| Синхронизация expand | `yFilesFoldingActions.js` ↔ `expandedHostFlowIds` |
| Фильтр | `yFilesGraphInteraction.js` (Void styles) |
| Layout | `applyYFilesLayout.js` |
| Контекстное меню | DOM `contextmenu` listener (не встроенное меню yFiles) |
| Мостики рёбер | `yFilesEdgeBridges.js` |

**Особенности:**
- При входе в группу (`onGroupEntered`) вызывается `openSubgraph` → обновляется breadcrumb.
- Панорама: ЛКМ+drag (`configureCanvasPanning.js`).
- Compare: `yfilesControllerId="compare-N"` регистрирует `expandAll` / `collapseAll`.

### 10.2. React Flow (`@reactFlow/`)

**Модель:** inline-сцена + ELK/dagre layout.

| Компонент | Роль |
|-----------|------|
| `DagLodPanel.jsx` | Toolbar, `useElkLayout`, обёртка `ReactFlowProvider` |
| `useElkLayout.js` | Асинхронный layout, epoch-отмена устаревших результатов |
| `ReactFlowCanvas.jsx` | Canvas, selection, filter, LOD |
| `useGraphLod.js` | Компактные узлы при zoom < порога (только large graphs) |
| `reactFlowNodeTypes.jsx` | `dagNode`, `folderNode`, `groupNode`, compact-варианты |
| `edges/ElkEdge.jsx` | Ортогональные рёбра с SVG path из ELK |

**Поток данных:**

```
useGraphView() ──document, expandedHostFlowIds──► useElkLayout
useGraphInteraction() ──visibility──► filterFlowScene ──► ReactFlowCanvas
```

### 10.3. Three.js (`@threeJs/`)

**Модель:** inline-сцена → 3D nodes + dagre layout.

| Модуль | Роль |
|--------|------|
| `buildGraph3DScene.js` | `buildInlineFlowScene` + позиции |
| `assignDagreLayout3D.js` | dagre в плоскости XZ |
| `GraphScene3D.jsx` | R3F Canvas |
| `GraphNodes3D.jsx` / `GraphEdges3D.jsx` | Меши и линии |
| `InitialCameraFit.jsx` | Вписать камеру в граф |
| `filterGraph3DScene.js` | Фильтр видимости |

Клик / ПКМ → `threeGraphInteraction.js` → общее меню.

### 10.4. AnyChart (`@anyChart/`)

**Модель:** иерархическое Gantt-дерево, не DAG на холсте.

| Модуль | Роль |
|--------|------|
| `anychartAdapter.js` | `documentToGanttTree` — JSON → rows с `children` |
| `AnyChartGanttPanel.jsx` | Инициализация chart, sync expand |
| `anychartGraphInteraction.js` | hit-test по строкам, фильтр дерева |

Timeline: реальные `start`/`end` или синтетические интервалы по порядку узлов.  
Раскрытие строк синхронизировано с `expandedHostFlowIds`.

---

## 11. Вкладка «Слияние» (Compare)

`CompareSplitPanel.jsx`:

- 2 / 3 / 4 панели в сетке;
- каждая панель — выбор библиотеки из dropdown;
- **общий toolbar**: expand/collapse всех папок, сброс фильтра;
- yFiles-панели с `chrome="minimal"` (без локального toolbar);
- `yfilesControllerId={`compare-${index}`}` для синхронизации folding.

Все панели читают **одни и те же** контексты — изменение фильтра или expand на одном экране отражается на остальных.

---

## 12. Breadcrumb

`GraphBreadcrumbBar` показывает путь: `Root / Папка A / Папка B`.

Обновляется при:
- `openSubgraph` (yFiles: вход в группу);
- `resetNavigation` / `navigateToStackIndex` (клик по крошкам);
- `expandAllFolders` / `collapseAllFolders` (сброс стека).

**Ограничение:** breadcrumb — в основном журнал навигации yFiles. React Flow и Three.js управляют подграфами через `expandedHostFlowIds`, а не через `navigationStack`. Клик по breadcrumb не сворачивает папки на других вкладках.

---

## 13. Типичные сценарии пользователя

### Раскрыть папку

1. Пользователь жмёт «+» (yFiles) или выбирает «Раскрыть» в меню (любой рендерер).
2. `toggleFolderExpand(flowId)` → `expandedHostFlowIds` обновлён.
3. React Flow / Three.js: пересборка inline-сцены + layout.
4. yFiles: `syncFoldingViewToExpandedIds` + layout.
5. AnyChart: раскрытие строки Gantt.

### Применить фильтр

1. ПКМ по узлу → «Фильтр» → заполнить поля → «Применить».
2. `applyFilter(criteria)` → `computeFilterVisibility` → `visibility`.
3. Каждый рендерер скрывает несоответствующие узлы/рёбра своим способом.

### Сменить датасет

1. Select в toolbar → новый `datasetId`.
2. `GraphDocumentProvider` remount (`key={datasetId}`).
3. Сброс: navigation, expand, фильтр, hidden branches.
4. Все рендереры строят сцену заново.

---

## 14. Файлы по зонам ответственности

### graph-model
- `loadGraphDocument.js` — загрузка, нормализация, `getGraphDefinition`
- `formatTimeline.js` — форматирование дат для UI

### graph-layout
- `buildInlineFlowScene.js` — универсальная inline-сцена
- `wrapExpandedGroups.js`, `resolveInlineExpandEdges.js`, `adjustLayoutForExpandedHosts.js` — раскрытые группы
- `runElkLayout.js`, `runDagreLayout.js`, `applyElkResult.js` — layout
- `constants.js` — пороги large graph, LOD, debounce

### graph-context
- `GraphDocumentContext.jsx` — документ, expand, navigation
- `GraphInteractionContext.jsx` — фильтр, меню, visibility
- `filterGraphScene.js` — логика фильтра
- `filterFlowScene.js`, `filterGraph3DScene.js` — адаптеры видимости
- `branchVisibility.js` — скрытие исходящих веток
- `resolveGraphNode.js` — `parseFlowNodeId`, `findGraphNode`
- `collectFolderHostFlowIds.js` — список всех папок в документе

### components
- `GraphContextMenuLayer.jsx` — единое контекстное меню
- `GraphContextMenuFilter.jsx` — форма фильтра
- `CompareSplitPanel.jsx` — режим сравнения

---

## 15. Обработка правого клика (ПКМ) в AnyChart

AnyChart — единственный рендерер, где контекстное меню **не привязано к API библиотеки**: у Gantt-чарта нет удобного hit-test для произвольной точки, поэтому ПКМ ловится на **DOM-контейнере** и строка вычисляется **геометрически** по координате `Y`.

Файлы:
- `@anyChart/AnyChartGanttPanel.jsx` — регистрация слушателя, сборка запроса меню;
- `@anyChart/anychartGraphInteraction.js` — `resolveGanttRowAtEvent`, `flattenVisibleGanttRows`.

### 15.1. Регистрация слушателя

В отдельном `useEffect` (срабатывает после `chartReady`) на `mountRef` навешивается обработчик:

```js
mount.addEventListener('contextmenu', onContextMenu);
return () => mount.removeEventListener('contextmenu', onContextMenu);
```

Зависимости эффекта — `[chartReady, document]`: слушатель пересоздаётся только при готовности чарта или смене документа.

### 15.2. Свежие данные через refs

Обработчик живёт долго, но должен видеть актуальные данные. Поэтому изменяемые значения читаются не из замыкания, а из refs, которые синхронизируются на каждом рендере:

| Ref | Что хранит |
|-----|------------|
| `ganttDataRef` | Текущий (отфильтрованный) payload Gantt |
| `expandedHostFlowIdsRef` | Набор раскрытых папок |
| `openContextMenuRef` | Колбэк открытия меню из `GraphInteractionProvider` |

Это позволяет не пересоздавать слушатель при каждом изменении фильтра / expand.


### 15.3. Сборка запроса меню

После нахождения строки данные обогащаются из модели графа:

```js
const graphNode = findGraphNode(document, row.hostFlowId);
const parsed = parseFlowNodeId(row.hostFlowId);
const attributes = graphNode && parsed
  ? nodeToHitAttributes(graphNode, parsed.graphId)   // полные атрибуты узла
  : { label: row.name, flowId: row.hostFlowId };      // запасной вариант
```

Затем вызывается общий `openContextMenu` с унифицированным `ContextMenuRequest` (`rendererId: 'anychart'`, `target.kind: 'node'`, координаты `clientX/clientY`, флаги `isFolder` / `isExpanded`). Дальше запрос обрабатывает тот же `GraphContextMenuLayer`, что и для остальных рендереров (см. раздел 9).
