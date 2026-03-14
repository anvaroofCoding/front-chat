import {
	api,
	useGetMeQuery,
	useGetMessagesQuery,
	useMarkConversationReadMutation,
	useMarkMessageReadMutation,
	useSendMessageMutation,
} from '@/store/api'
import { realtimeActions } from '@/store/realtimeSlice'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { getColor } from './helpers'
import { MsgMedia } from './MediaViewer'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || ''

// ─── UTILS ────────────────────────────────────────────────────────────────────
const truncate = (s = '', n = 60) => (s.length > n ? s.slice(0, n) + '…' : s)

const msgTime = d =>
	d
		? new Date(d).toLocaleTimeString('uz', {
				hour: '2-digit',
				minute: '2-digit',
			})
		: ''

const voiceFmt = s =>
	`${Math.floor(s / 60)}:${String((s % 60) | 0).padStart(2, '0')}`

function dayLabel(dateStr) {
	const d = new Date(dateStr),
		now = new Date()
	const diff = now.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)
	if (diff === 0) return 'Bugun'
	if (diff === 86400000) return 'Kecha'
	return new Date(dateStr).toLocaleDateString('uz', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	})
}

function getConvMeta(conv, meId) {
	if (!conv) return null
	if (conv.type === 'group' || conv.groupId)
		return {
			name: conv.groupId?.name || 'Guruh',
			color: getColor(conv._id),
			isGroup: true,
			avatar: null,
			online: false,
		}
	const other = (conv.members || []).find(m => (m._id || m) !== meId)
	if (other?._id) {
		const name =
			[other.firstname, other.lastname].filter(Boolean).join(' ') ||
			'Foydalanuvchi'
		const avatar = other.avatar?.startsWith('http')
			? other.avatar
			: other.avatar
				? BASE_URL + other.avatar
				: null
		return {
			name,
			color: getColor(other._id),
			isGroup: false,
			avatar,
			online: !!other.isOnline,
		}
	}
	return {
		name: 'Foydalanuvchi',
		color: '#8E8E93',
		isGroup: false,
		avatar: null,
		online: false,
	}
}

// Group messages by date
function groupByDate(messages = []) {
	const groups = []
	let lastDate = null
	for (const msg of messages) {
		const date = new Date(msg.createdAt).toDateString()
		if (date !== lastDate) {
			groups.push({ type: 'date', label: dayLabel(msg.createdAt), key: date })
			lastDate = date
		}
		groups.push({ type: 'msg', msg })
	}
	return groups
}

function getMessageId(msg) {
	return msg?._id || msg?.id || msg?.messageId || null
}

function normalizeId(id) {
	if (!id) return ''
	if (typeof id === 'string') return id
	if (typeof id === 'number') return String(id)
	if (typeof id === 'object') {
		return id._id || id.id || ''
	}
	return ''
}

function updateConversationLastMessage(dispatch, message, conversationId) {
	if (!conversationId || !message) return

	const convId = normalizeId(conversationId)
	if (!convId) return

	const update = draft => {
		if (!Array.isArray(draft)) return
		const index = draft.findIndex(
			conversation => normalizeId(conversation?._id) === convId,
		)
		if (index < 0) return

		draft[index].lastMessage = message
		draft[index].lastMessageAt =
			message?.createdAt || draft[index].lastMessageAt
		draft[index].updatedAt = message?.createdAt || draft[index].updatedAt

		if (index > 0) {
			const [item] = draft.splice(index, 1)
			draft.unshift(item)
		}
	}

	;[undefined, 'all', 'private', 'group'].forEach(arg => {
		dispatch(
			api.util.updateQueryData('getChats', arg, draft => {
				update(draft)
			}),
		)
	})
}

function mergeUniqueMessages(current = [], incoming = []) {
	const map = new Map()
	for (const item of current) {
		const id = getMessageId(item)
		if (id) map.set(id, item)
	}
	for (const item of incoming) {
		const id = getMessageId(item)
		if (!id) continue
		map.set(id, item)
	}
	return [...map.values()].sort(
		(a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0),
	)
}

function getReplySnippet(msg) {
	if (!msg) return '...'
	if (msg.text?.trim()) return msg.text
	if (msg.files?.length) {
		const allImages = msg.files.every(file => {
			const mime = file?.mimetype || ''
			const url = file?.url || ''
			return (
				mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
			)
		})
		return allImages ? 'Rasm' : 'Fayl'
	}
	if (msg.video?.length) return 'Video'
	if (msg.audio) return 'Ovozli xabar'
	return '...'
}

function getTypingName(entry) {
	if (!entry) return 'Kimdir'
	const name = String(entry.name || '').trim()
	if (!name) return 'Kimdir'
	return name
}

function buildTypingLabel(typingMap, isGroup) {
	const now = Date.now()
	const activeUsers = Object.values(typingMap || {}).filter(
		user => now - (user?.lastAt || 0) < 5000,
	)

	if (!activeUsers.length) {
		return { hasTyping: false, label: '' }
	}

	const uniqueNames = []
	for (const user of activeUsers) {
		const name = getTypingName(user)
		if (!uniqueNames.includes(name)) {
			uniqueNames.push(name)
		}
	}

	if (!isGroup || uniqueNames.length === 1) {
		return { hasTyping: true, label: `${uniqueNames[0]} yozmoqda...` }
	}

	if (uniqueNames.length === 2) {
		return {
			hasTyping: true,
			label: `${uniqueNames[0]}, ${uniqueNames[1]} yozmoqda...`,
		}
	}

	const extraCount = uniqueNames.length - 2
	return {
		hasTyping: true,
		label: `${uniqueNames[0]}, ${uniqueNames[1]} va yana ${extraCount} kishi yozmoqda...`,
	}
}

// ─── SKELETONS ────────────────────────────────────────────────────────────────
const Skel = ({ w = '100%', h = 14, r = 7, s = {} }) => (
	<div
		className='tg-skel'
		style={{
			width: w,
			height: h,
			borderRadius: r,
			background: 'var(--skel)',
			flexShrink: 0,
			...s,
		}}
	/>
)

const SKELS = [false, true, false, false, true, true, false, true, false, true]

function MsgSkeletons() {
	return (
		<>
			{SKELS.map((mine, i) => (
				<div
					key={i}
					style={{
						display: 'flex',
						justifyContent: mine ? 'flex-end' : 'flex-start',
						padding: '3px 14px',
						marginBottom: 2,
					}}
				>
					{!mine && (
						<Skel
							w={28}
							h={28}
							r={14}
							s={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 2 }}
						/>
					)}
					<Skel
						w={`${40 + (i % 3) * 10}%`}
						h={44}
						r={16}
						s={{
							borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
						}}
					/>
				</div>
			))}
		</>
	)
}

