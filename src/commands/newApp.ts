import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import { merge } from 'lodash';
import { readdirSync } from 'fs';
import { render } from  '../util/template';
import { template, destination } from '../util/path';

// Not a TS module
const availableModules = require('../config/availableModules.json');

interface ProceedAnswers extends inquirer.Answers {
	proceed: boolean;
}

interface CreateAnswers extends inquirer.Answers {
	version: string;
	modules: string[];
}

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

const renderFiles = function (appDetails: Object) {
	render(template('_package.json'), destination('package.json'), appDetails);
};

export const createNew = (name: string) => {
	checkForAppName(name);
	checkForEmptyDir(destination(), true);

	let appDetails = { name };
	let questions: inquirer.Questions = [
		{
			type: 'list',
			name: 'version',
			message: 'What configuration of Dojo modules would you like?',
			choices: (): inquirer.ChoiceType[] => {
				return Object.keys(availableModules).map((key) => {
					let config = availableModules[key];
					return { name: config.name, value: key };
				});
			},
			default: 0
		},
		{
			type: 'checkbox',
			name: 'modules',
			message: 'Which modules would you like to use?',
			choices: (answers: CreateAnswers): inquirer.ChoiceType[] => {
				let chosenModules = availableModules[answers.version].modules;
				return Object.keys(chosenModules).map((name) => {
					return { name, checked: !!chosenModules[name].checked };
				});
			}
		}
	];

	console.log(chalk.bold('Lets get started\n'));

	proceedCheck(name)
		.then(() => inquirer.prompt(questions))
		.then((answers) => {
			merge(appDetails, answers);
			console.log(JSON.stringify(appDetails, null, '  '));
			return appDetails;
		})
		.then(renderFiles);
};
