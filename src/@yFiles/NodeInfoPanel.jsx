import styled from 'styled-components';

import { formatTimelineRange } from '@graphModel/formatTimeline';
import { nodeInfoPanelMobile } from '../styles/mobileStyles';

const Panel = styled.div`
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 4;
    max-width: 300px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 12px;
    color: ${({ theme }) => theme.color['Neutral/Neutral 80']};
    background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
    border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
    pointer-events: none;

    ${nodeInfoPanelMobile}
`;

const Title = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.color['Neutral/Neutral 90']};
    margin-bottom: 8px;
    word-break: break-word;
`;

const Row = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 4px;
`;

const RowLabel = styled.span`
	flex-shrink: 0;
	min-width: 72px;
	color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
`;

const RowValue = styled.span`
	color: ${({ theme }) => theme.color['Neutral/Neutral 90']};
	word-break: break-all;
`;

export function NodeInfoPanel({
	selection,
	document
}) {
	if (!selection) return null;

	const { tag, isFolder, isExpanded } = selection;
	const graph = document.graphs[tag.graphId];
	const docNode = graph?.nodes.find((node) => node.id === tag.localId);

	return (
		<Panel>
			<Title>{tag.label}</Title>
			<Row>
				<RowLabel>ID</RowLabel>
				<RowValue>{tag.localId}</RowValue>
			</Row>
			<Row>
				<RowLabel>Граф</RowLabel>
				<RowValue>{graph?.label ?? tag.graphId}</RowValue>
			</Row>
			<Row>
				<RowLabel>Тип</RowLabel>
				<RowValue>{isFolder ? 'Folder' : 'Узел'}</RowValue>
			</Row>
			{docNode?.start !== undefined && docNode.end !== undefined &&
				<Row>
					<RowLabel>Интервал</RowLabel>
					<RowValue>{formatTimelineRange(docNode.start, docNode.end)}</RowValue>
				</Row>
			}
			{docNode != null &&
				<Row>
					<RowLabel>Depth</RowLabel>
					<RowValue>{docNode.depth}</RowValue>
				</Row>
			}
			{tag.subgraphId &&
				<Row>
					<RowLabel>Подграф</RowLabel>
					<RowValue>{tag.subgraphId}</RowValue>
				</Row>
			}
			{isFolder &&
				<Row>
					<RowLabel>Состояние</RowLabel>
					<RowValue>{isExpanded ? 'Раскрыт' : 'Свёрнут'}</RowValue>
				</Row>
			}
		</Panel>
	);
}