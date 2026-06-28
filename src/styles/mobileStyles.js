import { MOBILE } from './breakpoints';

export const hideOnMobile = `
	${MOBILE} {
		display: none;
	}
`;

export const toolbarMobile = `
	${MOBILE} {
		padding: 6px 8px;
		gap: 6px;
	}
`;

export const nodeInfoPanelMobile = `
	${MOBILE} {
		top: auto;
		right: 8px;
		left: 8px;
		bottom: 8px;
		max-width: none;
		max-height: 32vh;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		pointer-events: auto;
	}
`;

export const canvasHintMobile = hideOnMobile;
