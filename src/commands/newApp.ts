import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import { merge } from 'lodash';
import { readdirSync } from 'fs';
// const fsEditor = require('mem-fs-editor');

// var memFs = require('mem-fs');
// var editor = require('mem-fs-editor');
//
// var store = memFs.create();
// var fsEditor = editor.create(store);

// fs.write('somefile.js', 'var a = 1;');

// program.parse(process.argv);

interface ProceedAnswers extends inquirer.Answers {
	proceed: boolean;
}

const path = {
	templates: __dirname + '/templates/',
	destination: process.cwd() + '/'
};

const checkForAppName = (name: any): void => {
	if (!name || name.length === 0) {
		console.error(chalk.red('Error: ') + 'App Name is Required');
		process.exit(1);
	}
};

const checkForEmptyDir = (dirPath: string, exit: boolean = false): void | boolean => {
	const folderContents = readdirSync(dirPath);
	const isEmpty = folderContents.length === 0;

	if (!isEmpty && exit) {
		console.error(chalk.red('Error: ') + 'Directory is not empty');
		process.exit(1);
	} else {
		return isEmpty;
	}
};

const proceedCheck = (name: string) => {
	return inquirer.prompt([{
		type: 'confirm',
		name: 'proceed',
		message: `Do you wish to proceed with creating ${name}?`,
		default: true
	}]).then((response: ProceedAnswers) => {
		if (!response.proceed) {
			console.error(chalk.red('\nExiting: ') + 'User chose to exit');
			process.exit(1);
		}
	});
};

export const createNew = (name: string) => {
	checkForAppName(name);
	checkForEmptyDir(path.destination, true);

	let appDetails = { name };
	let questions = [
		{
			type: 'checkbox',
			name: 'packages',
			message: 'Which packages would you like to use?',
			choices: [
				{ name: 'dojo-core', checked: true },
				{ name: 'dojo-widgets'},
				{ name: 'dojo-actions'},
				{ name: 'dojo-compose'},
				{ name: 'dojo-dom'}
			]
		}
	];

	console.log(chalk.bold('Lets get started\n'));

	proceedCheck(name)
		.then(() => inquirer.prompt(questions))
		.then((answers) => {
			merge(appDetails, answers);
			console.log(JSON.stringify(appDetails, null, '  '));
		}).then(() => {
			console.log('ALL DONE MATEY BOY!');
		});
};

	//   {
	//     type: 'confirm',
	//     name: 'toBeDelivered',
	//     message: 'Is this for delivery?',
	//     default: false
	// },
	//   {
	//     type: 'input',
	//     name: 'phone',
	//     message: 'What\'s your phone number?',
	//     validate: function (value) {
	//       var pass = value.match(/^([01]{1})?[\-\.\s]?\(?(\d{3})\)?[\-\.\s]?(\d{3})[\-\.\s]?(\d{4})\s?((?:#|ext\.?\s?|x\.?\s?){1}(?:\d+)?)?$/i);
	//       if (pass) {
	//         return true;
	//       }
	  //
	//       return 'Please enter a valid phone number';
	//     }
	//   },
	//   {
	//     type: 'list',
	//     name: 'size',
	//     message: 'What size do you need?',
	//     choices: ['Large', 'Medium', 'Small'],
	//     filter: function (val) {
	//       return val.toLowerCase();
	//     }
	//   },
	//   {
	//     type: 'input',
	//     name: 'quantity',
	//     message: 'How many do you need?',
	//     validate: function (value) {
	//       var valid = !isNaN(parseFloat(value));
	//       return valid || 'Please enter a number';
	//     },
	//     filter: Number
	//   },
	//   {
	//     type: 'expand',
	//     name: 'toppings',
	//     message: 'What about the toppings?',
	//     choices: [
	//       {
	//         key: 'p',
	//         name: 'Pepperoni and cheese',
	//         value: 'PepperoniCheese'
	//       },
	//       {
	//         key: 'a',
	//         name: 'All dressed',
	//         value: 'alldressed'
	//       },
	//       {
	//         key: 'w',
	//         name: 'Hawaiian',
	//         value: 'hawaiian'
	//       }
	//     ]
	//   },
	//   {
	//     type: 'rawlist',
	//     name: 'beverage',
	//     message: 'You also get a free 2L beverage',
	//     choices: ['Pepsi', '7up', 'Coke']
	//   },
	//   {
	//     type: 'input',
	//     name: 'comments',
	//     message: 'Any comments on your purchase experience?',
	//     default: 'Nope, all good!'
	//   },
	//   {
	//     type: 'list',
	//     name: 'prize',
	//     message: 'For leaving a comment, you get a freebie',
	//     choices: ['cake', 'fries'],
	//     when: function (answers) {
	//       return answers.comments !== 'Nope, all good!';
	//     }
	//   }
	// ];

// return inquirer.prompt(questions);
// }
