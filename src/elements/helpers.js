// ─── SHARED HELPERS ──────────────────────────────────────────────────────────

export const BASE_URL = 'http://localhost:5000'

export const AVATAR_COLORS = [
	'#0A84FF',
	'#FF375F',
	'#FF9F0A',
	'#30D158',
	'#5E5CE6',
	'#FF6B35',
	'#BF5AF2',
	'#32ADE6',
	'#FF453A',
	'#64D2FF',
	'#FFD60A',
	'#32D74B',
]

export const getColor = str => {
	if (!str) return AVATAR_COLORS[0]
	let h = 0
	for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
	return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export function formatTime(dateStr) {
	if (!dateStr) return ''
	const d = new Date(dateStr),
		now = new Date()
	const diff = now - d
	if (diff < 60000) return 'Hozir'
	if (diff < 3600000) return `${Math.floor(diff / 60000)} daq`
	if (d.toDateString() === now.toDateString())
		return d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })
	const yest = new Date(now)
	yest.setDate(now.getDate() - 1)
	if (d.toDateString() === yest.toDateString()) return 'Kecha'
	if (diff < 7 * 86400000)
		return ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Sha'][d.getDay()]
	return d.toLocaleDateString('uz', { day: '2-digit', month: '2-digit' })
}

export function getConvMeta(conv, meId) {
	if (conv.type === 'group' || conv.groupId) {
		const name = conv.groupId?.name || 'Guruh'
		return {
			name,
			color: getColor(conv._id),
			isGroup: true,
			avatar: null,
			online: false,
		}
	}
	const other = (conv.members || []).find(m => (m._id || m) !== meId)
	if (other?._id) {
		const name =
			`${other.firstname || ''} ${other.lastname || ''}`.trim() ||
			'Foydalanuvchi'
		return {
			name,
			color: getColor(other._id),
			isGroup: false,
			avatar: other.avatar,
			online: !!other.isOnline,
		}
	}
	return {
		name: 'Foydalanuvchi',
		color: '#8E8E93',
		isGroup: false,
		online: false,
	}
}

export const truncate = (str = '', max = 60) =>
	typeof str === 'string' && str.length > max ? str.slice(0, max) + '…' : str
