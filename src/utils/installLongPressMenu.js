const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 12;

/**
 * Эмулирует contextmenu на тач-устройствах через long press.
 * @param {HTMLElement} element
 * @param {(coords: { clientX: number, clientY: number }) => void} onLongPress
 */
export function installLongPressMenu(element, onLongPress) {
	let timer = null;
	let startX = 0;
	let startY = 0;

	const clearTimer = () => {
		if (timer != null) {
			clearTimeout(timer);
			timer = null;
		}
	};

	const onTouchStart = (event) => {
		if (event.touches.length !== 1) return;
		const touch = event.touches[0];
		startX = touch.clientX;
		startY = touch.clientY;
		clearTimer();
		timer = setTimeout(() => {
			timer = null;
			onLongPress({ clientX: startX, clientY: startY });
		}, LONG_PRESS_MS);
	};

	const onTouchMove = (event) => {
		if (timer == null || event.touches.length !== 1) return;
		const touch = event.touches[0];
		if (
			Math.abs(touch.clientX - startX) > MOVE_TOLERANCE_PX ||
			Math.abs(touch.clientY - startY) > MOVE_TOLERANCE_PX
		) {
			clearTimer();
		}
	};

	const onTouchEnd = () => clearTimer();
	const onTouchCancel = () => clearTimer();

	element.addEventListener('touchstart', onTouchStart, { passive: true });
	element.addEventListener('touchmove', onTouchMove, { passive: true });
	element.addEventListener('touchend', onTouchEnd);
	element.addEventListener('touchcancel', onTouchCancel);

	return () => {
		clearTimer();
		element.removeEventListener('touchstart', onTouchStart);
		element.removeEventListener('touchmove', onTouchMove);
		element.removeEventListener('touchend', onTouchEnd);
		element.removeEventListener('touchcancel', onTouchCancel);
	};
}
