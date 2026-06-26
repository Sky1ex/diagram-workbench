import { useEffect, useRef } from 'react';
import styled from 'styled-components';

const MenuRoot = styled.div`
	position: absolute;
	z-index: 20;
	min-width: 140px;
	padding: 4px 0;
	border-radius: 8px;
	background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
	border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
	box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
`;

const MenuItemButton = styled.button`
	display: block;
	width: 100%;
	padding: 8px 14px;
	border: none;
	background: transparent;
	text-align: left;
	font-size: 13px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 90']};
	cursor: pointer;

	&:hover:not(:disabled) {
		background: ${({ theme }) => theme.color['Neutral/Neutral 10']};
	}

	&:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
`;

export function NodeContextMenu({
	menu,
	containerRef,
	onExpand,
	onCollapse,
	onClose
}) {
	const menuRef = useRef(null);

	useEffect(() => {
		if (!menu) return;

		const handlePointerDown = (event) => {
			const target = event.target;
			if (menuRef.current?.contains(target ?? null)) return;
			onClose();
		};

		const handleKeyDown = (event) => {
			if (event.key === 'Escape') onClose();
		};

		window.addEventListener('pointerdown', handlePointerDown, true);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('pointerdown', handlePointerDown, true);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [menu, onClose]);

	if (!menu || !containerRef.current) return null;

	const rect = containerRef.current.getBoundingClientRect();
	const left = menu.clientX - rect.left;
	const top = menu.clientY - rect.top;

	return (
		<MenuRoot ref={menuRef} style={{ left, top }}>
			{menu.isExpanded ?
				<MenuItemButton
					type="button"
					onClick={() => {
						onCollapse(menu.nodeId);
						onClose();
					}}
				>
					Свернуть
				</MenuItemButton> :

				<MenuItemButton
					type="button"
					onClick={() => {
						onExpand(menu.nodeId);
						onClose();
					}}
				>
					Раскрыть
				</MenuItemButton>
			}
		</MenuRoot>
	);
}