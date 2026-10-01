import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import './styles.css'

const rootElement = document.getElementById('root')

if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<Suspense fallback={null}>
				<App />
			</Suspense>
		</StrictMode>,
	)
}
