import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import { readdirSync, createReadStream, createWriteStream } from 'fs';
import { render } from  '../util/template';
import { get as getPath } from '../util/path';
import { get as getGitModule, build as buildGitModule } from '../util/gitModule';
import * as mkdirp from 'mkdirp';

// Not a TS module
const availableModules = require('../config/availableModules.json');
const spawn = require('cross-spawn');

interface AppConfig {
	name: string;
	modules: ModuleConfigMap;
	description: string;
	typings: TypingsConfigMap;
	globalTypings: TypingsConfigMap;
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
	typings?: TypingsConfigMap;
	globalTypings?: TypingsConfigMap;
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

interface TypingsConfigMap {
	[ moduleId: string ]: string;
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

	await render(getPath('template', '_package.json'), getPath('destRoot', 'package.json'), appConfig);
	await render(getPath('template', '_Gruntfile.js'), getPath('destRoot', 'Gruntfile.js'), appConfig);
	await render(getPath('template', '_typings.json'), getPath('destRoot', 'typings.json'), appConfig);
	await render(getPath('template', 'tsconfig.json'), getPath('destRoot', 'tsconfig.json'), appConfig);
	await render(getPath('template', 'tslint.json'), getPath('destRoot', 'tslint.json'), appConfig);
	await render(getPath('template', '_editorconfig'), getPath('destRoot', '.editorconfig'), appConfig);
	await render(getPath('template', 'index.html'), getPath('destSrc', 'index.html'), appConfig);
	await render(getPath('template', 'index.ts'), getPath('destSrc', 'index.ts'), appConfig);
	await render(getPath('template', 'app.ts'), getPath('destSrc', 'app.ts'), appConfig);
	await render(getPath('template', 'app.styl'), getPath('destSrc', 'app.styl'), appConfig);
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

function mergeTypings(moduleId: string, source: TypingsConfigMap, destination: TypingsConfigMap) {
	for (let typingId in source) {
		const typingVersion = source[typingId];
		if (!destination[typingId]) {
			destination[typingId] = typingVersion;
		} else if (destination[typingId] !== typingVersion) {
			console.log(chalk.yellow('Typing Dependency Warning: ') + `Module: ${moduleId} requires typing of ${typingId}:${typingVersion} but conflict found`);
		}
	}
}

function getTypings(modules: ModuleConfigMap): [TypingsConfigMap, TypingsConfigMap] {
	const typings: TypingsConfigMap = {};
	const globalTypings: TypingsConfigMap = {};

	for (let moduleId in modules) {
		const module = modules[moduleId];
		module.typings && mergeTypings(moduleId, module.typings, typings);
		module.globalTypings && mergeTypings(moduleId, module.globalTypings, globalTypings);
	}

	return [typings, globalTypings];
}

function createAppConfig(answers: CreateAnswers) {
	console.log(chalk.bold('-- Creating AppConfig From Answers --'));

	const allVersionedModules: ModuleConfigMap = availableModules[answers.version].modules;
	const selectedModuleConfig = getSelectedModuleConfig(answers.modules, allVersionedModules);
	const allDependencies = getPeerDependencies(selectedModuleConfig);
	const [typings, globalTypings] = getTypings(allDependencies);

	appConfig = {
		name: answers.name,
		description: answers.description,
		modules: allDependencies,
		typings,
		globalTypings
	};
};

async function copyFile(source: string, destination: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		createReadStream(source)
			.pipe(createWriteStream(destination))
			.on('close', resolve)
			.on('error', reject);
	});
}

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

			const builtFile = await buildGitModule(path, moduleConfig.peerDependencies);

			const cachePath = getPath('cliCache', `${match[1]}/${match[2]}/${match[3]}`);
			mkdirp.sync(cachePath);
			await copyFile(builtFile, cachePath);

			console.log('BUILT FILE: ' + builtFile);
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
		checkForEmptyDir(getPath('destRoot', ''), true);
	}

	console.log(chalk.bold('-- Lets get started --\n'));

	await proceedCheck(name);

	let answers = await inquirer.prompt(questions);
	(<CreateAnswers> answers).name = name;

	await createAppConfig(<CreateAnswers> answers);
	await getGithubModules();
	await renderFiles();
	await installDependencies();

	console.log(chalk.green.bold('\n ✔ DONE'));
};
