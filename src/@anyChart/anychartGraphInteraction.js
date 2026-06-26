export const GANTT_HEADER_HEIGHT = 52;
export const GANTT_ROW_HEIGHT = 40;

export function flattenVisibleGanttRows(
rows,
expandedHostFlowIds)
{
  const result = [];

  for (const row of rows) {
    result.push(row);
    if (row.children?.length && row.subgraphId && expandedHostFlowIds.has(row.hostFlowId)) {
      result.push(...flattenVisibleGanttRows(row.children, expandedHostFlowIds));
    }
  }

  return result;
}

export function resolveGanttRowAtEvent(
mount,
event,
payload,
expandedHostFlowIds)
{
  const rect = mount.getBoundingClientRect();
  const offsetY = event.clientY - rect.top;
  const rowOffset = offsetY - GANTT_HEADER_HEIGHT;
  if (rowOffset < 0) return null;

  const rowIndex = Math.floor(rowOffset / GANTT_ROW_HEIGHT);
  const visibleRows = flattenVisibleGanttRows(payload.rows, expandedHostFlowIds);
  return visibleRows[rowIndex] ?? null;
}

export function filterGanttTreePayload(
payload,
visibleNodeIds,
visibilityActive)
{
  if (!visibilityActive) return payload;

  const filterRows = (rows) => {
    const result = [];
    for (const row of rows) {
      if (!visibleNodeIds.has(row.hostFlowId)) continue;
      const next = { ...row };
      if (row.children?.length) {
        next.children = filterRows(row.children);
      }
      result.push(next);
    }
    return result;
  };

  return {
    ...payload,
    rows: filterRows(payload.rows),
    folderIds: payload.folderIds.filter((id) => visibleNodeIds.has(id))
  };
}