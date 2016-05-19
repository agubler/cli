const path = {
	templates: __dirname + '/../templates/',
	destination: process.cwd() + '/',
	temp: process.cwd() + '/_temp/'
};

export const template = function (fileName: string = ''): string {
	return path.templates + fileName;
};

export const destination = function (fileName: string = ''): string {
	return path.destination + fileName;
};

export const temp = function (fileName: string = ''): string {
	return path.temp + fileName;
};
