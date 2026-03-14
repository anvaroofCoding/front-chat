import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export const socket = io(URL, {
	autoConnect: true,
	auth: { token: localStorage.getItem('token') || '' },
	withCredentials: true,
	transports: ['websocket'],
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