function HeaderSkel() {
	return (
		<div
			style={{
				height: 56,
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				padding: '0 14px',
				background: 'var(--hdr)',
				flexShrink: 0,
			}}
		>
			<Skel w={36} h={36} r={18} />
			<div
				style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}
			>
				<Skel w='38%' h={14} r={7} />
				<Skel w='22%' h={11} r={6} />
			</div>
		</div>
	)
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
const Av = memo(({ name = '?', color, avatar, online, size = 36, isGroup }) => {
	const [err, setErr] = useState(false)
	const src = avatar
		? avatar.startsWith('http')
			? avatar
			: BASE_URL + avatar
		: null
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: '50%',
				background: color || getColor(name),
				flexShrink: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: size * 0.38,
				fontWeight: 700,
				color: '#fff',
				position: 'relative',
				overflow: 'hidden',
				userSelect: 'none',
			}}
		>
			{src && !err ? (
				<img
					src={src}
					alt=''
					style={{ width: '100%', height: '100%', objectFit: 'cover' }}
					onError={() => setErr(true)}
				/>
			) : isGroup ? (
				<svg
					width={size * 0.44}
					height={size * 0.44}
					viewBox='0 0 24 24'
					fill='none'
				>
					<path
						d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'
						stroke='#fff'
						strokeWidth='1.8'
						strokeLinecap='round'
					/>
					<circle cx='9' cy='7' r='4' stroke='#fff' strokeWidth='1.8' />
					<path
						d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'
						stroke='#fff'
						strokeWidth='1.8'
						strokeLinecap='round'
					/>
				</svg>
			) : (
				(name[0] || '?').toUpperCase()
			)}
			{online && (
				<div
					style={{
						position: 'absolute',
						bottom: 2,
						right: 2,
						width: size * 0.25,
						height: size * 0.25,
						borderRadius: '50%',
						background: '#30D158',
						border: '2px solid var(--bg)',
					}}
				/>
			)}
		</div>
	)
})

// ─── CONTEXT MENU ─────────────────────────────────────────────────────────────
const CtxMenu = memo(({ x, y, msg, isMine, onClose, onAction }) => {
	const ref = useRef(null)
	const [pos, setPos] = useState({ top: y, left: x })

	useEffect(() => {
		if (!ref.current) return
		const { width, height } = ref.current.getBoundingClientRect()
		setPos({
			top: y + height > window.innerHeight - 10 ? y - height : y,
			left: x + width > window.innerWidth - 10 ? x - width : x,
		})
	}, [x, y])

	useEffect(() => {
		const h = e => {
			if (!ref.current?.contains(e.target)) onClose()
		}
		const t = setTimeout(() => window.addEventListener('mousedown', h), 10)
		return () => {
			clearTimeout(t)
			window.removeEventListener('mousedown', h)
		}
	}, [onClose])

	const rows = [
		{ label: 'Javob berish', key: 'reply', icon: '↩️' },
		{ label: 'Nusxalash', key: 'copy', icon: '📋' },
		...(isMine
			? [
					{ label: 'Tahrirlash', key: 'edit', icon: '✏️' },
					{ label: "O'chirish", key: 'delete', icon: '🗑️', danger: true },
				]
			: [{ label: "O'chirish", key: 'delete', icon: '🗑️', danger: true }]),
	]

	return (
		<div
			ref={ref}
			style={{
				position: 'fixed',
				top: pos.top,
				left: pos.left,
				zIndex: 999,
				background: 'var(--ctx-bg)',
				borderRadius: 14,
				minWidth: 196,
				boxShadow: '0 8px 36px rgba(0,0,0,0.22)',
				border: '0.5px solid var(--div)',
				overflow: 'hidden',
				animation: 'ctxIn .15s cubic-bezier(.34,1.4,.64,1)',
				transformOrigin: 'top left',
			}}
		>
			{rows.map((r, i) => (
				<button
					key={r.key}
					onClick={() => {
						onAction(r.key, msg)
						onClose()
					}}
					onMouseEnter={e =>
						(e.currentTarget.style.background = 'var(--hover)')
					}
					onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
					style={{
						width: '100%',
						display: 'flex',
						alignItems: 'center',
						gap: 11,
						padding: '11px 15px',
						background: 'transparent',
						border: 'none',
						cursor: 'pointer',
						fontSize: 15,
						fontFamily: 'inherit',
						textAlign: 'left',
						color: r.danger ? '#FF3B30' : 'var(--txt1)',
						borderTop: i > 0 ? '0.5px solid var(--div)' : 'none',
					}}
				>
					<span style={{ fontSize: 16 }}>{r.icon}</span>
					{r.label}
				</button>
			))}
		</div>
	)
})

// ─── REPLY STRIP ──────────────────────────────────────────────────────────────
function ReplyStrip({ msg, name, onCancel }) {
	const preview = getReplySnippet(msg)
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				padding: '7px 14px 6px',
				background: 'var(--hdr)',
				borderTop: '0.5px solid var(--div)',
				animation: 'slideUp .18s ease',
			}}
		>
			<div
				style={{
					width: 3,
					minHeight: 34,
					borderRadius: 2,
					background: '#0A84FF',
					flexShrink: 0,
				}}
			/>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: '#0A84FF',
						marginBottom: 2,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{name}
				</div>
				<div
					style={{
						fontSize: 13,
						color: 'var(--txt2)',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{truncate(preview, 58)}
				</div>
			</div>
			<button
				onClick={onCancel}
				style={{
					background: 'transparent',
					border: 'none',
					cursor: 'pointer',
					color: 'var(--txt3)',
					padding: 3,
					display: 'flex',
				}}
			>
				<svg width='18' height='18' viewBox='0 0 18 18' fill='none'>
					<circle
						cx='9'
						cy='9'
						r='7.5'
						stroke='currentColor'
						strokeWidth='1.2'
						opacity='.35'
					/>
					<path
						d='M6 6l6 6M12 6l-6 6'
						stroke='currentColor'
						strokeWidth='1.5'
						strokeLinecap='round'
					/>
				</svg>
			</button>
		</div>
	)
}

