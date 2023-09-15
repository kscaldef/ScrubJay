import ping from './commands/util/ping.js';

const commands = {
	'ping': {
		'data': ping.data,
		'execute': ping.execute,
	},
};

export default commands;