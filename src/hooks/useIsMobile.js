import { useEffect, useState } from 'react';

import { BREAKPOINTS } from '../styles/breakpoints';

const QUERY = `(max-width: ${BREAKPOINTS.mobile}px)`;

export function useIsMobile() {
	const [isMobile, setIsMobile] = useState(() => {
		if (typeof window === 'undefined') return false;
		return window.matchMedia(QUERY).matches;
	});

	useEffect(() => {
		const mediaQuery = window.matchMedia(QUERY);
		const onChange = (event) => setIsMobile(event.matches);
		mediaQuery.addEventListener('change', onChange);
		return () => mediaQuery.removeEventListener('change', onChange);
	}, []);

	return isMobile;
}
