import * as yargs from 'yargs';
import { createNew } from '../commands/newApp';
import { install } from '../commands/install';
import * as winston from 'winston';

interface VerboseOptions extends yargs.Argv {
	verbose?: boolean;
}

interface CliOptions extends VerboseOptions {
	skipNpm?: boolean;
	skipGit?: boolean;
	skipRender?: boolean;
	force?: boolean;
	verbose?: boolean;
}

interface NewAppArgs extends CliOptions {
	appName: string;
}

interface InstallArgs extends CliOptions {
	installable?: string;
}

function noop() {};

function setUpLogger(verbose: boolean = false) {
	winston.remove(winston.transports.Console);
	winston.add(winston.transports.Console, {
		showLevel: false,
		level: verbose ? 'verbose' : 'info'
	});

	winston.add(winston.transports.File, {
		filename: '.dojo-cli.log',
		level: 'verbose'
	});
}

// Get verbose settings
const verboseArgvs: VerboseOptions = yargs.option({
	'verbose': {
		alias: 'v',
		describe: 'Set console logging level to verbose'
	}
}).argv;

setUpLogger(verboseArgvs.verbose);

// Get the rest
yargs
	.usage('Usage: $0 [global options] <command> [options]')
	.strict()
	.command(
		'new <appName>',
		'Create a new Dojo 2 application',
		noop,
		(argv: NewAppArgs) => {
			createNew(argv.appName, {
				npm: argv.skipNpm,
				git: argv.skipGit,
				render: argv.skipRender,
				force: argv.force
			});
		}
	)
	.command(
		'install [installable]',
		`Install an app or a passed installable

			- install github:dojo/widgets - installs dojo/widgets master branch
			- install github:dojo/widgets#24235224323434 - install the given commit
		`,
		noop,
		(argv: InstallArgs) => {
			install(argv.installable, {
				force: argv.force
			});
		}
	)
	.options({
		'skipNpm': {
			alias: 'sn',
			describe: 'Skip npm install'
		},
		'skipGit': {
			alias: 'sg',
			describe: 'Skip github install'
		},
		'skipRender': {
			alias: 'sr',
			describe: 'Skip render files'
		},
		'force': {
			alias: 'f',
			describe: 'Force usage in non-empty directory'
		}
	})
	.help()
	.argv;
