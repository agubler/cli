import * as yargs from 'yargs';
import { createNew } from '../commands/newApp';
import { install } from '../commands/install';

interface NewAppArgs extends yargs.Argv {
	appName: string;
	skipNpm: boolean;
	skipGit: boolean;
	skipRender: boolean;
	force: boolean;
}

interface InstallArgs extends yargs.Argv {
	installable: string;
	force: boolean;
}

function noop() {};

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
		}
	})
	.options({
		'skipGit': {
			alias: 'sg',
			describe: 'Skip github install'
		}
	})
	.options({
		'skipRender': {
			alias: 'sr',
			describe: 'Skip render files'
		}
	})
	.options({
		'force': {
			alias: 'f',
			describe: 'Force usage in non-empty directory'
		}
	})
	.help()
	.argv;
