import * as ejs from 'ejs';
import { writeFile } from 'fs';
import * as chalk from 'chalk';
import Promise from 'dojo-core/Promise';

export const render = function (source: string, destination: string, replacements: Object): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		console.log(chalk.yellow('Info: ') + `rendering ${destination}`);
		ejs.renderFile(source, replacements, (err: Error, str: string) => {
			if (err) {
				console.log(chalk.red('Error: ') + err);
				reject();
			}

			writeFile(destination, str, (err?: Error) => {
				if (err) {
					console.log(chalk.red('Error: ') + err);
					reject();
				}
				resolve();
			});
		});
	});
};
