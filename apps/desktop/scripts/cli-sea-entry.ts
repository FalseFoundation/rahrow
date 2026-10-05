import { runCli } from '../../cli/src/cli.ts'

void runCli(process.argv.slice(2)).then((code) => {
	process.exitCode = code
})
