import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import Promise from 'dojo-core/Promise';
import * as mkdirp from 'mkdirp';
import { readdirSync, createReadStream } from 'fs';
import * as got from 'got';
import { render } from  '../util/template';
import { template, destination } from '../util/path';

// Not a TS module
const availableModules = require('../config/availableModules.json');
const unzip = require('unzip');
const fstream = require('fstream');
const ProgressBar = require('progress');

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
	let getGitPromises: Promise<void>[] = [];

	Object.keys(appConfig.modules).forEach((moduleId) => {
		let moduleConfig = appConfig.modules[moduleId];
		const match = moduleConfig.version.match(gitReg);
		if (match) {
			getGitPromises.push(getGitModule(match[1], match[2], match[3]));
		}
	});

	return Promise.all(getGitPromises);
};

const getGitModule = (owner: string, repo: string, commit: string = 'master'): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		const gitPath = `https://github.com/${owner}/${repo}/archive/${commit}.zip`;
		const destPath = destination(`_temp/github/${owner}`);
		const destArchive = destPath + `archives/${repo}-${commit}.zip`;
		let bar: any;

		// console.log(chalk.yellow('Info: ') + `Getting ${gitPath}`);

		mkdirp.sync(destPath);

		got.stream(gitPath)
			.on('response', function(res: any) {
				bar = new ProgressBar(`downloading ${gitPath} [:bar] :percent :etas`, {
					complete: '=',
					incomplete: ' ',
					width: 40,
					total: parseInt(res.headers['content-length'], 10)
				});
			})
			.on('data', function (chunk: any) {
				bar.tick(chunk.length);
			})
			.pipe(fstream.Writer(destArchive))
			.on('close', () => {
				let readStream = createReadStream(destArchive);
				let writeStream = fstream.Writer(destPath);

				console.log(`Unpacking ${destArchive}`);

				readStream
					.pipe(unzip.Parse())
					.pipe(writeStream);
			});

			// .pipe(unzip.Parse())
			// .pipe(fstream.Writer(destPath));

			// .pipe(unzip.Extract({ path: destPath }))
			// .on('close', () => {
			// 	console.log(chalk.yellow('Info: ') + `Written ${destPath}`);
			// 	resolve();
			// });
	});
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
