import * as yargs from 'yargs';
import { createNew } from '../commands/newApp';

interface NewAppArgs extends yargs.Argv {
	appName: string;
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
			createNew(argv.appName);
		}
	)
	.help()
	.argv;
