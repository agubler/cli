#!/usr/bin/env node
'use strict';

const settings = require('../package.json');
//const program = require('commander');
//

const yargs = require('yargs');
yargs.usage('Usage: $0 [global options] <command> [options]')
	.strict()
	.command(
		'new <appName>',
		'Create a new Dojo 2 application',
		'Usage blah blah',
		(argv) => {
			console.log(argv.appName);
		}
	)
	.help()
	.argv;


// Provide a title to the process in `ps`
process.title = 'dojo-cli';

	// program
	// 	.version(`${settings.version}`)
	// 	.description(`${settings.description}`);
	//
	// program
	// 	.command('new <appName>', 'Create a new Dojo2 App');
	//
	// program
	// 	.command('list', 'List available Dojo2 packages');
	//
	// program.parse(process.argv);
