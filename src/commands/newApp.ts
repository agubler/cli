import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import Promise from 'dojo-core/Promise';
import { readdirSync } from 'fs';
import { render } from  '../util/template';
import { template, destinationRoot, destinationSrc, nodeModules } from '../util/path';
import getGitModule from '../util/getGitModule';

// Not a TS module
const availableModules = require('../config/availableModules.json');
const spawn = require('cross-spawn');
const ncp = require('ncp').ncp;

ncp.limit = 16;

interface ProceedAnswers extends inquirer.Answers {
	proceed: boolean;
}

interface CreateAnswers extends inquirer.Answers {
	version: string;
	modules: string[];
	name: string;
	description: string;
}

interface AppConfig {
	name: string;
	modules: ModuleConfigMap;
	description: string;
}

interface ModuleConfig {
	version: string;
	buildFromSource?: boolean;
	peerDependencies: Object;
}

interface ModuleConfigMap {
	[ moduleId: string ]: ModuleConfig;
}

interface SkipConfig {
	npm: boolean;
	git: boolean;
	render: boolean;
}

let appConfig: AppConfig;
let skip: SkipConfig;

const gitReg = /github:(\w*)\/(\w*)#?(\w*)?/;

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

const renderFiles = () => {
	if (skip.render) { return; }

	console.log(chalk.bold('\n-- Rendering Files --'));

	return Promise.all([
		render(template('_package.json'), destinationRoot('package.json'), appConfig),
		render(template('_Gruntfile.js'), destinationRoot('Gruntfile.js'), appConfig),
		render(template('tsconfig.json'), destinationRoot('tsconfig.json'), appConfig),
		render(template('tslint.json'), destinationRoot('tslint.json'), appConfig),
		render(template('.editorconfig'), destinationRoot('.editorconfig'), appConfig),
		render(template('index.html'), destinationSrc('index.html'), appConfig),
		render(template('index.ts'), destinationSrc('index.ts'), appConfig),
		render(template('app.ts'), destinationSrc('app.ts'), appConfig),
		render(template('app.styl'), destinationSrc('app.styl'), appConfig)
	]);
};

const createAppConfig = (answers: CreateAnswers) => {
	console.log(chalk.bold('\n-- Creating AppConfig From Answers --'));
	let modules: ModuleConfigMap = {};
	const allVersionedModules: ModuleConfigMap = availableModules[answers.version].modules;

	// Get just the module config we care about
	Object.keys(allVersionedModules).forEach((moduleId) => {
		if (answers.modules.indexOf(moduleId) > -1) {
			modules[moduleId] = allVersionedModules[moduleId];
		}
	});

	appConfig = {
		name: answers.name,
		description: answers.description,
		modules
	};
};

const getGithubModules = () => {
	if (skip.git) { return; }

	console.log(chalk.bold('\n-- Downloading GitHub Modules --'));
	let getGitPromises: Promise<void>[] = [];

	Object.keys(appConfig.modules).forEach((moduleId) => {
		let moduleConfig = appConfig.modules[moduleId];
		const match = moduleConfig.version.match(gitReg);
		if (match) {
			getGitPromises.push(
				getGitModule(match[1], match[2], match[3]).then((path: string) => {
					return new Promise<void>((resolve, reject) => {
						const nodeModulesDestination = nodeModules(moduleId);
						ncp(path, nodeModulesDestination, function (err: Error) {
							if (err) {
								console.error(err);
								reject();
							}
							console.log(chalk.green('Moved to: ') + nodeModulesDestination);
							resolve();
						});
					});
				})
			);
		}
	});

	return Promise.all(getGitPromises);
};

const installDependencies = () => {
	if (skip.npm) { return; }

	let taskName = chalk.italic('npm install');
	console.log(chalk.bold('\n-- Running ' + taskName));
	let child = spawn('npm', ['install'], { stdio: 'inherit' });
	return child;
};

export const createNew = (name: string, skipConfig: SkipConfig) => {
	skip = skipConfig;

	checkForAppName(name);
	checkForEmptyDir(destinationRoot(), true);

	let questions: inquirer.Questions = [
		{
			type: 'text',
			name: 'description',
			message: 'Enter a brief description of the app you are creating'
		},
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

	console.log(chalk.bold('-- Lets get started --\n'));

	proceedCheck(name)
		.then(() => inquirer.prompt(questions))
		.then((answers: CreateAnswers) => {
			answers.name = name;
			console.log(JSON.stringify(answers, null, '  '));
			return answers;
		})
		.then(createAppConfig)
		.then(getGithubModules)
		.then(renderFiles)
		.then(installDependencies);
};
