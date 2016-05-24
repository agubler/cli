import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import Promise from 'dojo-core/Promise';
import { readdirSync } from 'fs';
import { render } from  '../util/template';
import { template, destinationRoot, destinationSrc } from '../util/path';
import { get as getGitModule, build as buildGitModule } from '../util/gitModule';
// import { satisfies } from 'semver';

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
	peerDependencies?: ModuleConfigMap;
}

interface ModuleConfigMap {
	[ moduleId: string ]: ModuleConfig;
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
		render(template('_editorconfig'), destinationRoot('.editorconfig'), appConfig),
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

	// Upgrade peerDependencies to top-level
	for (let moduleId in modules) {
		const module = modules[moduleId];
		const modulePeerDeps = module.peerDependencies;

		if (modulePeerDeps) {
			const currentDependencies = Object.keys(modules);
			for (let peerDepId in modulePeerDeps) {
				const peerDep = modulePeerDeps[peerDepId];
				if (currentDependencies.indexOf(peerDepId) > -1) {
					if (modules[peerDepId].version !== peerDep.version || gitReg.test(peerDep.version)) {
						console.log(chalk.red('Dependency Error: ') + `Module: ${moduleId} requires PeerDependency of ${peerDepId} but conflict found`);
					}
				} else {
					console.log(chalk.green('Dependency Added: ') + `Module: ${moduleId} requires PeerDependency of ${peerDepId}`);
					modules[peerDepId] = peerDep;
				}
			}
		}
	}

	appConfig = {
		name: answers.name,
		description: answers.description,
		modules
	};
};

async function getGithubModules() {
	if (skip.git) { return; }

	console.log(chalk.bold('\n-- Downloading GitHub Modules --'));

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

	if (!skip.force) {
		checkForEmptyDir(destinationRoot(), true);
	}

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
