import * as mkdirp from 'mkdirp';
import { existsSync } from 'fs';

const path = {
	templates: __dirname + '/../templates/',
	destinationRoot: process.cwd() + '/',
	destinationSrc: process.cwd() + '/src/',
	temp: process.cwd() + '/_temp/'
};

export const template = function (fileName: string = ''): string {
	return path.templates + fileName;
};

export const destinationRoot = function (fileName: string = ''): string {
	return path.destinationRoot + fileName;
};

export const destinationSrc = function (fileName: string = ''): string {
	!existsSync(path.destinationSrc) &&  mkdirp.sync(path.destinationSrc);
	return path.destinationSrc + fileName;
};

export const temp = function (fileName: string = ''): string {
	!existsSync(path.temp) && mkdirp.sync(path.temp);
	return path.temp + fileName;
};
