/**
 * ChatWindow.jsx
 * Production-grade realtime chat — Socket.IO + REST API
 *
 * Props:
 *   socket        — socket.io-client instance (already connected)
 *   conv          — full conversation object
 *   isDark        — boolean
 *   isMobile      — boolean
 *   onBack        — () => void  (mobile back)
 *   onMenuOpen    — () => void  (mobile hamburger)
 */

import { useGetMeQuery, useSendMessageMutation } from '@/store/api'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getColor } from './helpers'
import { MsgMedia } from './MediaViewer'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || ''
const TYPING_DELAY_MS = 800 // yozishni to'xtatgandan keyin typing_stop

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

function groupByDate(messages) {
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

function getConvMeta(conv, meId) {
	if (!conv) return null
	if (conv.type === 'group' || conv.groupId) {
		return {
			name: conv.groupId?.name || 'Guruh',
			color: getColor(conv._id),
			isGroup: true,
			avatar: null,
			online: false,
		}
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

// ─── TYPING INDICATOR TEXT ────────────────────────────────────────────────────
function buildTypingText(typers) {
	if (!typers.length) return ''
	const names = typers.map(t => t.firstname || 'Foydalanuvchi')
	if (names.length === 1) return `${names[0]} yozmoqda...`
	if (names.length === 2) return `${names[0]}, ${names[1]} yozmoqda...`
	const extra = names.length - 2
	return `${names[0]}, ${names[1]} va yana ${extra} kishi yozmoqda...`
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

const SKEL_PATTERN = [
	false,
	true,
	false,
	false,
	true,
	true,
	false,
	true,
	false,
	true,
]

function MsgSkeletons() {
	return (
		<>
			{SKEL_PATTERN.map((mine, i) => (
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

// ─── AVATAR ───────────────────────────────────────────────────────────────────
const Av = memo(function Av({
	name = '?',
	color,
	avatar,
	online,
	size = 36,
	isGroup,
}) {
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
const CtxMenu = memo(function CtxMenu({
	x,
	y,
	msg,
	isMine,
	onClose,
	onAction,
}) {
	const ref = useRef(null)
	const [pos, setPos] = useState({ top: y, left: x })

	useEffect(() => {
		if (!ref.current) return
		const { width, height } = ref.current.getBoundingClientRect()
		setPos({
			top: y + height > window.innerHeight - 8 ? y - height : y,
			left: x + width > window.innerWidth - 8 ? x - width : x,
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
				zIndex: 9998,
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

// ─── REPLY STRIP (input qismida) ──────────────────────────────────────────────
function ReplyStrip({ msg, name, onCancel }) {
	const preview =
		msg.text ||
		(msg.files?.length
			? '📎 Fayl'
			: msg.video?.length
				? '🎥 Video'
				: '🎤 Audio')
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
					flexShrink: 0,
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

// ─── REPLY QUOTE (bubble ichida) ──────────────────────────────────────────────
function ReplyQuote({ replyTo }) {
	if (!replyTo) return null
	const name =
		[replyTo.sender?.firstname, replyTo.sender?.lastname]
			.filter(Boolean)
			.join(' ') || 'Xabar'
	const preview =
		replyTo.text ||
		(replyTo.files?.length
			? '📎 Fayl'
			: replyTo.video?.length
				? '🎥 Video'
				: '🎤 Audio')
	return (
		<div
			style={{
				display: 'flex',
				gap: 8,
				marginBottom: 7,
				padding: '5px 9px',
				background: '#D1D5DB',
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
						color: '#374151',
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

// ─── TYPING INDICATOR ─────────────────────────────────────────────────────────
function TypingIndicator({ text }) {
	if (!text) return null
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				padding: '6px 16px 4px',
				animation: 'slideUp .18s ease',
			}}
		>
			{/* Bouncing dots */}
			<div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
				{[0, 1, 2].map(i => (
					<div
						key={i}
						style={{
							width: 5,
							height: 5,
							borderRadius: '50%',
							background: '#0A84FF',
							opacity: 0.7,
							animation: `typingBounce .9s ease-in-out ${i * 0.15}s infinite`,
						}}
					/>
				))}
			</div>
			<span style={{ fontSize: 13, color: 'var(--txt3)', fontStyle: 'italic' }}>
				{text}
			</span>
		</div>
	)
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
const MsgBubble = memo(function MsgBubble({
	msg,
	isMine,
	isDark,
	showAv,
	senderMeta,
	onCtx,
	onReply,
	isPending,
}) {
	const hasText = msg.text?.trim().length > 0
	const hasMedia = !!(msg.files?.length || msg.video?.length || msg.audio)
	const mediaOnly =
		hasMedia &&
		!hasText &&
		!msg.replyTo &&
		!msg.audio &&
		(msg.files?.every(f => {
			const m = f.mimetype || '',
				u = f.url || ''
			return m.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(u)
		}) ||
			(!msg.files?.length && msg.video?.length > 0))

	const bg = isMine
		? isPending
			? '#3a7fd4'
			: '#0A84FF'
		: isDark
			? '#2c2c2e'
			: '#fff'
	const br = isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
	const tc = isMine ? '#fff' : 'var(--txt1)'
	const dim = isMine ? 'rgba(255,255,255,0.62)' : 'var(--txt3)'

	const openCtx = e => {
		e.preventDefault()
		onCtx(e.clientX, e.clientY, msg, isMine)
	}
	const touchCtx = e => {
		const t = e.touches[0]
		const tm = setTimeout(() => onCtx(t.clientX, t.clientY, msg, isMine), 600)
		const cl = () => clearTimeout(tm)
		document.addEventListener('touchend', cl, { once: true })
		document.addEventListener('touchmove', cl, { once: true })
	}

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
					: { marginTop: 3 }),
			}}
		>
			<span
				style={{ fontSize: 11, color: overlay ? 'rgba(255,255,255,0.9)' : dim }}
			>
				{msgTime(msg.createdAt)}
			</span>
			{isMine &&
				(isPending ? (
					<svg
						width='12'
						height='12'
						viewBox='0 0 24 24'
						fill='none'
						opacity='.6'
					>
						<circle
							cx='12'
							cy='12'
							r='9'
							stroke='rgba(255,255,255,.5)'
							strokeWidth='2'
						/>
						<path
							d='M12 7v5l3 3'
							stroke='rgba(255,255,255,.8)'
							strokeWidth='1.8'
							strokeLinecap='round'
						/>
					</svg>
				) : (
					<svg
						width='15'
						height='11'
						viewBox='0 0 18 13'
						fill='none'
						opacity='.85'
					>
						<path
							d='M1 6.5L5.5 11L17 1'
							stroke={
								overlay ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.85)'
							}
							strokeWidth='1.7'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
						<path
							d='M9 6.5l4.5 4.5'
							stroke={
								overlay ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.85)'
							}
							strokeWidth='1.7'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
				))}
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
				opacity: isPending ? 0.75 : 1,
				transition: 'opacity .2s',
			}}
		>
			{!isMine && (
				<div style={{ width: 28, flexShrink: 0, marginBottom: 2 }}>
					{showAv && senderMeta && <Av {...senderMeta} size={28} />}
				</div>
			)}

			<div style={{ position: 'relative', maxWidth: 'min(72%, 420px)' }}>
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
						<TimeRow overlay />
					</div>
				) : (
					<div
						onContextMenu={openCtx}
						onTouchStart={touchCtx}
						style={{
							background: bg,
							borderRadius: br,
							cursor: 'default',
							userSelect: 'text',
							position: 'relative',
							overflow: 'hidden',
							boxShadow: isDark
								? '0 1px 2px rgba(0,0,0,0.25)'
								: '0 1px 3px rgba(0,0,0,0.08)',
						}}
					>
						{msg.replyTo && (
							<div style={{ padding: '8px 11px 0' }}>
								<ReplyQuote replyTo={msg.replyTo} />
							</div>
						)}
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
						<div style={{ padding: '0 11px 8px' }}>
							<TimeRow overlay={false} />
						</div>
					</div>
				)}

				{/* Hover reply */}
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
})

// ─── DATE DIVIDER ─────────────────────────────────────────────────────────────
const DateDiv = memo(function DateDiv({ label }) {
	return (
		<div
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
				{label}
			</span>
		</div>
	)
})

// ─── ATTACH MENU ──────────────────────────────────────────────────────────────
const AttachMenu = memo(function AttachMenu({ onClose, onChoose }) {
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
							e.target.value = ''
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
})

// ─── VOICE RECORDER ───────────────────────────────────────────────────────────
const VoiceRec = memo(function VoiceRec({ onCancel, onSend }) {
	const [secs, setSecs] = useState(0)
	const [ready, setReady] = useState(false)
	const [stopping, setStopping] = useState(false)

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
					if (e.data?.size > 0) chunksRef.current.push(e.data)
				}
				rec.start(200)
				setReady(true)
			})
			.catch(err => {
				console.warn("🎤 Mic ruxsati yo'q:", err)
				onCancelRef.current()
			})

		interval = setInterval(() => setSecs(s => s + 1), 1000)
		return () => {
			clearInterval(interval)
			streamRef.current?.getTracks().forEach(t => t.stop())
		}
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	const handleSend = useCallback(() => {
		const rec = recRef.current
		if (!rec || !ready || stopping) return
		setStopping(true)

		const buildBlob = () => {
			const chunks = chunksRef.current
			if (!chunks.length) {
				console.warn("🎤 Chunks yo'q")
				onCancelRef.current()
				return
			}
			const blob = new Blob(chunks, { type: mimeRef.current || 'audio/webm' })
			onSendRef.current(blob)
		}

		if (rec.state !== 'inactive') {
			rec.addEventListener('stop', buildBlob, { once: true })
			rec.stop()
			streamRef.current?.getTracks().forEach(t => t.stop())
		} else {
			buildBlob()
		}
	}, [ready, stopping])

	const handleCancel = useCallback(() => {
		const rec = recRef.current
		if (rec && rec.state !== 'inactive') rec.stop()
		streamRef.current?.getTracks().forEach(t => t.stop())
		onCancelRef.current()
	}, [])

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
			<button
				onClick={handleSend}
				disabled={!ready || stopping}
				style={{
					width: 40,
					height: 40,
					borderRadius: '50%',
					border: 'none',
					flexShrink: 0,
					cursor: ready && !stopping ? 'pointer' : 'default',
					background: ready && !stopping ? '#0A84FF' : '#555',
					color: '#fff',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					boxShadow:
						ready && !stopping ? '0 2px 10px rgba(10,132,255,.45)' : 'none',
					transition: 'background .2s',
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
})

// ─── CHAT WINDOW ──────────────────────────────────────────────────────────────
export default memo(function ChatWindow({
	socket,
	conv,
	isDark,
	isMobile,
	onBack,
	onMenuOpen,
}) {
	const { data: me } = useGetMeQuery()
	const [sendMessage] = useSendMessageMutation()

	const meId = me?._id
	const convId = conv?._id
	const meta = useMemo(() => getConvMeta(conv, meId), [conv, meId])

	// ── Messages state ────────────────────────────────────────────────────────
	const [messages, setMessages] = useState([])
	const [loading, setLoading] = useState(true)
	const [pending, setPending] = useState(new Set()) // optimistic ids

	// ── Typing state ──────────────────────────────────────────────────────────
	const [typers, setTypers] = useState([]) // [{userId, firstname}]
	const [isTyping, setIsTyping] = useState(false)

	// ── Scroll state ──────────────────────────────────────────────────────────
	const [atBottom, setAtBottom] = useState(true)
	const [newMsgCount, setNewMsgCount] = useState(0)

	// ── UI state ──────────────────────────────────────────────────────────────
	const [replyTo, setReplyTo] = useState(null)
	const [ctxMenu, setCtxMenu] = useState(null)
	const [text, setText] = useState('')
	const [attach, setAttach] = useState(false)
	const [voice, setVoice] = useState(false)
	const [sending, setSending] = useState(false)

	// ── Refs ──────────────────────────────────────────────────────────────────
	const listRef = useRef(null) // messages scroll container
	const taRef = useRef(null) // textarea
	const typingTimer = useRef(null) // debounce
	const isTypingRef = useRef(false) // sync ref for cleanup
	const atBottomRef = useRef(true)
	const seenIds = useRef(new Set()) // dedupe

	const hasText = text.trim().length > 0

	// ── Fetch initial messages ─────────────────────────────────────────────────
	useEffect(() => {
		if (!convId) return
		setLoading(true)
		setMessages([])
		seenIds.current = new Set()

		fetch(`${BASE_URL}/api/messages?id=${convId}`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
			},
		})
			.then(r => r.json())
			.then(data => {
				if (!Array.isArray(data)) return
				const msgs = data.filter(m => {
					if (seenIds.current.has(m._id)) return false
					seenIds.current.add(m._id)
					return true
				})
				setMessages(msgs)
			})
			.catch(err => console.error('Messages fetch error:', err))
			.finally(() => setLoading(false))
	}, [convId])

	// ── Socket: join / leave + listeners ──────────────────────────────────────
	useEffect(() => {
		if (!socket || !convId || !me) return

		const payload = {
			conversationId: convId,
			userId: me._id,
			firstname: me.firstname,
			lastname: me.lastname,
			avatar: me.avatar,
		}

		// Join
		socket.emit('join_conversation', payload)

		// New message handler — dedupe by _id
		const onNewMessage = msg => {
			if (!msg?._id) return
			if (seenIds.current.has(msg._id)) return
			seenIds.current.add(msg._id)

			setMessages(prev => [...prev, msg])

			// Auto-scroll faqat user pastda bo'lsa
			if (atBottomRef.current) {
				requestAnimationFrame(scrollToBottom)
			} else {
				setNewMsgCount(c => c + 1)
			}
		}

		socket.on('message:new', onNewMessage)
		socket.on('receive_message', onNewMessage)

		// Typing handlers
		const onTypingStart = ({ userId, firstname }) => {
			if (userId === meId) return
			setTypers(prev => {
				if (prev.find(t => t.userId === userId)) return prev
				return [...prev, { userId, firstname }]
			})
		}
		const onTypingStop = ({ userId }) => {
			if (userId === meId) return
			setTypers(prev => prev.filter(t => t.userId !== userId))
		}

		socket.on('typing_start', onTypingStart)
		socket.on('typing_stop', onTypingStop)

		return () => {
			// Leave + stop typing
			socket.emit('leave_conversation', payload)
			if (isTypingRef.current) {
				socket.emit('typing_stop', payload)
				isTypingRef.current = false
			}
			clearTimeout(typingTimer.current)

			socket.off('message:new', onNewMessage)
			socket.off('receive_message', onNewMessage)
			socket.off('typing_start', onTypingStart)
			socket.off('typing_stop', onTypingStop)
		}
	}, [socket, convId, me, meId])

	// ── Reset state when conv changes ─────────────────────────────────────────
	useEffect(() => {
		setReplyTo(null)
		setTypers([])
		setNewMsgCount(0)
		setText('')
		setIsTyping(false)
		isTypingRef.current = false
		clearTimeout(typingTimer.current)
	}, [convId])

	// ── Textarea auto-resize ───────────────────────────────────────────────────
	useEffect(() => {
		const el = taRef.current
		if (!el) return
		el.style.height = 'auto'
		el.style.height = Math.min(el.scrollHeight, 120) + 'px'
	}, [text])

	// ── Scroll detection ──────────────────────────────────────────────────────
	const handleScroll = useCallback(() => {
		const el = listRef.current
		if (!el) return
		// column-reverse: scrollTop negative in some browsers — check both
		const bottom = Math.abs(el.scrollTop) < 80
		atBottomRef.current = bottom
		setAtBottom(bottom)
		if (bottom) setNewMsgCount(0)
	}, [])

	const scrollToBottom = useCallback(() => {
		const el = listRef.current
		if (!el) return
		el.scrollTo({ top: 0, behavior: 'smooth' })
		setNewMsgCount(0)
		setAtBottom(true)
		atBottomRef.current = true
	}, [])

	// ── Typing emit ───────────────────────────────────────────────────────────
	const emitTypingStart = useCallback(() => {
		if (!socket || !convId || !me) return
		if (!isTypingRef.current) {
			socket.emit('typing_start', {
				conversationId: convId,
				userId: me._id,
				firstname: me.firstname,
				lastname: me.lastname,
				avatar: me.avatar,
			})
			isTypingRef.current = true
			setIsTyping(true)
		}
		clearTimeout(typingTimer.current)
		typingTimer.current = setTimeout(() => {
			socket.emit('typing_stop', {
				conversationId: convId,
				userId: me._id,
				firstname: me.firstname,
				lastname: me.lastname,
				avatar: me.avatar,
			})
			isTypingRef.current = false
			setIsTyping(false)
		}, TYPING_DELAY_MS)
	}, [socket, convId, me])

	const handleTextChange = useCallback(
		e => {
			setText(e.target.value)
			if (e.target.value.trim()) emitTypingStart()
		},
		[emitTypingStart],
	)

	// ── Build FormData ─────────────────────────────────────────────────────────
	const buildFd = useCallback(
		({ text: t, files, audioBlob, videos }) => {
			const fd = new FormData()
			if (convId) fd.append('conversationId', convId)
			if (replyTo?._id) fd.append('replyTo', replyTo._id)
			if (t?.trim()) fd.append('text', t.trim())
			if (files?.length) Array.from(files).forEach(f => fd.append('files', f))
			if (videos?.length) Array.from(videos).forEach(v => fd.append('video', v))
			if (audioBlob instanceof Blob) fd.append('audio', audioBlob, 'voice.webm')
			return fd
		},
		[convId, replyTo],
	)

	// ── Send text ──────────────────────────────────────────────────────────────
	const sendText = useCallback(async () => {
		const t = text.trim()
		if (!t || sending || !convId) return
		setSending(true)

		// Stop typing immediately
		clearTimeout(typingTimer.current)
		if (isTypingRef.current && socket && me) {
			socket.emit('typing_stop', {
				conversationId: convId,
				userId: me._id,
				firstname: me.firstname,
				lastname: me.lastname,
			})
			isTypingRef.current = false
			setIsTyping(false)
		}

		// Optimistic message
		const tempId = `pending-${Date.now()}`
		const optimistic = {
			_id: tempId,
			text: t,
			createdAt: new Date().toISOString(),
			sender: {
				_id: meId,
				firstname: me?.firstname,
				lastname: me?.lastname,
				avatar: me?.avatar,
			},
			conversationId: convId,
			files: [],
			video: [],
			read: false,
			replyTo: replyTo || null,
		}
		seenIds.current.add(tempId)
		setMessages(prev => [...prev, optimistic])
		setPending(p => new Set([...p, tempId]))
		scrollToBottom()

		setText('')
		setReplyTo(null)

		try {
			const fd = buildFd({ text: t })
			const result = await sendMessage(fd).unwrap()

			// Optimistic ni haqiqiy bilan almashtir
			if (result?._id) {
				seenIds.current.add(result._id)
				setMessages(prev => prev.map(m => (m._id === tempId ? result : m)))
			} else {
				setMessages(prev => prev.filter(m => m._id !== tempId))
				seenIds.current.delete(tempId)
			}
		} catch (err) {
			console.error('Send error:', err)
			// Optimistic ni olib tashla
			setMessages(prev => prev.filter(m => m._id !== tempId))
			seenIds.current.delete(tempId)
			setText(t) // qaytarib ber
		} finally {
			setSending(false)
			setPending(p => {
				const n = new Set(p)
				n.delete(tempId)
				return n
			})
		}
	}, [
		text,
		sending,
		convId,
		meId,
		me,
		socket,
		replyTo,
		buildFd,
		sendMessage,
		scrollToBottom,
	])

	const onKey = e => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			sendText()
		}
	}

	// ── Send file ──────────────────────────────────────────────────────────────
	const sendFile = useCallback(
		async (type, fileList) => {
			if (!fileList?.length || sending || !convId) return
			setSending(true)
			try {
				const fd =
					type === 'video'
						? buildFd({ videos: fileList })
						: buildFd({ files: fileList })
				const result = await sendMessage(fd).unwrap()
				if (result?._id && !seenIds.current.has(result._id)) {
					seenIds.current.add(result._id)
					setMessages(prev => [...prev, result])
					scrollToBottom()
				}
			} catch (err) {
				console.error('File send error:', err)
			} finally {
				setSending(false)
			}
		},
		[sending, convId, buildFd, sendMessage, scrollToBottom],
	)

	// ── Send voice ─────────────────────────────────────────────────────────────
	const sendVoice = useCallback(
		async audioBlob => {
			if (!audioBlob || sending || !convId) return
			setSending(true)
			setVoice(false)
			try {
				const fd = buildFd({ audioBlob })
				const result = await sendMessage(fd).unwrap()
				if (result?._id && !seenIds.current.has(result._id)) {
					seenIds.current.add(result._id)
					setMessages(prev => [...prev, result])
					scrollToBottom()
				}
			} catch (err) {
				console.error('Voice send error:', err)
			} finally {
				setSending(false)
			}
		},
		[sending, convId, buildFd, sendMessage, scrollToBottom],
	)

	// ── Context menu actions ───────────────────────────────────────────────────
	const handleCtx = useCallback(
		(x, y, msg, isMine) => setCtxMenu({ x, y, msg, isMine }),
		[],
	)

	const handleCtxAction = useCallback((action, msg) => {
		if (action === 'reply') {
			setReplyTo(msg)
		}
		if (action === 'copy') {
			navigator.clipboard?.writeText(msg.text || '')
		}
		if (action === 'edit') {
			console.log('✏️ edit:', msg._id)
		}
		if (action === 'delete') {
			console.log('🗑️ delete:', msg._id)
		}
	}, [])

	// ── Grouped messages ───────────────────────────────────────────────────────
	const grouped = useMemo(() => groupByDate(messages), [messages])

	const typingText = useMemo(() => buildTypingText(typers), [typers])

	const dotColor = isDark ? 'rgba(255,255,255,.016)' : 'rgba(0,0,0,.025)'
	const dotBg = `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`

	if (!conv || !meta) return null

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
			{/* ── HEADER ── */}
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
				{isMobile && !onBack && onMenuOpen && (
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
					<div
						style={{
							fontSize: 12,
							fontWeight: 500,
							color: typingText
								? '#0A84FF'
								: meta.online
									? '#30D158'
									: 'var(--txt3)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							transition: 'color .2s',
						}}
					>
						{typingText ||
							(meta.isGroup
								? `${conv.members?.length ?? 0} a'zo`
								: meta.online
									? 'online'
									: "so'nggi marta ko'rildi")}
					</div>
				</div>
				<div style={{ display: 'flex', gap: 2 }}>
					{[
						<svg key='s' width='17' height='17' viewBox='0 0 18 18' fill='none'>
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
						<svg key='m' width='17' height='17' viewBox='0 0 20 20' fill='none'>
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

			{/* ── MESSAGES ── */}
			<div
				ref={listRef}
				onScroll={handleScroll}
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
				<div style={{ paddingBottom: 6 }}>
					{/* Typing indicator */}
					{typers.length > 0 && <TypingIndicator text={typingText} />}

					{loading ? (
						<MsgSkeletons />
					) : messages.length === 0 ? (
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
								return <DateDiv key={item.key} label={item.label} />
							const { msg } = item
							const isMine = msg.sender?._id === meId
							const prev = grouped[idx - 1]
							const prevMsg = prev?.type === 'msg' ? prev.msg : null
							const showAv = !isMine && prevMsg?.sender?._id !== msg.sender?._id
							const isPendingMsg = pending.has(msg._id)
							return (
								<MsgBubble
									key={msg._id}
									msg={msg}
									isMine={isMine}
									isDark={isDark}
									showAv={showAv || !prevMsg}
									senderMeta={
										!isMine ? { ...meta, isGroup: meta.isGroup } : null
									}
									onCtx={handleCtx}
									onReply={setReplyTo}
									isPending={isPendingMsg}
								/>
							)
						})
					)}
				</div>
			</div>

			{/* ── NEW MESSAGES BUTTON ── */}
			{!atBottom && newMsgCount > 0 && (
				<div
					style={{
						position: 'absolute',
						bottom: 80,
						left: '50%',
						transform: 'translateX(-50%)',
						zIndex: 50,
						animation: 'slideUp .2s ease',
					}}
				>
					<button
						onClick={scrollToBottom}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 6,
							padding: '8px 14px',
							borderRadius: 20,
							border: 'none',
							cursor: 'pointer',
							background: '#0A84FF',
							color: '#fff',
							fontSize: 13,
							fontWeight: 600,
							fontFamily: 'inherit',
							boxShadow: '0 4px 16px rgba(10,132,255,.5)',
						}}
					>
						<svg width='14' height='14' viewBox='0 0 24 24' fill='none'>
							<path
								d='M12 5v14M5 12l7 7 7-7'
								stroke='white'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
						{newMsgCount} yangi xabar
					</button>
				</div>
			)}

			{/* ── INPUT AREA ── */}
			<div
				style={{
					background: 'var(--hdr)',
					flexShrink: 0,
					boxShadow: isDark
						? '0 -1px 0 rgba(255,255,255,.06)'
						: '0 -1px 0 rgba(0,0,0,.07)',
					position: 'relative',
				}}
			>
				{/* Reply strip */}
				{replyTo && (
					<ReplyStrip
						msg={replyTo}
						name={
							replyTo.sender?._id === meId
								? 'Siz'
								: [replyTo.sender?.firstname, replyTo.sender?.lastname]
										.filter(Boolean)
										.join(' ') || meta.name
						}
						onCancel={() => setReplyTo(null)}
					/>
				)}

				<div
					style={{
						display: 'flex',
						alignItems: 'flex-end',
						padding: '8px 10px 10px',
						gap: 6,
					}}
				>
					{voice ? (
						<VoiceRec onCancel={() => setVoice(false)} onSend={sendVoice} />
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
										onChoose={sendFile}
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
									onChange={handleTextChange}
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
										opacity: sending ? 0.7 : 1,
									}}
								/>
							</div>

							{/* Send / Mic */}
							{hasText ? (
								<button
									onClick={sendText}
									disabled={sending}
									onMouseDown={e => {
										if (!sending) e.currentTarget.style.transform = 'scale(.92)'
									}}
									onMouseUp={e =>
										(e.currentTarget.style.transform = 'scale(1)')
									}
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

			{/* Context menu */}
			{ctxMenu && (
				<CtxMenu
					{...ctxMenu}
					onClose={() => setCtxMenu(null)}
					onAction={handleCtxAction}
				/>
			)}
		</div>
	)
})

/*
── global CSS ─────────────────────────────────────────────────────────────────

@keyframes ctxIn        { from{transform:scale(.85);opacity:0} to{transform:scale(1);opacity:1} }
@keyframes slideUp      { from{transform:translateY(6px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes tgFadeIn     { from{opacity:0} to{opacity:1} }
@keyframes tgPulse      { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes spin         { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes typingBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }

.tg-row:hover .tg-rp   { opacity: 1 !important; }

── :root ichida ──────────────────────────────────────────────────────────────

--ctx-bg:    (dark) #1c1c1e  /  (light) #ffffff
--date-pill: (dark) rgba(255,255,255,.12)  /  (light) rgba(0,0,0,.1)

── Ishlatish ─────────────────────────────────────────────────────────────────

import { io } from 'socket.io-client'
import ChatWindow from './ChatWindow'

// App.jsx yoki Layout.jsx ichida bir marta yarating:
const socket = io(import.meta.env.VITE_SOCKET_URL, {
	auth: { token: localStorage.getItem('token') },
	autoConnect: true,
})

// ChatWindow ga bering:
<ChatWindow
	socket={socket}
	conv={selectedConv}
	isDark={isDark}
	isMobile={isMobile}
	onBack={() => setMobileView('list')}
	onMenuOpen={() => setDrawerOpen(true)}
/>
*/