// ─── REPLY QUOTE (inside bubble) ──────────────────────────────────────────────
function ReplyQuote({ replyTo, isDark }) {
	if (!replyTo) return null
	const name =
		[replyTo.sender?.firstname, replyTo.sender?.lastname]
			.filter(Boolean)
			.join(' ') || 'Xabar'
	const preview = getReplySnippet(replyTo)
	return (
		<div
			style={{
				display: 'flex',
				gap: 8,
				marginBottom: 7,
				padding: '5px 9px',
				background: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.07)',
				borderRadius: 10,
				borderLeft: '3px solid #0A84FF',
				cursor: 'pointer',
			}}
		>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontSize: 12,
						fontWeight: 600,
						color: '#0A84FF',
						marginBottom: 2,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{name}
				</div>
				<div
					style={{
						fontSize: 12,
						color: 'var(--txt2)',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{truncate(preview, 52)}
				</div>
			</div>
		</div>
	)
}

// ─── MSG BUBBLE ───────────────────────────────────────────────────────────────
const MsgBubble = memo(
	({ msg, isMine, isDark, showAv, senderMeta, onCtx, onReply }) => {
		const hasText = msg.text?.trim().length > 0
		const hasMedia = !!(msg.files?.length || msg.video?.length || msg.audio)

		// Rasmlar va videolar bor, matn/reply yo'q — faqat shu holda background yo'q
		const onlyImages = msg.files?.every(f => {
			const mime = f.mimetype || '',
				url = f.url || ''
			return (
				mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
			)
		})
		const onlyVideos = !msg.files?.length && msg.video?.length > 0
		const mediaOnly =
			hasMedia &&
			!hasText &&
			!msg.replyTo &&
			!msg.audio && // audio → bubble ichida
			(onlyImages || onlyVideos) // faqat rasm yoki video

		const bg = isMine ? '#0A84FF' : isDark ? '#2c2c2e' : '#fff'
		const br = isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
		const tc = isMine ? '#fff' : 'var(--txt1)'
		const dim = isMine ? 'rgba(255,255,255,0.62)' : 'var(--txt3)'

		const openCtx = e => {
			e.preventDefault()
			onCtx(e.clientX, e.clientY, msg, isMine)
		}
		const touchCtx = e => {
			const t = e.touches[0],
				tm = setTimeout(() => onCtx(t.clientX, t.clientY, msg, isMine), 600)
			const cl = () => clearTimeout(tm)
			document.addEventListener('touchend', cl, { once: true })
			document.addEventListener('touchmove', cl, { once: true })
		}

		// Vaqt + tick — media-only uchun rasmning ustiga overlay
		const TimeRow = ({ overlay }) => (
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'flex-end',
					gap: 3,
					...(overlay
						? {
								position: 'absolute',
								bottom: 7,
								right: 9,
								background: 'rgba(0,0,0,0.42)',
								borderRadius: 8,
								padding: '2px 6px',
							}
						: {
								marginTop: 3,
							}),
				}}
			>
				<span
					style={{
						fontSize: 11,
						color: overlay ? 'rgba(255,255,255,0.9)' : dim,
					}}
				>
					{msgTime(msg.createdAt)}
				</span>
				{isMine && (
					<svg
						width='15'
						height='11'
						viewBox='0 0 18 13'
						fill='none'
						opacity='.9'
					>
						<path
							d='M1 6.5L5.5 11L17 1'
							stroke={
								overlay ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,.85)'
							}
							strokeWidth='1.7'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
						{(msg?.is_read || msg?.read) && (
							<path
								d='M9 6.5l4.5 4.5'
								stroke={
									overlay ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,.85)'
								}
								strokeWidth='1.7'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						)}
					</svg>
				)}
			</div>
		)

		return (
			<div
				className='tg-row'
				style={{
					display: 'flex',
					justifyContent: isMine ? 'flex-end' : 'flex-start',
					alignItems: 'flex-end',
					gap: 6,
					padding: '2px 12px',
					marginBottom: 1,
				}}
			>
				{/* Avatar */}
				{!isMine && (
					<div style={{ width: 28, flexShrink: 0, marginBottom: 2 }}>
						{showAv && senderMeta && <Av {...senderMeta} size={28} />}
					</div>
				)}

				{/* Wrapper — reply btn uchun position:relative */}
				<div style={{ position: 'relative', maxWidth: 'min(72%, 420px)' }}>
					{/* ── MEDIA ONLY: background yo'q, to'g'ridan rasm/video ── */}
					{mediaOnly ? (
						<div
							onContextMenu={openCtx}
							onTouchStart={touchCtx}
							style={{
								position: 'relative',
								borderRadius: br,
								overflow: 'hidden',
								boxShadow: isDark
									? '0 2px 8px rgba(0,0,0,0.35)'
									: '0 1px 4px rgba(0,0,0,0.15)',
							}}
						>
							<MsgMedia msg={msg} isMine={isMine} />
							{/* Vaqt rasmning ustida overlay */}
							<TimeRow overlay />
						</div>
					) : (
						/* ── MATN yoki MATN+MEDIA: oddiy bubble ── */
						<div
							onContextMenu={openCtx}
							onTouchStart={touchCtx}
							style={{
								background: bg,
								borderRadius: br,
								cursor: 'default',
								userSelect: 'text',
								position: 'relative',
								boxShadow: isDark
									? '0 1px 2px rgba(0,0,0,0.25)'
									: '0 1px 3px rgba(0,0,0,0.08)',
								overflow: 'hidden',
							}}
						>
							{/* Reply quote */}
							{msg.replyTo && (
								<div style={{ padding: '8px 11px 0' }}>
									<ReplyQuote replyTo={msg.replyTo} isDark={isDark} />
								</div>
							)}

							{/* Sender name (group) */}
							{!isMine && senderMeta?.isGroup && (
								<div
									style={{
										fontSize: 12,
										fontWeight: 600,
										color: '#0A84FF',
										padding: hasMedia ? '8px 11px 4px' : '8px 11px 0',
									}}
								>
									{[msg.sender?.firstname, msg.sender?.lastname]
										.filter(Boolean)
										.join(' ')}
								</div>
							)}

							{/* Media (matn ham bor — media tepada, borderless) */}
							{hasMedia && (
								<div
									style={{
										overflow: 'hidden',
										borderRadius:
											hasText || msg.replyTo || senderMeta?.isGroup ? '0' : br,
									}}
								>
									<MsgMedia msg={msg} isMine={isMine} />
								</div>
							)}

							{/* Matn */}
							{hasText && (
								<div
									style={{
										fontSize: 15,
										lineHeight: 1.5,
										color: tc,
										wordBreak: 'break-word',
										whiteSpace: 'pre-wrap',
										padding: hasMedia ? '6px 11px 0' : '8px 11px 0',
									}}
								>
									{msg.text}
								</div>
							)}

							{/* Vaqt */}
							<div style={{ padding: '0 11px 8px' }}>
								<TimeRow overlay={false} />
							</div>
						</div>
					)}

					{/* Hover reply btn */}
					<button
						onClick={() => onReply(msg)}
						className='tg-rp'
						style={{
							position: 'absolute',
							top: '50%',
							transform: 'translateY(-50%)',
							[isMine ? 'left' : 'right']: -32,
							width: 26,
							height: 26,
							borderRadius: '50%',
							border: 'none',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: 'var(--txt2)',
							opacity: 0,
							transition: 'opacity .15s',
							background: isDark ? '#2c2c2e' : '#ebebef',
						}}
					>
						<svg width='13' height='13' viewBox='0 0 24 24' fill='none'>
							<path
								d='M9 17l-4-4 4-4'
								stroke='currentColor'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
							<path
								d='M5 13h9a5 5 0 0 1 0 10H6'
								stroke='currentColor'
								strokeWidth='2'
								strokeLinecap='round'
							/>
						</svg>
					</button>
				</div>
			</div>
		)
	},
)

