import { type CliIo, createCliCommands, createCliContext } from './commands.ts'

const usage = [
	'Usage: rahrow <command> [options]',
	'',
	'Commands:',
	'  profiles      Manage local connection profiles.',
	'  import        Import a profile from text, file, or stdin.',
	'  export        Export a stored profile.',
	'  backup        Import or export a versioned RahRow backup.',
	'  connect       Start a connection through the shared core.',
	'  disconnect    Stop the active connection.',
	'  restart       Restart the selected connection.',
	'  status        Print connection and engine status.',
	'  smart-connect Run or control fastest-profile selection.',
	'  test          Run a speed test for a profile.',
	'  subscription  Manage subscription sources (add, remove, parse, refresh).',
	'  about         Print version, support, source, and license metadata.',
].join('\n')

export async function runCli(
	argv: readonly string[],
	io: CliIo = processIo,
	context = createCliContext(io),
): Promise<number> {
	const [commandName, ...args] = argv

	if (!commandName || commandName === 'help' || commandName === '--help') {
		io.stdout(usage)

		return 0
	}

	const command = createCliCommands().find(
		(candidate) => candidate.name === commandName,
	)

	if (!command) {
		io.stderr(`rahrow: unknown command "${commandName}"`)
		io.stderr(usage)

		return 1
	}

	try {
		return await command.run(args, context)
	} catch (caught) {
		const message =
			caught instanceof Error ? caught.message : 'Unknown CLI command error'
		io.stderr(`rahrow ${command.name}: ${message}`)

		return 1
	}
}

const processIo: CliIo = {
	stdout(value) {
		process.stdout.write(`${value}\n`)
	},
	stderr(value) {
		process.stderr.write(`${value}\n`)
	},
}
