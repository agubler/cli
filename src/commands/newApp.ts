import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import { readdirSync } from 'fs';
import { render } from  '../util/template';
import { template, destinationRoot, destinationSrc } from '../util/path';
import { get as getGitModule, build as buildGitModule } from '../util/gitModule';

// Not a TS module
const availableModules = require('../config/availableModules.json');
const spawn = require('cross-spawn');

interface AppConfig {
	name: string;
	modules: ModuleConfigMap;
	description: string;
}

interface CreateAnswers extends inquirer.Answers {
	version: string;
	modules: string[];
	name: string;
	description: string;
}

interface ModuleConfig {
	version: string;
	buildFromSource?: boolean;
	peerDependencies?: ModuleConfigMap;
}

interface ModuleConfigMap {
	[ moduleId: string ]: ModuleConfig;
}

interface ProceedAnswers extends inquirer.Answers {
	proceed: boolean;
}

interface SkipConfig {
	npm: boolean;
	git: boolean;
	render: boolean;
	force: boolean;
}

let appConfig: AppConfig;
let skip: SkipConfig;

const gitReg = /github:(\w*)\/(\w*)#?(\w*)?/;

function checkForAppName(name: any): void {
	if (!name || name.length === 0) {
		console.error(chalk.red('Error: ') + 'App Name is Required');
		process.exit(1);
	}
};

function checkForEmptyDir(dirPath: string, exit: boolean = false): void | boolean {
	const folderContents = readdirSync(dirPath);
	const isEmpty = folderContents.length === 0;

	if (!isEmpty && exit) {
		console.error(chalk.red('Error: ') + 'Directory is not empty');
		process.exit(1);
	} else {
		return isEmpty;
	}
};

async function proceedCheck(name: string) {
	let response = await inquirer.prompt([{
		type: 'confirm',
		name: 'proceed',
		message: `Do you wish to proceed with creating ${name}?`,
		default: true
	}]);

	if (!(<ProceedAnswers> response).proceed) {
		console.error(chalk.red('\nExiting: ') + 'User chose to exit');
		process.exit(1);
	}
}

async function renderFiles() {
	if (skip.render) { return; }

	console.log(chalk.bold('-- Rendering Files --'));

	await render(template('_package.json'), destinationRoot('package.json'), appConfig);
	await render(template('_Gruntfile.js'), destinationRoot('Gruntfile.js'), appConfig);
	await render(template('tsconfig.json'), destinationRoot('tsconfig.json'), appConfig);
	await render(template('tslint.json'), destinationRoot('tslint.json'), appConfig);
	await render(template('_editorconfig'), destinationRoot('.editorconfig'), appConfig);
	await render(template('index.html'), destinationSrc('index.html'), appConfig);
	await render(template('index.ts'), destinationSrc('index.ts'), appConfig);
	await render(template('app.ts'), destinationSrc('app.ts'), appConfig);
	await render(template('app.styl'), destinationSrc('app.styl'), appConfig);
};

function getSelectedModuleConfig(selectedModuleIds: string[], availableModuleConfig: ModuleConfigMap): ModuleConfigMap {
	let modules: ModuleConfigMap = {};

	// Get just the module config we care about
	Object.keys(availableModuleConfig).forEach((moduleId) => {
		if (selectedModuleIds.indexOf(moduleId) > -1) {
			modules[moduleId] = availableModuleConfig[moduleId];
		}
	});

	return modules;
}

function getPeerDependencies(modules: ModuleConfigMap): ModuleConfigMap {
	const returnModules = Object.assign({}, modules);

	for (let moduleId in returnModules) {
		const module = returnModules[moduleId];
		const modulePeerDeps = module.peerDependencies;

		if (modulePeerDeps) {
			const currentDependencies = Object.keys(returnModules);
			for (let peerDepId in modulePeerDeps) {
				const peerDep = modulePeerDeps[peerDepId];
				if (currentDependencies.indexOf(peerDepId) > -1) {
					if (returnModules[peerDepId].version !== peerDep.version || gitReg.test(peerDep.version)) {
						console.log(chalk.red('Dependency Error: ') + `Module: ${moduleId} requires PeerDependency of ${peerDepId} but conflict found`);
					}
				} else {
					console.log(chalk.green('Dependency Added: ') + `Module: ${moduleId} requires PeerDependency of ${peerDepId}`);
					returnModules[peerDepId] = peerDep;
				}
			}
		}
	}

	return returnModules;
}

function createAppConfig(answers: CreateAnswers) {
	console.log(chalk.bold('-- Creating AppConfig From Answers --'));
	let selectedModuleConfig: ModuleConfigMap = {};
	const allVersionedModules: ModuleConfigMap = availableModules[answers.version].modules;

	selectedModuleConfig = getSelectedModuleConfig(answers.modules, allVersionedModules);
	const fullModuleConfig = getPeerDependencies(selectedModuleConfig);

	appConfig = {
		name: answers.name,
		description: answers.description,
		modules: fullModuleConfig
	};
};

async function getGithubModules() {
	if (skip.git) { return; }

	console.log(chalk.bold('-- Downloading GitHub Modules --'));

	const moduleIds = Object.keys(appConfig.modules);

	for (let i = 0; i < moduleIds.length; i += 1) {
		let moduleId = moduleIds[i];
		let moduleConfig = appConfig.modules[moduleId];
		const match = moduleConfig.version.match(gitReg);
		if (match) {
			const path = await getGitModule(match[1], match[2], match[3]);
			await buildGitModule(path, moduleConfig.peerDependencies);
		}
	}
};

async function installDependencies() {
	if (skip.npm) { return; }

	console.log(chalk.bold('-- Running npm install --'));

	return new Promise((resolve, reject) => {
		spawn('npm', ['install'], { stdio: 'inherit' })
			.on('close', resolve)
			.on('error', (err: Error) => {
				console.log('ERROR: ' + err);
				reject();
			});
	});
}

const questions: inquirer.Questions = [
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

export async function createNew(name: string, skipConfig: SkipConfig) {
	skip = skipConfig;

	checkForAppName(name);

	if (!skip.force) {
		checkForEmptyDir(destinationRoot(), true);
	}

	console.log(chalk.bold('-- Lets get started --\n'));

	await proceedCheck(name);
	let answers = await inquirer.prompt(questions);

	(<CreateAnswers> answers).name = name;
	console.log(JSON.stringify(answers, null, '  '));

	await createAppConfig(<CreateAnswers> answers);

	console.log('APP CONFIG: ');
	console.log(JSON.stringify(appConfig, null, '  '));

	await getGithubModules();
	await renderFiles();
	await installDependencies();

	console.log(chalk.green.bold('\n ✔ DONE'));
};
