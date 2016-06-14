// import * as mkdirp from 'mkdirp';
import * as chalk from 'chalk';
import { createReadStream, existsSync, createWriteStream, mkdirsSync, copySync } from 'fs-extra';
import { get as getPath } from './path';
import { createUnzip } from 'zlib';
import { dirname, join as joinPath } from 'path';
import { Extract } from 'tar';
import * as winston from 'winston';
const got = require('got');

// const unzip = require('unzip');
// const fstream = require('fstream');
// const spawn = require('cross-spawn');
const execa = require('execa');
// const md5 = require('md5');
const { createHash } = require('crypto');

export interface GitInstallableDetails {
	owner: string;
	repo: string;
	commit: string;
}

async function getGithubZipFile({owner, repo, commit}: GitInstallableDetails): Promise<[string, string]> {
	// get zip file to projectTemp/owner-repo-hash
	const githubArchivePath = `https://codeload.github.com/${owner}/${repo}/tar.gz/${commit}`;
	const destPath = getPath('temp', owner, `${repo}-${commit}.tar.gz`);

	mkdirsSync(dirname(destPath));

	winston.info(chalk.green('Downloading: ') + githubArchivePath);

	const stream = got.stream(githubArchivePath);

	return Promise.all([
		streamHash(stream),
		streamWrite(stream, destPath)
	]);
}

async function streamWrite(stream: any, destination: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		// const destFileName = destination + '/package.tar.gz';
		stream.pipe(createWriteStream(destination))
			.on('close', () => { resolve(destination); })
			.on('error', reject);
	});
}

async function streamHash(stream: any): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const hash = createHash('md5');

		hash.on('data', (chunk: any) => {
			resolve(chunk.toString('hex'));
		});
		hash.on('error', reject);

		stream.pipe(hash);
	});
}

async function unpackZipFile(archivePath: string) {
	let readStream = createReadStream(archivePath);
	winston.info(chalk.green('Unpacking: ') + `${archivePath} to ${dirname(archivePath)}`);

	return new Promise<void>((resolve, reject) => {
		readStream
			.pipe(createUnzip())
			.pipe(Extract({ path: dirname(archivePath)}))
			.on('close', resolve)
			.on('error', reject);
	});
}

async function npmInstall(path: string, packages: string[] = []) {
	winston.info(`running npm install... ${packages}`);
	return execa('npm', ['install', ...packages], { cwd: path }).then((result: any) => {
		winston.log('verbose', result);
		winston.info('npm install complete');
	});
}

async function npmPack(path: string) {
	winston.info('running npm pack...');
	return execa('npm', ['pack'], { cwd: path }).then((result: any) => {
		winston.log('verbose', result);
		winston.info('npm pack complete');
	});
}

export async function build(path: string) {
	const peerPackages: string[] = [];
	const {peerDependencies, name, version} = require(joinPath(path, 'package.json'));

	Object.keys(peerDependencies).forEach(moduleId => {
		peerPackages.push(`${moduleId}@${peerDependencies[moduleId]}`);
	});

	await npmInstall(path, peerPackages);
	await npmInstall(path);
	await npmPack(path);

	return `${path}/${name}-${version}.tgz`;
};

export async function get({owner, repo, commit}: GitInstallableDetails): Promise<string> {
	const [ md5, filePath ] = await getGithubZipFile({owner, repo, commit});

	winston.info(`MD5: ${md5} Filepath: ${filePath}`);
	const cachePath = getPath('cliCache', md5);

	if (!existsSync(cachePath)) {
		await unpackZipFile(filePath);
		const builtModule = await build(joinPath(dirname(filePath), `${repo}-${commit}`));
		winston.info(`Built module is ${builtModule}`);

		mkdirsSync(cachePath);
		copySync(builtModule, cachePath);
	} else {
		winston.info('Already exists');
	}

	// mkdirsSync(destPath);
	// mkdirsSync(archivePath);

	// await getGithubZipFile(githubArchivePath, destArchivePath);
	// await unpackZipFile(destArchivePath, destPath);

	// return destFolderName;
	return 'badger';
};

const gitReg = /github:(\w*)\/(\w*)#?(\w*)?/;

export function isGitInstallable(installable: string): boolean {
	return gitReg.test(installable);
}

export function getInstallableDetails(installable: string): GitInstallableDetails {
	const [, owner, repo, commit] = installable.match(gitReg);
	return {
		owner,
		repo,
		commit: commit || 'master'
	};
}
