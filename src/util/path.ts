import { existsSync, mkdirsSync } from 'fs-extra';
import * as path from 'path';
import { homedir } from 'os';

const pkgDir = require('pkg-dir');

const basePath: string = pkgDir.sync(__dirname);

type PathId = 'templates'
	| 'config'
	| 'destRoot'
	| 'destSrc'
	| 'temp'
	| 'nodeModules'
	| 'projectCache'
	| 'cliCache';

interface PathMap {
	[ moduleId: string ]: string;
}

const paths: PathMap = {
	templates: path.join(basePath, 'templates'),
	config: path.join(basePath, 'config'),
	destRoot: process.cwd(),
	destSrc: path.join(process.cwd(), 'src'),
	temp: path.join(process.cwd(), '_temp'),
	nodeModules: path.join(process.cwd(), 'node_modules'),
	projectCache: path.join(process.cwd(), '.dojo/cache'),
	cliCache: path.join(homedir(), '.dojo-cli/cache')
};

// console.dir(paths);

export const get = function (base: PathId , ...pathStr: string[]): string {
	// console.log(`PATH.GET: Get path called with base: ${base}, pathStr: ${pathStr}`);

	const resolvedPath = path.join(paths[base], ...pathStr);
	const resolvedDir = path.dirname(resolvedPath);

	if (!existsSync(resolvedDir)) {
		// console.log(`PATH.GET: making folder ${resolvedDir}`);
		mkdirsSync(resolvedDir);
	}

	// console.log(`PATH.GET: resolvedPath: ${resolvedPath}, resolvedDir: ${resolvedDir}`);
	return resolvedPath;
};
