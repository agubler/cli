// import * as mkdirp from 'mkdirp';
import * as chalk from 'chalk';
import { /* createReadStream, */ /* existsSync, */ createWriteStream } from 'fs';
import { get as getPath } from '../util/path';

const got = require('got');
const mkdirp = require('mkdirp');

// const unzip = require('unzip');
// const fstream = require('fstream');
const spawn = require('cross-spawn');
// const md5 = require('md5');
const { createHash } = require('crypto');

interface ModuleConfig {
	version: string;
	buildFromSource?: boolean;
	peerDependencies?: ModuleConfigMap;
}

interface ModuleConfigMap {
	[ moduleId: string ]: ModuleConfig;
}

async function getGithubZipFile(owner: string, repo: string, commit: string = 'master'): Promise<[string, string]> {
	// get zip file to projectTemp/owner-repo-hash
	const githubArchivePath = `https://codeload.github.com/${owner}/${repo}/tar.gz/${commit}`;
	const destPath = getPath('temp', `${owner}-${repo}-${commit}`);

	mkdirp.sync(destPath);

	console.log(chalk.green('Downloading: ') + githubArchivePath);

	const stream = got.stream('https://codeload.github.com/dojo/core/tar.gz/master');

	return Promise.all([
		streamHash(stream),
		streamWrite(stream, destPath)
	]);
}

async function streamWrite(stream: any, destination: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const destFileName = destination + '/package.tar.gz';
		stream.pipe(createWriteStream(destFileName))
			.on('close', () => { resolve(destFileName); })
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

// async function unpackZipFile(archivePath: string, unpackPath: string) {
// 	let readStream = createReadStream(archivePath);
// 	let writeStream = fstream.Writer(unpackPath);

// 	console.log(chalk.green('Unpacking: ') + archivePath);
// 	return new Promise<void>((resolve, reject) => {
// 		readStream
// 			.pipe(unzip.Parse())
// 			.pipe(writeStream)
// 			.on('close', resolve)
// 			.on('error', reject);
// 	});
// }

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

	const packageDetails = require(path + '/package.json');

	return `${path}/${packageDetails.name}-${packageDetails.version}.tgz`;
};

export async function get(owner: string, repo: string, commit?: string): Promise<string> {
	// const githubArchivePath = `https://github.com/${owner}/${repo}/archive/${commit}.zip`;
	// const destPath = getPath('temp', `github/${owner}/`);
	// const archivePath = destPath + '_archive/';
	// const destArchivePath = archivePath + `${repo}-${commit}.zip`;
	// const destFolderName = destPath + `${repo}-${commit}`;

	// get zip file to projectTemp/owner-repo-hash
	// get md5 of zip
	// if built version in CLI cache
		// return path to cache/md5
	// else
		// build and move to cache/md5
		// return path to cache/md5

	const [ md5, filePath ] = await getGithubZipFile(owner, repo, commit);

	console.log(`MD5: ${md5} Filepath: ${filePath}`);
	console.log('Get Path: ' + getPath('cliCache', md5));

	// if (existsSync(getPath('cliCache', md5))) {
	// 	console.log('File is already cached');
	// } else {
	// 	console.log('File is NOT cached');
	// }

	// mkdirp.sync(destPath);
	// mkdirp.sync(archivePath);

	// await getGithubZipFile(githubArchivePath, destArchivePath);
	// await unpackZipFile(destArchivePath, destPath);

	// return destFolderName;
	return 'badger';
};
