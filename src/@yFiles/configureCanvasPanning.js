import {
	EventRecognizers,
	GraphViewerInputMode
} from
	'yfiles';

/**
 * В GraphEditorInputMode панорама по умолчанию только с Ctrl/СКМ,
 * а ЛКМ+перетаскивание — рамка выделения. Настраиваем как у GraphViewerInputMode.
 */
export function configureCanvasPanning(inputMode) {
	const viewerPan = new GraphViewerInputMode().moveViewportInputMode;
	const pan = inputMode.moveViewportInputMode;

	inputMode.marqueeSelectionInputMode.enabled = false;
	inputMode.lassoSelectionInputMode.enabled = false;
	inputMode.marqueeSelectionInputMode.pressedRecognizer = EventRecognizers.NEVER;
	inputMode.marqueeSelectionInputMode.draggedRecognizer = EventRecognizers.NEVER;

	pan.enabled = true;
	// Ниже navigation (expand/collapse «+/−»), чтобы клики по кнопкам папок не уходили в панораму.
	pan.priority = 40;
	pan.pressedRecognizer = viewerPan.pressedRecognizer;
	pan.draggedRecognizer = viewerPan.draggedRecognizer;
	pan.releasedRecognizer = viewerPan.releasedRecognizer;
	pan.primaryDownRecognizer = viewerPan.primaryDownRecognizer;
	pan.primaryMoveRecognizer = viewerPan.primaryMoveRecognizer;
	pan.primaryUpRecognizer = viewerPan.primaryUpRecognizer;
}