import { createGlobalStyle } from 'styled-components';

/** Стили Controls / MiniMap React Flow под Admiral theme. */
export const ReactFlowChromeStyles = createGlobalStyle`
  .react-flow__node {
    padding: 0 !important;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    overflow: hidden !important;
  }

  .react-flow__minimap {
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
    background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .react-flow__controls {
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }

  .react-flow__controls-button {
    background: ${({ theme }) => theme.color['Neutral/Neutral 05']};
    border-bottom: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 20']};
    fill: ${({ theme }) => theme.color['Neutral/Neutral 70']};
  }

  .react-flow__controls-button:hover {
    background: ${({ theme }) => theme.color['Neutral/Neutral 10']};
  }
`;