// ─── ATTACH MENU ──────────────────────────────────────────────────────────────
function AttachMenu({ onClose, onChoose }) {
	const items = [
		{
			label: 'Rasm',
			accept: 'image/*',
			key: 'image',
			multiple: true,
			icon: (
				<svg width='20' height='20' viewBox='0 0 24 24' fill='none'>
					<rect
						x='3'
						y='3'
						width='18'
						height='18'
						rx='3'
						stroke='#30D158'
						strokeWidth='1.7'
					/>
					<circle cx='8.5' cy='8.5' r='1.5' fill='#30D158' />
					<path
						d='M21 15l-5-5L5 21'
						stroke='#30D158'
						strokeWidth='1.7'
						strokeLinecap='round'
						strokeLinejoin='round'
					/>
				</svg>
			),
		},
		{
			label: 'Video',
			accept: 'video/*',
			key: 'video',
			multiple: false,
			icon: (
				<svg width='20' height='20' viewBox='0 0 24 24' fill='none'>
					<path
						d='M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14'
						stroke='#FF375F'
						strokeWidth='1.7'
						strokeLinecap='round'
					/>
					<rect
						x='2'
						y='6'
						width='13'
						height='12'
						rx='2'
						stroke='#FF375F'
						strokeWidth='1.7'
					/>
				</svg>
			),
		},
		{
			label: 'Fayl',
			accept: '*/*',
			key: 'file',
			multiple: true,
			icon: (
				<svg width='20' height='20' viewBox='0 0 24 24' fill='none'>
					<path
						d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'
						stroke='#0A84FF'
						strokeWidth='1.7'
					/>
					<path
						d='M14 2v6h6M16 13H8M16 17H8M10 9H8'
						stroke='#0A84FF'
						strokeWidth='1.7'
						strokeLinecap='round'
					/>
				</svg>
			),
		},
	]
	return (
		<div
			style={{
				position: 'absolute',
				bottom: 'calc(100% + 8px)',
				left: 0,
				background: 'var(--ctx-bg)',
				borderRadius: 16,
				minWidth: 170,
				zIndex: 100,
				boxShadow: '0 10px 36px rgba(0,0,0,0.22)',
				border: '0.5px solid var(--div)',
				overflow: 'hidden',
				animation: 'ctxIn .18s cubic-bezier(.34,1.4,.64,1)',
				transformOrigin: 'bottom left',
			}}
		>
			{items.map((item, i) => (
				<label
					key={item.key}
					onMouseEnter={e =>
						(e.currentTarget.style.background = 'var(--hover)')
					}
					onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 12,
						padding: '13px 16px',
						cursor: 'pointer',
						borderTop: i > 0 ? '0.5px solid var(--div)' : 'none',
						transition: 'background .12s',
					}}
				>
					<input
						type='file'
						accept={item.accept}
						multiple={item.multiple}
						style={{ display: 'none' }}
						onChange={e => {
							if (e.target.files?.length) {
								onChoose(item.key, e.target.files)
								onClose()
							}
							e.target.value = '' // reset: xuddi shu faylni qayta tanlash mumkin
						}}
					/>
					{item.icon}
					<span style={{ fontSize: 15, color: 'var(--txt1)', fontWeight: 450 }}>
						{item.label}
					</span>
				</label>
			))}
		</div>
	)
}

// ─── VOICE RECORDER (real MediaRecorder) ─────────────────────────────────────
function VoiceRec({ onCancel, onSend }) {
	const [secs, setSecs] = useState(0)
	const [ready, setReady] = useState(false)
	const [stopping, setStopping] = useState(false)

	// Ref lar — closure bug'idan xalos bo'lish uchun
	const recRef = useRef(null)
	const streamRef = useRef(null)
	const chunksRef = useRef([])
	const onSendRef = useRef(onSend)
	const onCancelRef = useRef(onCancel)
	const mimeRef = useRef('')

	useEffect(() => {
		onSendRef.current = onSend
	}, [onSend])
	useEffect(() => {
		onCancelRef.current = onCancel
	}, [onCancel])

	useEffect(() => {
		// Eng mos format
		const mimeType =
			[
				'audio/webm;codecs=opus',
				'audio/webm',
				'audio/ogg;codecs=opus',
				'audio/mp4',
			].find(t => MediaRecorder.isTypeSupported(t)) || ''
		mimeRef.current = mimeType

		let interval
		navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then(stream => {
				streamRef.current = stream
				const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {})
				recRef.current = rec
				chunksRef.current = []

				rec.ondataavailable = e => {
					if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
				}
				rec.start(200) // har 200ms da chunk
				setReady(true)
			})
			.catch(err => {
				console.warn("🎤 Mic ruxsati yo'q:", err)
				onCancelRef.current()
			})

		interval = setInterval(() => setSecs(s => s + 1), 1000)

		return () => {
			clearInterval(interval)
			// unmount — stream ni yopamiz (bekor qilinganda)
			streamRef.current?.getTracks().forEach(t => t.stop())
		}
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	const handleSend = () => {
		const rec = recRef.current
		if (!rec || !ready || stopping) return
		setStopping(true)

		const buildBlob = () => {
			const chunks = chunksRef.current
			if (!chunks.length) {
				console.warn("🎤 Chunks yo'q, bekor qilindi")
				onCancelRef.current()
				return
			}
			const blob = new Blob(chunks, { type: mimeRef.current || 'audio/webm' })
			console.log('🎤 Yuborilmoqda:', blob.size, 'bytes')
			onSendRef.current(blob)
		}

		if (rec.state !== 'inactive') {
			rec.addEventListener('stop', buildBlob, { once: true })
			rec.stop()
			streamRef.current?.getTracks().forEach(t => t.stop())
		} else {
			buildBlob()
		}
	}

	const handleCancel = () => {
		const rec = recRef.current
		if (rec && rec.state !== 'inactive') rec.stop()
		streamRef.current?.getTracks().forEach(t => t.stop())
		onCancelRef.current()
	}

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				flex: 1,
				padding: '0 2px',
				animation: 'slideUp .18s ease',
			}}
		>
			{/* Pulsing dot */}
			<div
				style={{
					width: 9,
					height: 9,
					borderRadius: '50%',
					flexShrink: 0,
					background: ready ? '#FF3B30' : '#888',
					animation: ready ? 'tgPulse 1s ease-in-out infinite' : 'none',
				}}
			/>

			{/* Timer */}
			<span
				style={{
					fontSize: 15,
					fontWeight: 600,
					flexShrink: 0,
					minWidth: 38,
					color: ready ? '#FF3B30' : 'var(--txt3)',
					fontVariantNumeric: 'tabular-nums',
				}}
			>
				{voiceFmt(secs)}
			</span>

			{/* Waveform bars */}
			<div
				style={{
					flex: 1,
					display: 'flex',
					alignItems: 'center',
					gap: 1.5,
					overflow: 'hidden',
				}}
			>
				{Array.from({ length: 26 }).map((_, i) => (
					<div
						key={i}
						style={{
							width: 2.5,
							flexShrink: 0,
							borderRadius: 2,
							height: ready
								? Math.max(3, Math.abs(Math.sin(i * 0.9 + secs * 0.8)) * 22)
								: 3,
							background: '#FF3B30',
							opacity: ready ? 0.65 : 0.25,
							transition: 'height .12s',
						}}
					/>
				))}
			</div>

			{/* Cancel */}
			<button
				onClick={handleCancel}
				style={{
					background: 'transparent',
					border: 'none',
					cursor: 'pointer',
					color: 'var(--txt3)',
					display: 'flex',
					padding: 4,
					flexShrink: 0,
				}}
			>
				<svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
					<circle
						cx='12'
						cy='12'
						r='10'
						stroke='currentColor'
						strokeWidth='1.7'
					/>
					<path
						d='M15 9l-6 6M9 9l6 6'
						stroke='currentColor'
						strokeWidth='1.7'
						strokeLinecap='round'
					/>
				</svg>
			</button>

			{/* Send */}
			<button
				onClick={handleSend}
				disabled={!ready || stopping}
				style={{
					width: 40,
					height: 40,
					borderRadius: '50%',
					border: 'none',
					cursor: ready && !stopping ? 'pointer' : 'default',
					background: ready && !stopping ? '#0A84FF' : '#555',
					color: '#fff',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
					transition: 'background .2s',
					boxShadow:
						ready && !stopping ? '0 2px 10px rgba(10,132,255,.45)' : 'none',
				}}
			>
				{stopping ? (
					<svg
						width='15'
						height='15'
						viewBox='0 0 24 24'
						fill='none'
						style={{ animation: 'spin .8s linear infinite' }}
					>
						<circle
							cx='12'
							cy='12'
							r='9'
							stroke='rgba(255,255,255,.3)'
							strokeWidth='2.5'
						/>
						<path
							d='M12 3a9 9 0 0 1 9 9'
							stroke='white'
							strokeWidth='2.5'
							strokeLinecap='round'
						/>
					</svg>
				) : (
					<svg width='15' height='15' viewBox='0 0 24 24' fill='none'>
						<path
							d='M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z'
							stroke='white'
							strokeWidth='1.8'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
				)}
			</button>
		</div>
	)
}

