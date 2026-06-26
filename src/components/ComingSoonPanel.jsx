import styled from 'styled-components';

const Root = styled.div`
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
	font-size: 14px;
`;

export function ComingSoonPanel({ libraryName }) {
	return <Root>Вкладка {libraryName} — в разработке</Root>;
}