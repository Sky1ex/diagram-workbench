import styled from 'styled-components';

import { formatTimelineRange } from '@graphModel/formatTimeline';
import { parseFlowNodeId } from '@graphContext';

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

function isFolderNode(node) {
	return (
		Boolean(node.data.subgraphId) ||
		node.type === 'folderNode' ||
		node.type === 'compactFolderNode' ||
		node.type === 'groupNode' ||
		node.type === 'compactGroupNode'
	);
}

export function NodeInfoPanel({
	selectedNodeId,
	nodes,
	document,
	expandedHostFlowIds
}) {
	if (!selectedNodeId) return null;

	const flowNode = nodes.find((node) => node.id === selectedNodeId);
	if (!flowNode) return null;

	const title = flowNode.data.fullLabel ?? flowNode.data.label;
	const { graphId, localId } = parseFlowNodeId(selectedNodeId);
	const graph = document.graphs[graphId];
	const docNode = graph?.nodes.find((node) => node.id === localId);
	const isFolder = isFolderNode(flowNode);
	const isExpanded = expandedHostFlowIds.has(selectedNodeId) || Boolean(flowNode.data.isExpanded);

	return (
		<Panel>
			<Title>{title}</Title>
			<Row>
				<RowLabel>ID</RowLabel>
				<RowValue>{localId}</RowValue>
			</Row>
			<Row>
				<RowLabel>Граф</RowLabel>
				<RowValue>{graph?.label ?? (graphId || '—')}</RowValue>
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
			{flowNode.data.subgraphId &&
				<Row>
					<RowLabel>Подграф</RowLabel>
					<RowValue>{flowNode.data.subgraphId}</RowValue>
				</Row>
			}
			{isFolder &&
				<Row>
					<RowLabel>Состояние</RowLabel>
					<RowValue>{isExpanded ? 'Раскрыт' : 'Свёрнут'}</RowValue>
				</Row>
			}
			{flowNode.parentId &&
				<Row>
					<RowLabel>Группа</RowLabel>
					<RowValue>{flowNode.parentId}</RowValue>
				</Row>
			}
		</Panel>
	);
}