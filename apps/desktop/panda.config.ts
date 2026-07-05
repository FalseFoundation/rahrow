import path from 'node:path'
import { createPandaConfig } from '@rahrow/tooling/panda'
import { plugin, preset } from '@rahrow/ui/preset'

const packageRoot = process.cwd()

export default createPandaConfig({
	cwd: packageRoot,
	include: [path.join(packageRoot, 'src/**/*.{ts,tsx}')],
	jsxFramework: 'react',
	plugins: [plugin],
	presets: [preset],
})
