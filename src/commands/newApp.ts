import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import { merge } from 'lodash';
import { readdirSync } from 'fs';

// Not a TS module
const availableModules = require('../config/availableModules.json');

interface ProceedAnswers extends inquirer.Answers {
	proceed: boolean;
}

interface CreateAnswers extends inquirer.Answers {
	version: 'stable' | 'latest';
	modules: string[];
}

const path = {
	templates: __dirname + '/templates/',
	destination: process.cwd() + '/'
};

const checkForAppName = (name: any): void => {
	if (!name || name.length === 0) {
		console.error(chalk.red('Error: ') + 'App Name is Required');
		process.exit(1);
	}
};

const checkForEmptyDir = (dirPath: string, exit: boolean = false): void | boolean => {
	const folderContents = readdirSync(dirPath);
	const isEmpty = folderContents.length === 0;

	if (!isEmpty && exit) {
		console.error(chalk.red('Error: ') + 'Directory is not empty');
		process.exit(1);
	} else {
		return isEmpty;
	}
};

const proceedCheck = (name: string) => {
	return inquirer.prompt([{
		type: 'confirm',
		name: 'proceed',
		message: `Do you wish to proceed with creating ${name}?`,
		default: true
	}]).then((response: ProceedAnswers) => {
		if (!response.proceed) {
			console.error(chalk.red('\nExiting: ') + 'User chose to exit');
			process.exit(1);
		}
	});
};

export const createNew = (name: string) => {
	checkForAppName(name);
	checkForEmptyDir(path.destination, true);

	let appDetails = { name };
	let questions = [
		{
			type: 'list',
			name: 'version',
			message: 'Would you like the \"stable\" or \"latest\" verisons?',
			choices: [
				{ name: 'stable (recomended)', value: 'stable'},
				{ name: 'latest (here be dragons)', value: 'latest'}
			],
			default: 0
		},
		{
			type: 'checkbox',
			name: 'modules',
			message: 'Which modules would you like to use?',
			choices: (answers: CreateAnswers) => Object.keys(availableModules[answers.version]).map((name) => {
				return { name, checked: !!availableModules[answers.version][name].checked };
			})
		}
	];

	console.log(chalk.bold('Lets get started\n'));

	proceedCheck(name)
		.then(() => inquirer.prompt(questions))
		.then((answers) => {
			merge(appDetails, answers);
			console.log(JSON.stringify(appDetails, null, '  '));
		});
};
