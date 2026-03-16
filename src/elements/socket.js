import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, '')

export const socket = io(URL, {
	autoConnect: false,
	auth: { token: localStorage.getItem('token') || '' },
	withCredentials: false,
	transports: ['websocket', 'polling'],
	reconnection: true,
	reconnectionAttempts: 20,
	reconnectionDelay: 800,
	reconnectionDelayMax: 5000,
})

export function ensureSocketAuth() {
	const token = localStorage.getItem('token') || ''
	const prevToken = socket.auth?.token || ''

	if (prevToken !== token) {
		socket.auth = { ...(socket.auth || {}), token }
		if (socket.connected) {
			socket.disconnect()
		}
	}

	if (!socket.connected) {
		socket.connect()
	}
}
