let elk = null;
let elkInitPromise = null;
let requestSeq = 0;
let activeRequestId = 0;

async function getElk() {
	if (elk) return elk;
	if (!elkInitPromise) {
		elkInitPromise = (async () => {
			const [{ default: ElkConstructor }, { default: elkWorkerUrl }] = await Promise.all([
				import('elkjs/lib/elk-api.js'),
				import('elkjs/lib/elk-worker.min.js?url')]
			);
			const instance = new ElkConstructor({
				workerUrl: elkWorkerUrl,
				workerFactory: (url) => new Worker(url ?? elkWorkerUrl)
			});
			elk = instance;
			return instance;
		})();
	}
	return elkInitPromise;
}

export function runElkLayout(graph) {
	const requestId = ++requestSeq;
	activeRequestId = requestId;

	return getElk().
		then((elkInstance) => elkInstance.layout(graph)).
		then((layouted) => {
			if (requestId !== activeRequestId) {
				return Promise.reject(new Error('Layout superseded'));
			}
			return layouted;
		});
}

export function disposeElkLayoutWorker() {
	activeRequestId = ++requestSeq;
	elkInitPromise = null;
	if (!elk) return;
	elk.terminateWorker();
	elk = null;
}