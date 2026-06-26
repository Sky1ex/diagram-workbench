import { License } from 'yfiles';

import licenseData from './license.json';

let registered = false;

export function registerYFilesLicense() {
	if (registered) return;
	License.value = licenseData;
	registered = true;
}