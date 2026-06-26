import {
	CollapsibleNodeStyleDecorator,
	DefaultFolderNodeConverter,
	DefaultLabelStyle,
	Font,
	HorizontalTextAlignment,
	InteriorLabelModel,
	ShapeNodeShape,
	ShapeNodeStyle,
	Size,
	Stroke,
	TextWrapping,
	VerticalTextAlignment
} from 'yfiles';

import { YFILES_FOLDER_NODE_SIZE } from './applyYFilesStyles';

const FOLDER_FILL = '#e8eef9';
const FOLDER_STROKE = '#3d5a99';

function createFolderShapeStyle() {
	return new ShapeNodeStyle({
		shape: ShapeNodeShape.ROUND_RECTANGLE,
		fill: FOLDER_FILL,
		stroke: new Stroke(FOLDER_STROKE, 2)
	});
}

/** Стиль свёрнутой папки: фон + кнопка «+»/«−» на узле. */
export function createCollapsibleFolderStyle() {
	return new CollapsibleNodeStyleDecorator(createFolderShapeStyle());
}

let sharedFolderGroupStyle = null;

/** Один экземпляр decorator на всё приложение — иначе сбрасывается состояние «+/−». */
export function getSharedFolderGroupStyle() {
	if (!sharedFolderGroupStyle) {
		sharedFolderGroupStyle = createCollapsibleFolderStyle();
	}
	return sharedFolderGroupStyle;
}

export function createFolderNodeConverter() {
	const labelStyle = new DefaultLabelStyle({
		font: new Font({ fontSize: 11 }),
		textFill: '#1a1f36',
		horizontalTextAlignment: HorizontalTextAlignment.CENTER,
		verticalTextAlignment: VerticalTextAlignment.CENTER,
		wrapping: TextWrapping.WORD,
		maximumSize: new Size(
			YFILES_FOLDER_NODE_SIZE.width - 16,
			YFILES_FOLDER_NODE_SIZE.height - 10
		)
	});

	return new DefaultFolderNodeConverter({
		copyFirstLabel: true,
		labelStyle,
		folderNodeStyle: getSharedFolderGroupStyle(),
		folderNodeSize: new Size(YFILES_FOLDER_NODE_SIZE.width, YFILES_FOLDER_NODE_SIZE.height),
		labelLayoutParameter: InteriorLabelModel.CENTER
	});
}