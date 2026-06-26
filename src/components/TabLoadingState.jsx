import styled from 'styled-components';

const Root = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
    font-size: 14px;
`;

export function TabLoadingState({ label }) {
	return <Root>Загрузка {label}…</Root>;
}