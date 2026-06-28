import {
	EventRecognizers,
	GraphViewerInputMode
} from
	'yfiles';

/**
 * В GraphEditorInputMode панорама по умолчанию только с Ctrl/СКМ,
 * а ЛКМ+перетаскивание — рамка выделения. Настраиваем как у GraphViewerInputMode.
 *
 * На мобильных click/tap перехватывают жест раньше moveViewport — поднимаем
 * приоритет панорамы и отключаем выделение узлов, чтобы свайп работал по всему холсту.
 */
export function configureCanvasPanning(inputMode, { mobile = false } = {}) {
	const viewerPan = new GraphViewerInputMode().moveViewportInputMode;
	const pan = inputMode.moveViewportInputMode;

	inputMode.marqueeSelectionInputMode.enabled = false;
	inputMode.lassoSelectionInputMode.enabled = false;
	inputMode.marqueeSelectionInputMode.pressedRecognizer = EventRecognizers.NEVER;
	inputMode.marqueeSelectionInputMode.draggedRecognizer = EventRecognizers.NEVER;

	pan.enabled = true;
	pan.allowPinchZoom = true;
	pan.pressedRecognizer = viewerPan.pressedRecognizer;
	pan.draggedRecognizer = viewerPan.draggedRecognizer;
	pan.releasedRecognizer = viewerPan.releasedRecognizer;
	pan.primaryDownRecognizer = viewerPan.primaryDownRecognizer;
	pan.primaryMoveRecognizer = viewerPan.primaryMoveRecognizer;
	pan.primaryUpRecognizer = viewerPan.primaryUpRecognizer;
	pan.secondaryDownRecognizer = viewerPan.secondaryDownRecognizer;
	pan.secondaryMoveRecognizer = viewerPan.secondaryMoveRecognizer;
	pan.secondaryUpRecognizer = viewerPan.secondaryUpRecognizer;

	if (mobile) {
		// Выше navigation (± на папках), но ниже критичных режимов редактора.
		pan.priority = 5;
		inputMode.clickInputMode.priority = 50;
		inputMode.tapInputMode.priority = 50;
		inputMode.moveUnselectedInputMode.enabled = false;
	} else {
		// Ниже navigation (expand/collapse «+/−»), чтобы клики по кнопкам папок не уходили в панораму.
		pan.priority = 40;
	}
}