// import * as mkdirp from 'mkdirp';
import * as chalk from 'chalk';
import { createReadStream, existsSync, createWriteStream, copySync } from 'fs-extra';
import { get as getPath, createParentDir } from './path';
import { createUnzip } from 'zlib';
import { dirname, join as joinPath, basename } from 'path';
import { Extract } from 'tar';
import { log } from 'winston';
import * as got from 'got';

const execa = require('execa');
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
	log('info', 'got here');
	createParentDir(destPath);

	log('info', chalk.green('Downloading: ') + githubArchivePath);

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
	log('info', chalk.green('Unpacking: ') + `${archivePath} to ${dirname(archivePath)}`);

	return new Promise<void>((resolve, reject) => {
		readStream
			.pipe(createUnzip())
			.pipe(Extract({ path: dirname(archivePath)}))
			.on('close', resolve)
			.on('error', reject);
	});
}

async function npmInstall(path: string, packages: string[] = []) {
	// return;
	log('info', `running npm install... ${packages}`);
	return execa('npm', ['install', ...packages], { cwd: path }).then((result: any) => {
		log('verbose', result);
		log('info', 'npm install complete');
	});
}

async function npmPack(path: string) {
	// return;
	log('info', 'running npm pack...');
	return execa('npm', ['pack'], { cwd: path }).then((result: any) => {
		log('verbose', result);
		log('info', 'npm pack complete');
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

export async function get({owner, repo, commit}: GitInstallableDetails, save?: boolean): Promise<string> {
	// 1. Get github zip file
	const [ md5, filePath ] = await getGithubZipFile({owner, repo, commit});

	log('verbose', `gitModule:get MD5: ${md5} Filepath: ${filePath}`);
	// 2. Get path to cache location (using md5)
	const cachePath = getPath('cliCache', md5);
	let cachedFilePath: string;

	if (!existsSync(cachePath)) {
		// 3. If is not cached, build and place in cache
		await unpackZipFile(filePath);
		const builtModule = await build(joinPath(dirname(filePath), `${repo}-${commit}`));
		log('info', `Built module is ${builtModule}`);

		cachedFilePath = joinPath(cachePath, basename(builtModule));
		createParentDir(cachedFilePath);
		copySync(builtModule, cachedFilePath);
	} else {
		// 4. If cached, return location
		log('verbose', 'Module exists in cli cache');
	}

	// 5. Copy module to local cache - .dojo/<repo>/<commit>/<package>.tgz
	// 6. Put ref in package.json - so it can be found again via .dojo\

	// TODO: project cache path?
	return cachedFilePath;
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
