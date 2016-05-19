import * as mkdirp from 'mkdirp';
import * as chalk from 'chalk';
import { createReadStream } from 'fs';
import Promise from 'dojo-core/Promise';
import { temp } from '../util/path';

const got = require('got');
const unzip = require('unzip');
const fstream = require('fstream');
const ProgressBar = require('progress');

export default (owner: string, repo: string, commit: string = 'master'): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		const gitPath = `https://github.com/${owner}/${repo}/archive/${commit}.zip`;
		const destPath = temp(`github/${owner}/`);
		const archivePath = destPath + '_archive/';
		const destArchive = archivePath + `${repo}-${commit}.zip`;
		let bar: any;

		mkdirp.sync(destPath);
		mkdirp.sync(archivePath);

		got.stream(gitPath)
			.on('response', function(res: any) {
				bar = new ProgressBar(chalk.yellow('Downloading: ') + `${gitPath} [:bar] :percent :etas`, {
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

				readStream
					.pipe(unzip.Parse())
					.pipe(writeStream)
					.on('close', () => {
						resolve();
					});
			});
	});
};
