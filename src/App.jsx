import { BrowserRouter, Route, Routes } from 'react-router-dom'
import TelegramSidebar from './main/main_sidebar'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path='/login' element={<Login />} />
				<Route path='/register' element={<Register />} />
				<Route path='/' element={<TelegramSidebar />} />
				<Route path='/:chatId' element={<TelegramSidebar />} />
			</Routes>
		</BrowserRouter>
	)
}
