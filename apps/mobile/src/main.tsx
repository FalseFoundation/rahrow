import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app.tsx'
import './styles.css'

const root = document.getElementById('root')

if (!root) {
	throw new Error('RahRow root element was not found')
}

createRoot(root).render(
	<StrictMode>
		<Suspense fallback={null}>
			<App />
		</Suspense>
	</StrictMode>,
)