// ─── INPUT BAR ────────────────────────────────────────────────────────────────
function InputBar({
	isDark,
	convId,
	replyTo,
	replyName,
	onCancelReply,
	onMessageSent,
}) {
	const [text, setText] = useState('')
	const [attach, setAttach] = useState(false)
	const [voice, setVoice] = useState(false)
	const [sending, setSending] = useState(false)
	const dispatch = useDispatch()
	const taRef = useRef(null)
	const typingTimeoutRef = useRef(null)
	const isTypingRef = useRef(false)
	const hasText = text.trim().length > 0

	const focusInput = useCallback(() => {
		requestAnimationFrame(() => {
			const el = taRef.current
			if (!el || voice || sending) return
			el.focus()
			const valueLength = el.value?.length ?? 0
			el.setSelectionRange(valueLength, valueLength)
		})
	}, [voice, sending])

	// RTK mutation
	const [sendMessage] = useSendMessageMutation()

	useEffect(() => {
		const el = taRef.current
		if (!el) return
		el.style.height = 'auto'
		el.style.height = Math.min(el.scrollHeight, 120) + 'px'
	}, [text])

	useEffect(() => {
		focusInput()
	}, [convId, focusInput])

	const notifyTyping = useCallback(() => {
		if (!convId) return
		if (!isTypingRef.current) {
			dispatch(
				realtimeActions.sendTyping({
					conversationId: convId,
					isTyping: true,
				}),
			)
			isTypingRef.current = true
		}
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current)
		}
		typingTimeoutRef.current = setTimeout(() => {
			if (!convId) return
			dispatch(
				realtimeActions.sendTyping({
					conversationId: convId,
					isTyping: false,
				}),
			)
			isTypingRef.current = false
			typingTimeoutRef.current = null
		}, 2500)
	}, [convId, dispatch])

	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}
			if (isTypingRef.current && convId) {
				dispatch(
					realtimeActions.sendTyping({
						conversationId: convId,
						isTyping: false,
					}),
				)
			}
		}
	}, [convId, dispatch])

	// ── Universal FormData builder ─────────────────────────────────────────
	const buildForm = useCallback(
		({ text: t, files, audioBlob, videos }) => {
			const fd = new FormData()
			if (!convId) return fd
			fd.append('conversationId', convId)
			fd.append('chatId', convId)
			if (replyTo?._id) fd.append('replyTo', replyTo._id)
			if (t?.trim()) fd.append('text', t.trim())

			// files[] — rasm va pdf lar
			if (files?.length) {
				;[...files].forEach(f => fd.append('files', f))
			}
			// video[]
			if (videos?.length) {
				;[...videos].forEach(v => fd.append('video', v))
			}
			// audio (voice)
			if (audioBlob) {
				fd.append('audio', audioBlob, 'voice.webm')
			}
			return fd
		},
		[convId, replyTo],
	)

	// ── Send text ──────────────────────────────────────────────────────────
	const send = useCallback(async () => {
		const t = text.trim()
		if (!t || sending || !convId) return
		setSending(true)
		try {
			const fd = buildForm({ text: t })
			const response = await sendMessage(fd).unwrap()
			onMessageSent?.(response)
			setText('')
			onCancelReply?.()
			focusInput()
			if (isTypingRef.current) {
				dispatch(
					realtimeActions.sendTyping({
						conversationId: convId,
						isTyping: false,
					}),
				)
				isTypingRef.current = false
			}
		} catch (err) {
			console.error('Send error:', err)
		} finally {
			setSending(false)
		}
	}, [
		text,
		sending,
		convId,
		buildForm,
		focusInput,
		onCancelReply,
		onMessageSent,
		dispatch,
		sendMessage,
	])

	const onKey = e => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			send()
		}
	}

	// ── Send file/image/video ──────────────────────────────────────────────
	const onFile = useCallback(
		async (type, fileList) => {
			if (!fileList?.length || sending || !convId) return
			setSending(true)
			try {
				const fd =
					type === 'video'
						? buildForm({ videos: fileList })
						: buildForm({ files: fileList })
				const response = await sendMessage(fd).unwrap()
				onMessageSent?.(response)
				console.log(
					type === 'video' ? '🎥 video sent' : '📎 file sent',
					[...fileList].map(f => f.name),
				)
			} catch (err) {
				console.error('File send error:', err)
			} finally {
				setSending(false)
			}
		},
		[sending, convId, buildForm, onMessageSent, sendMessage],
	)

	// ── Send voice ─────────────────────────────────────────────────────────
	const onVoice = useCallback(
		async audioBlob => {
			if (!audioBlob || sending || !convId) return
			setSending(true)
			try {
				const fd = buildForm({ audioBlob })
				const response = await sendMessage(fd).unwrap()
				onMessageSent?.(response)
				console.log('🎤 voice sent:', audioBlob.size, 'bytes')
				setVoice(false)
				onCancelReply?.()
				focusInput()
			} catch (err) {
				console.error('Voice send error:', err)
			} finally {
				setSending(false)
			}
		},
		[
			sending,
			convId,
			buildForm,
			focusInput,
			onCancelReply,
			onMessageSent,
			sendMessage,
		],
	)

	return (
		<div
			style={{
				background: 'var(--hdr)',
				flexShrink: 0,
				boxShadow: isDark
					? '0 -1px 0 rgba(255,255,255,.06)'
					: '0 -1px 0 rgba(0,0,0,.07)',
			}}
		>
			{replyTo && (
				<ReplyStrip msg={replyTo} name={replyName} onCancel={onCancelReply} />
			)}

			<div
				onClick={focusInput}
				style={{
					display: 'flex',
					alignItems: 'flex-end',
					padding: '8px 10px 10px',
					gap: 6,
				}}
			>
				{voice ? (
					<VoiceRec onCancel={() => setVoice(false)} onSend={onVoice} />
				) : (
					<>
						{/* Attach */}
						<div style={{ position: 'relative', flexShrink: 0 }}>
							<button
								onClick={() => !sending && setAttach(o => !o)}
								style={{
									width: 38,
									height: 38,
									borderRadius: '50%',
									border: 'none',
									cursor: 'pointer',
									background: attach
										? isDark
											? 'rgba(10,132,255,.18)'
											: 'rgba(10,132,255,.1)'
										: 'transparent',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: attach ? '#0A84FF' : 'var(--txt2)',
									transform: attach ? 'rotate(45deg)' : 'rotate(0)',
									transition: 'transform .2s, background .15s',
									opacity: sending ? 0.5 : 1,
								}}
							>
								<svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
									<circle
										cx='12'
										cy='12'
										r='10'
										stroke='currentColor'
										strokeWidth='1.6'
									/>
									<path
										d='M12 8v8M8 12h8'
										stroke='currentColor'
										strokeWidth='1.8'
										strokeLinecap='round'
									/>
								</svg>
							</button>
							{attach && (
								<AttachMenu
									onClose={() => setAttach(false)}
									onChoose={onFile}
								/>
							)}
						</div>

						{/* Textarea */}
						<div
							style={{
								flex: 1,
								background: 'var(--srch)',
								borderRadius: 22,
								padding: '9px 14px',
								display: 'flex',
								alignItems: 'flex-end',
								minHeight: 38,
							}}
						>
							<textarea
								ref={taRef}
								value={text}
								onChange={e => {
									setText(e.target.value)
									notifyTyping()
								}}
								onKeyDown={onKey}
								placeholder='Xabar yozing...'
								rows={1}
								disabled={sending}
								style={{
									background: 'transparent',
									border: 'none',
									outline: 'none',
									fontSize: 15,
									fontFamily: 'inherit',
									color: 'var(--txt1)',
									resize: 'none',
									flex: 1,
									minWidth: 0,
									lineHeight: 1.5,
									maxHeight: 120,
									overflow: 'auto',
									scrollbarWidth: 'none',
									opacity: sending ? 0.6 : 1,
								}}
							/>
						</div>

						{/* Send / Mic */}
						{hasText ? (
							<button
								onClick={send}
								disabled={sending}
								onMouseDown={e => {
									if (!sending) e.currentTarget.style.transform = 'scale(.92)'
								}}
								onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
								style={{
									width: 38,
									height: 38,
									borderRadius: '50%',
									background: sending ? '#555' : '#0A84FF',
									border: 'none',
									cursor: sending ? 'default' : 'pointer',
									flexShrink: 0,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									boxShadow: sending
										? 'none'
										: '0 2px 10px rgba(10,132,255,.4)',
									transition: 'transform .12s, background .15s',
								}}
							>
								{sending ? (
									<svg
										width='16'
										height='16'
										viewBox='0 0 24 24'
										fill='none'
										style={{ animation: 'spin .8s linear infinite' }}
									>
										<circle
											cx='12'
											cy='12'
											r='9'
											stroke='rgba(255,255,255,.3)'
											strokeWidth='2.5'
										/>
										<path
											d='M12 3a9 9 0 0 1 9 9'
											stroke='white'
											strokeWidth='2.5'
											strokeLinecap='round'
										/>
									</svg>
								) : (
									<svg width='15' height='15' viewBox='0 0 24 24' fill='none'>
										<path
											d='M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z'
											stroke='white'
											strokeWidth='1.8'
											strokeLinecap='round'
											strokeLinejoin='round'
										/>
									</svg>
								)}
							</button>
						) : (
							<button
								onClick={() => !sending && setVoice(true)}
								onMouseEnter={e =>
									(e.currentTarget.style.background = 'var(--hover)')
								}
								onMouseLeave={e =>
									(e.currentTarget.style.background = 'transparent')
								}
								disabled={sending}
								style={{
									width: 38,
									height: 38,
									borderRadius: '50%',
									border: 'none',
									cursor: sending ? 'default' : 'pointer',
									background: 'transparent',
									flexShrink: 0,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'var(--txt2)',
									transition: 'background .15s',
									opacity: sending ? 0.5 : 1,
								}}
							>
								<svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
									<rect
										x='9'
										y='2'
										width='6'
										height='12'
										rx='3'
										stroke='currentColor'
										strokeWidth='1.7'
									/>
									<path
										d='M5 10a7 7 0 0 0 14 0'
										stroke='currentColor'
										strokeWidth='1.7'
										strokeLinecap='round'
									/>
									<path
										d='M12 19v3M8 22h8'
										stroke='currentColor'
										strokeWidth='1.7'
										strokeLinecap='round'
									/>
								</svg>
							</button>
						)}
					</>
				)}
			</div>
		</div>
	)
}

