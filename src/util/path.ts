const path = {
	templates: __dirname + '/../templates/',
	destination: process.cwd() + '/'
};

export const template = function (fileName: string = ''): string {
	return path.templates + fileName;
};

export const destination = function (fileName: string = ''): string {
	return path.destination + fileName;
};
