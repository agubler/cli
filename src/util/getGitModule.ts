import * as mkdirp from 'mkdirp';
import * as chalk from 'chalk';
import { createReadStream } from 'fs';
import Promise from 'dojo-core/Promise';
import { temp } from '../util/path';

const got = require('got');
const unzip = require('unzip');
const fstream = require('fstream');

export default (owner: string, repo: string, commit: string = 'master'): Promise<string> => {
	return new Promise<string>((resolve, reject) => {
		const gitPath = `https://github.com/${owner}/${repo}/archive/${commit}.zip`;
		const destPath = temp(`github/${owner}/`);
		const archivePath = destPath + '_archive/';
		const destArchive = archivePath + `${repo}-${commit}.zip`;
		const destFolderName = destPath + `${repo}-${commit}`;

		mkdirp.sync(destPath);
		mkdirp.sync(archivePath);

		console.log(chalk.yellow('Downloading: ') + gitPath);
		got.stream(gitPath)
			.pipe(fstream.Writer(destArchive))
			.on('close', () => {
				let readStream = createReadStream(destArchive);
				let writeStream = fstream.Writer(destPath);

				readStream
					.pipe(unzip.Parse())
					.pipe(writeStream)
					.on('close', () => {
						console.log(chalk.green('Written & Unpacked to: ') + destFolderName);
						resolve(destFolderName);
					});
			});
	});
};
