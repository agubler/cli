import * as mkdirp from 'mkdirp';
import { existsSync } from 'fs';
import * as path from 'path';

const findCacheDir = require('find-cache-dir');
const pkgDir = require('pkg-dir');

const basePath: string = pkgDir.sync(__dirname);
const cacheDir: string = findCacheDir({name: 'dojo-cli', create: true, cwd: '../..'});

interface PathMap {
	[ moduleId: string ]: string;
}

const paths: PathMap = {
	templates: path.join(basePath, 'templates'),
	destRoot: process.cwd(),
	destSrc: path.join(process.cwd(), 'src'),
	temp: path.join(process.cwd(), '_temp'),
	nodeModules: path.join(process.cwd(), 'node_modules'),
	projectCache: path.join(process.cwd(), '.dojo/cache'),
	cliCache: cacheDir
};

console.dir(paths);

export const get = function (base: string, pathStr: string): string {
	console.log(`Get path called with base: ${base}, pathStr: ${pathStr}`);

	const resolvedPath = path.join(paths[base], pathStr);
	const resolvedDir = path.dirname(resolvedPath);

	console.log(`resolvedPath: ${resolvedPath}, resolvedDir: ${resolvedDir}`);
	if (!existsSync(resolvedDir)) {
		console.log('making folder');
		mkdirp.sync(resolvedDir);
	}

	console.log(`GOT PATH: ${resolvedPath}`);
	return resolvedPath;
};
