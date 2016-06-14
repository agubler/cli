import * as chalk from 'chalk';
// import { get as getPath } from '../util/path';
import { get, isGitInstallable, getInstallableDetails } from '../util/gitModule';
interface SkipConfig {
	force: boolean;
}

let skip: SkipConfig;

export async function install(installable: string, skipConfig: SkipConfig) {
	skip = skipConfig;

	if (isGitInstallable(installable)) {
		const installableDetails = getInstallableDetails(installable);
		console.dir(installableDetails);
	} else {
		console.error(chalk.red(`Installable: ${installable} is not a reconisable git module`));
	}

	console.log(chalk.green.bold('\n ✔ DONE'));
};