// ─── MAIN PANEL ───────────────────────────────────────────────────────────────
function MainPanel({
	isDark,
	selectedConv,
	page,
	isMobile,
	onMenuOpen,
	onBack,
	convLoading,
}) {
	const dispatch = useDispatch()
	const { chatId: paramId } = useParams()
	const convId = selectedConv?._id || paramId

	// ← meId ni to'g'ridan useGetMeQuery dan olamiz (props dan emas!)
	const { data: me } = useGetMeQuery()
	const meId = me?._id

	const { data: messages = [], isLoading: msgLoading } = useGetMessagesQuery(
		convId,
		{
			skip: !convId,
		},
	)
	const [markConversationRead] = useMarkConversationReadMutation()
	const [markMessageRead] = useMarkMessageReadMutation()

	const meta = selectedConv ? getConvMeta(selectedConv, meId) : null
	const typingMap = useSelector(
		state => state.realtime.typingByConversation?.[convId] || {},
	)
	const typingMeta = buildTypingLabel(typingMap, !!meta?.isGroup)
	const isSocketConnected = useSelector(
		state => state.realtime?.isConnected ?? false,
	)

	const [liveMessages, setLiveMessages] = useState([])
	const [replyTo, setReplyTo] = useState(null)
	const [ctxMenu, setCtxMenu] = useState(null)
	const [newMsgCount, setNewMsgCount] = useState(0)
	const [isAtBottom, setIsAtBottom] = useState(true)
	const normalizedMeId = normalizeId(meId)
	const showMsgSkeleton = msgLoading && liveMessages.length === 0

	const listRef = useRef(null)
	const atBottomRef = useRef(true)
	const seenMessageIdsRef = useRef(new Set())
	const hasHydratedMessagesRef = useRef(false)
	const markReadTimeoutRef = useRef(null)
	const perMessageReadTimersRef = useRef(new Map())

	const scheduleConversationRead = useCallback(
		(delay = 420) => {
			if (!convId) return
			if (markReadTimeoutRef.current) {
				clearTimeout(markReadTimeoutRef.current)
			}
			markReadTimeoutRef.current = setTimeout(() => {
				markConversationRead(convId).catch(() => {})
				markReadTimeoutRef.current = null
			}, delay)
		},
		[convId, markConversationRead],
	)

	const scheduleMessageRead = useCallback(
		messageId => {
			if (!messageId) return
			const exists = perMessageReadTimersRef.current.get(messageId)
			if (exists) return

			const timeout = setTimeout(() => {
				markMessageRead(messageId).catch(() => {})
				perMessageReadTimersRef.current.delete(messageId)
			}, 420)

			perMessageReadTimersRef.current.set(messageId, timeout)
		},
		[markMessageRead],
	)

	// Reset reply when conv changes
	useEffect(() => {
		setReplyTo(null)
		setNewMsgCount(0)
		setLiveMessages([])
		seenMessageIdsRef.current = new Set()
		hasHydratedMessagesRef.current = false
		scheduleConversationRead(80)
		return () => {
			if (markReadTimeoutRef.current) {
				clearTimeout(markReadTimeoutRef.current)
				markReadTimeoutRef.current = null
			}
			for (const timeout of perMessageReadTimersRef.current.values()) {
				clearTimeout(timeout)
			}
			perMessageReadTimersRef.current.clear()
		}
	}, [convId, scheduleConversationRead])

	useEffect(() => {
		if (!Array.isArray(messages)) return

		const unseenMessages = []
		for (const item of messages) {
			const id = getMessageId(item)
			if (!id || seenMessageIdsRef.current.has(id)) continue
			seenMessageIdsRef.current.add(id)
			unseenMessages.push(item)
		}

		setLiveMessages(prev => mergeUniqueMessages(prev, messages))

		if (!hasHydratedMessagesRef.current) {
			hasHydratedMessagesRef.current = true
			return
		}

		const incomingCount = unseenMessages.filter(item => {
			const senderId = normalizeId(item?.sender?._id || item?.sender)
			return senderId && senderId !== normalizedMeId
		}).length

		if (incomingCount === 0) return

		for (const item of unseenMessages) {
			const senderId = normalizeId(item?.sender?._id || item?.sender)
			const messageId = getMessageId(item)
			if (!messageId) continue
			if (!senderId || senderId === normalizedMeId) continue
			if (item?.is_read || item?.read) continue
			scheduleMessageRead(messageId)
		}

		if (atBottomRef.current) {
			scheduleConversationRead(120)
			requestAnimationFrame(() => {
				if (listRef.current) {
					listRef.current.scrollTo({ top: 0, behavior: 'smooth' })
				}
			})
			return
		}

		setNewMsgCount(count => count + incomingCount)
	}, [messages, normalizedMeId, scheduleConversationRead, scheduleMessageRead])

	useEffect(() => {
		dispatch(realtimeActions.setActiveConversation(convId || ''))
		return () => {
			dispatch(realtimeActions.clearActiveConversation())
		}
	}, [convId, dispatch])

	const handleCtx = useCallback(
		(x, y, msg, isMine) => setCtxMenu({ x, y, msg, isMine }),
		[],
	)

	const handleCtxAction = useCallback((action, msg) => {
		if (action === 'reply') {
			setReplyTo(msg)
			return
		}
		if (action === 'copy') {
			navigator.clipboard?.writeText(msg.text || '')
			console.log('📋 copy:', msg.text)
			return
		}
		if (action === 'edit') {
			console.log('✏️ edit:', msg._id, msg.text)
			return
		}
		if (action === 'delete') {
			console.log('🗑️ delete:', msg._id)
			return
		}
	}, [])

	const handleMessageSent = useCallback(response => {
		const sentMessage =
			response?.message ||
			response?.data ||
			(Array.isArray(response) ? response[0] : response)

		if (!sentMessage || !getMessageId(sentMessage)) return
		// Local optimistic rendering removed intentionally.
		// Message list now follows backend/cache flow only.
	}, [])

	const handleListScroll = useCallback(() => {
		const el = listRef.current
		if (!el) return
		const atBottomNow = Math.abs(el.scrollTop) < 80
		atBottomRef.current = atBottomNow
		setIsAtBottom(atBottomNow)
		if (atBottomNow) {
			setNewMsgCount(0)
			scheduleConversationRead(180)
		}
	}, [scheduleConversationRead])

	const scrollToLatest = useCallback(() => {
		const el = listRef.current
		if (!el) return
		el.scrollTo({ top: 0, behavior: 'smooth' })
		setNewMsgCount(0)
		setIsAtBottom(true)
		atBottomRef.current = true
	}, [])

	useEffect(() => {
		if (!convId) return

		const onVisibilityOrFocus = () => {
			if (document.visibilityState !== 'visible') return
			scheduleConversationRead(120)
		}

		window.addEventListener('focus', onVisibilityOrFocus)
		document.addEventListener('visibilitychange', onVisibilityOrFocus)

		return () => {
			window.removeEventListener('focus', onVisibilityOrFocus)
			document.removeEventListener('visibilitychange', onVisibilityOrFocus)
		}
	}, [convId, scheduleConversationRead])

	const dotColor = isDark ? 'rgba(255,255,255,.016)' : 'rgba(0,0,0,.025)'
	const dotBg = `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`

	// Non-chat pages
	if (page !== 'chats') {
		const labels = {
			contacts: 'Kontaktlar',
			settings: 'Sozlamalar',
			calls: "Qo'ng'iroqlar",
			saved: 'Saqlangan',
		}
		const emojis = { contacts: '👥', settings: '⚙️', calls: '📞', saved: '🔖' }
		return (
			<div
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					background: isDark ? '#0d0d0f' : '#dde3eb',
					overflow: 'hidden',
					minWidth: 0,
				}}
			>
				<div
					style={{
						height: 56,
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						padding: '0 12px',
						background: 'var(--hdr)',
						flexShrink: 0,
						boxShadow: isDark
							? '0 1px 0 rgba(255,255,255,.06)'
							: '0 1px 0 rgba(0,0,0,.07)',
					}}
				>
					{isMobile && (
						<button
							onClick={onMenuOpen}
							style={{
								width: 32,
								height: 32,
								borderRadius: '50%',
								border: 'none',
								background: 'transparent',
								cursor: 'pointer',
								color: 'var(--txt2)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
								<path
									d='M3 5h14M3 10h9M3 15h14'
									stroke='currentColor'
									strokeWidth='1.6'
									strokeLinecap='round'
								/>
							</svg>
						</button>
					)}
					<span style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt1)' }}>
						{labels[page] || 'Telegram'}
					</span>
				</div>
				<div
					style={{
						flex: 1,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexDirection: 'column',
						gap: 10,
						color: 'var(--txt3)',
					}}
				>
					<span style={{ fontSize: 46, opacity: 0.2 }}>
						{emojis[page] || '📱'}
					</span>
					<span style={{ fontSize: 14, opacity: 0.65 }}>
						{labels[page]} tez orada
					</span>
				</div>
			</div>
		)
	}

	// No conv selected
	if (!meta) {
		return (
			<div
				style={{
					flex: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'column',
					gap: 14,
					minWidth: 0,
					background: isDark ? '#0d0d0f' : '#dde3eb',
					backgroundImage: dotBg,
					backgroundSize: '22px 22px',
					position: 'relative',
				}}
			>
				{isMobile && (
					<button
						onClick={onMenuOpen}
						style={{
							position: 'absolute',
							top: 14,
							left: 14,
							width: 36,
							height: 36,
							borderRadius: '50%',
							border: 'none',
							background: 'var(--hdr)',
							cursor: 'pointer',
							color: 'var(--txt2)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
							<path
								d='M3 5h14M3 10h9M3 15h14'
								stroke='currentColor'
								strokeWidth='1.6'
								strokeLinecap='round'
							/>
						</svg>
					</button>
				)}
				<svg
					width='68'
					height='68'
					viewBox='0 0 72 72'
					fill='none'
					opacity='.1'
				>
					<path
						d='M36 8C21 8 9 19.4 9 33.5c0 7.8 3.7 14.8 9.5 19.5L17 64l12.5-5.7A32 32 0 0 0 36 59c15 0 27-11.4 27-25.5S51 8 36 8z'
						stroke='var(--txt1)'
						strokeWidth='2.5'
						strokeLinejoin='round'
					/>
				</svg>
				<span style={{ fontSize: 15, color: 'var(--txt3)', fontWeight: 500 }}>
					Suhbat tanlang
				</span>
			</div>
		)
	}

	// ── Chat view ─────────────────────────────────────────────────────────────
	const grouped = groupByDate(liveMessages)

	return (
		<div
			style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				background: isDark ? '#0d0d0f' : '#dde3eb',
				overflow: 'hidden',
				position: 'relative',
				minWidth: 0,
			}}
		>
			{/* HEADER */}
			{convLoading ? (
				<HeaderSkel />
			) : (
				<div
					style={{
						height: 56,
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						padding: '0 12px',
						background: 'var(--hdr)',
						flexShrink: 0,
						boxShadow: isDark
							? '0 1px 0 rgba(255,255,255,.06)'
							: '0 1px 0 rgba(0,0,0,.07)',
					}}
				>
					{isMobile && onBack && (
						<button
							onClick={onBack}
							style={{
								display: 'flex',
								alignItems: 'center',
								background: 'transparent',
								border: 'none',
								cursor: 'pointer',
								color: '#0A84FF',
								padding: '4px 2px',
								flexShrink: 0,
							}}
						>
							<svg width='9' height='15' viewBox='0 0 9 16' fill='none'>
								<path
									d='M8 1L1 8l7 7'
									stroke='currentColor'
									strokeWidth='1.8'
									strokeLinecap='round'
									strokeLinejoin='round'
								/>
							</svg>
						</button>
					)}
					<Av
						name={meta.name}
						color={meta.color}
						avatar={meta.avatar}
						online={meta.online}
						size={36}
						isGroup={meta.isGroup}
					/>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div
							style={{
								fontSize: 15,
								fontWeight: 600,
								color: 'var(--txt1)',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{truncate(meta.name, 30)}
						</div>
						{(() => {
							const hasTyping = typingMeta.hasTyping
							const typingLabel = typingMeta.label
							return (
								<div
									style={{
										fontSize: 12,
										fontWeight: hasTyping ? 500 : 500,
										color: !isSocketConnected
											? '#FF9F0A'
											: hasTyping
												? '#0A84FF'
												: meta.online
													? '#30D158'
													: 'var(--txt3)',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
									}}
								>
									{!isSocketConnected
										? 'Ulanmoqda...'
										: hasTyping
											? typingLabel
											: meta.isGroup
												? `${selectedConv?.members?.length ?? 0} a'zo`
												: meta.online
													? 'online'
													: "so'nggi marta ko'rildi"}
								</div>
							)
						})()}
					</div>
					<div style={{ display: 'flex', gap: 2 }}>
						{[
							<svg
								key='s'
								width='17'
								height='17'
								viewBox='0 0 18 18'
								fill='none'
							>
								<circle
									cx='6.5'
									cy='6.5'
									r='4.5'
									stroke='currentColor'
									strokeWidth='1.4'
								/>
								<path
									d='M10.5 10.5L14 14'
									stroke='currentColor'
									strokeWidth='1.4'
									strokeLinecap='round'
								/>
							</svg>,
							<svg
								key='m'
								width='17'
								height='17'
								viewBox='0 0 20 20'
								fill='none'
							>
								<circle cx='10' cy='5' r='1.4' fill='currentColor' />
								<circle cx='10' cy='10' r='1.4' fill='currentColor' />
								<circle cx='10' cy='15' r='1.4' fill='currentColor' />
							</svg>,
						].map((icon, i) => (
							<button
								key={i}
								style={{
									width: 32,
									height: 32,
									borderRadius: '50%',
									border: 'none',
									background: 'transparent',
									cursor: 'pointer',
									color: 'var(--txt2)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								{icon}
							</button>
						))}
					</div>
				</div>
			)}

			{/* MESSAGES — column-reverse: yangi xabarlar pastda chiqadi */}
			<div
				ref={listRef}
				onScroll={handleListScroll}
				style={{
					flex: 1,
					overflowY: 'auto',
					overflowX: 'hidden',
					scrollbarWidth: 'none',
					backgroundImage: dotBg,
					backgroundSize: '22px 22px',
					display: 'flex',
					flexDirection: 'column-reverse',
				}}
			>
				{/* column-reverse tufayli content tepadagi div pastga itariladi */}
				<div style={{ paddingBottom: 6 }}>
					{showMsgSkeleton ? (
						<MsgSkeletons />
					) : liveMessages.length === 0 ? (
						<div
							style={{
								display: 'flex',
								minHeight: 300,
								alignItems: 'center',
								justifyContent: 'center',
								flexDirection: 'column',
								gap: 12,
								padding: 24,
							}}
						>
							<Av
								name={meta.name}
								color={meta.color}
								avatar={meta.avatar}
								size={68}
								isGroup={meta.isGroup}
							/>
							<p
								style={{
									fontSize: 14,
									color: 'var(--txt3)',
									margin: 0,
									textAlign: 'center',
								}}
							>
								{meta.name} bilan suhbat boshlandi
							</p>
						</div>
					) : (
						grouped.map((item, idx) => {
							if (item.type === 'date')
								return (
									<div
										key={item.key}
										style={{
											display: 'flex',
											justifyContent: 'center',
											padding: '10px 0 4px',
										}}
									>
										<span
											style={{
												fontSize: 12,
												fontWeight: 500,
												color: 'var(--txt3)',
												background: 'var(--date-pill)',
												borderRadius: 12,
												padding: '3px 12px',
											}}
										>
											{item.label}
										</span>
									</div>
								)
							const { msg } = item
							const senderId = normalizeId(msg.sender?._id || msg.sender)
							const isMine = senderId === normalizedMeId
							const prev = grouped[idx - 1]
							const prevMsg = prev?.type === 'msg' ? prev.msg : null
							const prevSenderId = normalizeId(
								prevMsg?.sender?._id || prevMsg?.sender,
							)
							const showAv = !isMine && prevSenderId !== senderId
							return (
								<MsgBubble
									key={getMessageId(msg) || `${msg.createdAt || ''}-${idx}`}
									msg={msg}
									isMine={isMine}
									isDark={isDark}
									showAv={showAv || !prevMsg}
									senderMeta={
										!isMine ? { ...meta, isGroup: meta.isGroup } : null
									}
									onCtx={handleCtx}
									onReply={setReplyTo}
								/>
							)
						})
					)}
				</div>
			</div>

			{!isAtBottom && newMsgCount > 0 && (
				<button
					onClick={scrollToLatest}
					style={{
						position: 'absolute',
						right: 16,
						bottom: 84,
						background: '#0A84FF',
						color: '#fff',
						border: 'none',
						borderRadius: 18,
						padding: '8px 12px',
						fontSize: 13,
						fontWeight: 600,
						cursor: 'pointer',
						boxShadow: '0 6px 18px rgba(10,132,255,.35)',
						zIndex: 5,
					}}
				>
					Yangi xabarlar ({newMsgCount})
				</button>
			)}

			{/* INPUT */}
			<InputBar
				isDark={isDark}
				convId={convId}
				replyTo={replyTo}
				replyName={
					replyTo
						? replyTo.sender?._id === meId
							? 'Siz'
							: [replyTo.sender?.firstname, replyTo.sender?.lastname]
									.filter(Boolean)
									.join(' ') || meta.name
						: null
				}
				onCancelReply={() => setReplyTo(null)}
				onMessageSent={handleMessageSent}
			/>

			{/* CONTEXT MENU */}
			{ctxMenu && (
				<CtxMenu
					{...ctxMenu}
					onClose={() => setCtxMenu(null)}
					onAction={handleCtxAction}
				/>
			)}
		</div>
	)
}

export default memo(MainPanel)
