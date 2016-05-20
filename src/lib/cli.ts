import * as yargs from 'yargs';
import { createNew } from '../commands/newApp';

interface NewAppArgs extends yargs.Argv {
	appName: string;
	skipNpm: boolean;
	skipGit: boolean;
	skipRender: boolean;
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
				render: argv.skipRender
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
		'skipGithub': {
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
	.help()
	.argv;
