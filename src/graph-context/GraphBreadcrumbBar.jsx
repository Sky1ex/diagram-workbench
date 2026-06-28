import styled from 'styled-components';

import { useGraphView } from './GraphDocumentContext';
import { MOBILE } from '../styles/breakpoints';

const Bar = styled.nav`
	flex-shrink: 0;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	padding: 8px 12px;
	font-size: 13px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 70']};

	${MOBILE} {
		padding: 6px 8px;
		font-size: 12px;
	}
`;

const CrumbButton = styled.button`
	border: none;
	background: transparent;
	padding: 2px 4px;
	border-radius: 4px;
	cursor: pointer;
	color: ${({ theme }) => theme.color['Primary/Primary 60 Main']};
	font: inherit;

	&:hover {
		background: ${({ theme }) => theme.color['Neutral/Neutral 10']};
	}
`;

const Separator = styled.span`
	color: ${({ theme }) => theme.color['Neutral/Neutral 40']};
	user-select: none;
`;

export function GraphBreadcrumbBar() {
	const { document, navigationStack, navigateToStackIndex, resetNavigation } = useGraphView();
	const rootLabel = document.graphs[document.rootGraphId]?.label ?? 'Root';

	return (
		<Bar aria-label="Навигация по подграфам">
			<CrumbButton type="button" onClick={() => resetNavigation()}>
				{rootLabel}
			</CrumbButton>
			{navigationStack.map((entry, index) =>
				<span key={entry.hostNodeId}>
					<Separator>/</Separator>
					<CrumbButton type="button" onClick={() => navigateToStackIndex(index)}>
						{entry.label}
					</CrumbButton>
				</span>
			)}
		</Bar>
	);
}