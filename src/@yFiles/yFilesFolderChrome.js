/**
 * Раскрытая папка / группа с детьми: стиль не трогаем — иначе CollapsibleNodeStyleDecorator
 * сбрасывается (остаётся обводка без кнопки «−»).
 */
export function shouldPreserveFolderChrome(
	graph,
	node,
	tag,
	foldingView
) {
	if (graph.getChildren(node).size > 0) return true;
	if (!tag?.subgraphId) return false;
	const master = foldingView.getMasterItem(node) ?? node;
	return foldingView.isExpanded(master);
}