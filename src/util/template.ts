import * as ejs from 'ejs';
import { writeFile } from 'fs';
import * as chalk from 'chalk';

export const render = function (source: string, destination: string, replacements: Object) {
	console.log(chalk.yellow('Info: ') + `rendering ${destination}`);
	ejs.renderFile(source, replacements, (err: Error, str: string) => {
		if (err) {
			console.log(chalk.red('Error: ') + err);
		}

		writeFile(destination, str, (err?: Error) => {
			if (err) {
				console.log(chalk.red('Error: ') + err);
			}
		});
	});
};
