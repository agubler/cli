#!/usr/bin/env node
'use strict';

let settings = require('./package.json')
let chalk = require('chalk');

// Provide a title to the process in `ps`
process.title = 'dojo-cli'

process.stdout.write(`
  ____        _          ____ _     ___
 |  _ \\  ___ (_) ___    / ___| |   |_ _|
 | | | |/ _ \\| |/ _ \\  | |   | |    | |
 | |_| | (_) | | (_) | | |___| |___ | |
 |____/ \\___// |\\___/   \\____|_____|___|
           |__/

version: ${settings.version}\n\n`);

process.stdout.write(chalk.red(",*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`\n"));
process.stdout.write(chalk.yellow(".,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,\n"));
process.stdout.write(chalk.green("*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^") + "         ,---/V\\\n");
process.stdout.write(chalk.blue("`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.") + "    ~|__(o.o)\n");
process.stdout.write(chalk.magenta("^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'^`*.,*'") + "  UU  UU\n");
