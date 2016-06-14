import * as chalk from 'chalk';
import * as winston from 'winston';
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
		winston.info(JSON.stringify(installableDetails), ' ');
		await get(installableDetails);
	} else {
		winston.error(chalk.red(`Installable: ${installable} is not a reconisable git module`));
	}

	winston.info(chalk.green.bold('\n ✔ DONE'));
};
