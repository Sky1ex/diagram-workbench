import { createContext, useContext } from 'react';

const ReactFlowInteractionContext = createContext(null);

export function ReactFlowInteractionProvider({
	value,
	children
}) {
	return (
		<ReactFlowInteractionContext.Provider value={value}>
			{children}
		</ReactFlowInteractionContext.Provider>
	);
}

export function useReactFlowInteraction() {
	const ctx = useContext(ReactFlowInteractionContext);
	if (!ctx) {
		throw new Error('useReactFlowInteraction must be used within ReactFlowInteractionProvider');
	}
	return ctx;
}