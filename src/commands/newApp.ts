import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import Promise from 'dojo-core/Promise';
// import request from 'dojo-core/request';
// import * as mkdirp from 'mkdirp';
import { readdirSync, createWriteStream } from 'fs';
import * as got from 'got';
import { render } from  '../util/template';
import { template, destination } from '../util/path';

interface ProceedAnswers extends inquirer.Answers {
	proceed: boolean;
}

interface CreateAnswers extends inquirer.Answers {
	version: string;
	modules: string[];
	name: string;
}

interface AppConfig {
	name: string;
	modules: ModuleConfigMap;
}

interface ModuleConfig {
	version: string;
	buildFromSource?: boolean;
	peerDependencies: Object;
}

interface ModuleConfigMap {
	[ moduleId: string ]: ModuleConfig;
}

// Not a TS module
const availableModules = require('../config/availableModules.json');
let appConfig: AppConfig;
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
	console.log(chalk.bold('\n-- Rendering Files --'));

	return Promise.all([
		render(template('_package.json'), destination('package.json'), appConfig)
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
		modules
	};
};

const getGithubModules = () => {
	console.log(chalk.bold('\n-- Finding GitHub Modules --'));

	Object.keys(appConfig.modules).forEach((moduleId) => {
		let moduleConfig = appConfig.modules[moduleId];
		const match = moduleConfig.version.match(gitReg);
		if (match) {
			getGitModule(match[1], match[2], match[3]);
		}
	});
};

const getGitModule = (owner: string, repo: string, commit?: string) => {
	console.log(chalk.yellow('Info: ') + `Owner: ${owner}, Repo: ${repo}, Commit: ${commit}`);
	// https://github.com/dojo/loader/archive/master.zip

	got.stream('todomvc.com').pipe(createWriteStream('index.html'));
	// request('http://google.com/doodle.png').pipe(fs.createWriteStream('doodle.png'))
};

export const createNew = (name: string) => {
	checkForAppName(name);
	checkForEmptyDir(destination(), true);

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
		.then(renderFiles);
};
