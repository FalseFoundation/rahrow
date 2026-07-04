import path from 'node:path'
import { createPandaConfig } from '@rahrow/tooling/panda'
import { plugin, preset } from './src/preset'

const packageRoot = process.cwd()

export default createPandaConfig({
	cwd: packageRoot,
	include: [path.join(packageRoot, 'src/**/*.{ts,tsx,js,jsx}')],
	jsxFramework: 'react',
	plugins: [plugin],
	presets: [preset],
})
