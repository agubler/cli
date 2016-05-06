#!/usr/bin/env node
'use strict';

const settings = require('./package.json');
const program = require('commander');


// Provide a title to the process in `ps`
process.title = 'dojo-cli';

program
	.version(`${settings.version}`)
	.description(`${settings.description}`);

program
	.command('new <appName>', 'Create a new Dojo2 App');

program
	.command('list', 'List available Dojo2 packages');

program.parse(process.argv);
