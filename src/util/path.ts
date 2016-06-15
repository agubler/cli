import { existsSync, mkdirsSync } from 'fs-extra';
import * as path from 'path';
import { homedir } from 'os';
import { log } from 'winston';

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

log('verbose', 'paths:init - ' + JSON.stringify(paths));

export function get(base: PathId, ...pathStr: string[]): string {
	const resolvedPath = path.join(paths[base], ...pathStr);
	return resolvedPath;
};

export function createParentDir(resolvedPath: string) {
	log('verbose', `path:createParentDir - called with ${resolvedPath}`);
	const resolvedDir = path.dirname(resolvedPath);
	if (!existsSync(resolvedDir)) {
		log('verbose', `path:get - making folder ${resolvedDir}`);
		mkdirsSync(resolvedDir);
	}
}
