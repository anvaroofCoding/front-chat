import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.jsx'
import './index.css'
import { StoreProvider } from './store/StoreProvider.jsx'

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<StoreProvider>
			<Toaster position='top-right' richColors closeButton />
			<App />
		</StoreProvider>
	</StrictMode>,
)
