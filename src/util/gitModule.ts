import * as mkdirp from 'mkdirp';
import * as chalk from 'chalk';
import { createReadStream } from 'fs';
import Promise from 'dojo-core/Promise';
import { temp } from '../util/path';

const got = require('got');
const unzip = require('unzip');
const fstream = require('fstream');
const spawn = require('cross-spawn');

interface ModuleConfigMap {
	[ moduleId: string ]: ModuleConfig;
}

interface ModuleConfig {
	version: string;
	buildFromSource?: boolean;
	peerDependencies?: ModuleConfigMap;
}

async function getGithubZipFile(githubArchivePath: string, destArchivePath: string) {
	console.log(chalk.yellow('Downloading: ') + githubArchivePath);
	return new Promise<void>((resolve, reject) => {
		got.stream(githubArchivePath)
			.pipe(fstream.Writer(destArchivePath))
			.on('close', resolve)
			.on('error', reject);
	});
}

async function unpackZipFile(archivePath: string, unpackPath: string) {
	let readStream = createReadStream(archivePath);
	let writeStream = fstream.Writer(unpackPath);

	console.log(chalk.yellow('Unpacking: ') + archivePath);
	return new Promise<void>((resolve, reject) => {
		readStream
			.pipe(unzip.Parse())
			.pipe(writeStream)
			.on('close', resolve)
			.on('error', reject);
	});
}

export async function get(owner: string, repo: string, commit: string = 'master'): Promise<string> {
	const githubArchivePath = `https://github.com/${owner}/${repo}/archive/${commit}.zip`;
	const destPath = temp(`github/${owner}/`);
	const archivePath = destPath + '_archive/';
	const destArchivePath = archivePath + `${repo}-${commit}.zip`;
	const destFolderName = destPath + `${repo}-${commit}`;

	mkdirp.sync(destPath);
	mkdirp.sync(archivePath);

	await getGithubZipFile(githubArchivePath, destArchivePath);
	await unpackZipFile(destArchivePath, destPath);

	return destFolderName;
};

async function npmInstallPeers(path: string, npmArguments: string[]) {
	return new Promise((resolve, reject) => {
	spawn('npm', npmArguments, { stdio: 'inherit', cwd: path })
			.on('close', resolve)
			.on('error', reject);
	});
}

async function npmInstall(path: string) {
	return new Promise((resolve, reject) => {
		spawn('npm', ['-s', 'install'], { stdio: 'inherit', cwd: path })
			.on('close', resolve)
			.on('error', reject);
	});
}

async function npmPack(path: string) {
	return new Promise((resolve, reject) => {
		spawn('npm', ['-s', 'pack'], { stdio: 'inherit', cwd: path })
			.on('close', resolve)
			.on('error', reject);
	});
}

export async function build(path: string, peerDependencies: ModuleConfigMap) {
	const peerInstallArgs = ['-s', 'install'];
	Object.keys(peerDependencies).forEach(moduleId => {
		peerInstallArgs.push(`${moduleId}@${peerDependencies[moduleId].version}`);
	});

	await npmInstallPeers(path, peerInstallArgs);
	await npmInstall(path);
	await npmPack(path);
};
