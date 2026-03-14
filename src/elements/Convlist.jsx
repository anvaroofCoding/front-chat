import { useGetChatsQuery, useGetMeQuery } from '@/store/api'
import { memo, useCallback, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { getColor } from './helpers'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || ''

const TABS = [
	{ label: 'Hammasi', value: 'all' },
	{ label: 'Shaxsiy', value: 'private' },
	{ label: 'Guruhlar', value: 'group' },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const truncate = (str = '', max = 60) =>
	typeof str === 'string' && str.length > max ? str.slice(0, max) + '…' : str

function formatTime(dateStr) {
	if (!dateStr) return ''
	const d = new Date(dateStr),
		now = new Date()
	const diff = now - d
	if (diff < 60_000) return 'Hozir'
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} daq`
	if (d.toDateString() === now.toDateString())
		return d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })
	const yest = new Date(now)
	yest.setDate(now.getDate() - 1)
	if (d.toDateString() === yest.toDateString()) return 'Kecha'
	if (diff < 7 * 86_400_000)
		return ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Sha'][d.getDay()]
	return d.toLocaleDateString('uz', { day: '2-digit', month: '2-digit' })
}

function getConvMeta(conv, meId) {
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
			`${other.firstname || ''} ${other.lastname || ''}`.trim() ||
			'Foydalanuvchi'
		const avatar = other.avatar
			? other.avatar.startsWith('http')
				? other.avatar
				: `${BASE_URL}${other.avatar}`
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

	if (!activeUsers.length) return ''

	const uniqueNames = []
	for (const user of activeUsers) {
		const name = getTypingName(user)
		if (!uniqueNames.includes(name)) {
			uniqueNames.push(name)
		}
	}

	if (!isGroup || uniqueNames.length === 1) {
		return `${uniqueNames[0]} yozmoqda...`
	}

	if (uniqueNames.length === 2) {
		return `${uniqueNames[0]}, ${uniqueNames[1]} yozmoqda...`
	}

	const extraCount = uniqueNames.length - 2
	return `${uniqueNames[0]}, ${uniqueNames[1]} va yana ${extraCount} kishi yozmoqda...`
}

// ─── SKELETON ────────────────────────────────────────────────────────────────

function Skel({ w = '100%', h = 14, r = 7 }) {
	return (
		<div
			className='tg-skel'
			style={{
				width: w,
				height: h,
				borderRadius: r,
				background: 'var(--skel)',
				flexShrink: 0,
			}}
		/>
	)
}

const ConvSkeleton = memo(function ConvSkeleton({ index }) {
	const pairs = [
		['58%', '71%'],
		['44%', '82%'],
		['62%', '55%'],
		['50%', '76%'],
		['66%', '48%'],
		['52%', '68%'],
		['70%', '58%'],
		['46%', '74%'],
	]
	const [nw, pw] = pairs[index % pairs.length]
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				padding: '11px 14px 11px 16px',
				gap: 12,
			}}
		>
			<Skel w={50} h={50} r={25} />
			<div
				style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						gap: 8,
					}}
				>
					<Skel w={nw} h={14} r={7} />
					<Skel w={32} h={11} r={6} />
				</div>
				<Skel w={pw} h={12} r={6} />
			</div>
		</div>
	)
})

// ─── AVATAR ──────────────────────────────────────────────────────────────────

const Avatar = memo(function Avatar({
	name = '?',
	color,
	avatar,
	online,
	size = 50,
	isGroup,
}) {
	const [err, setErr] = useState(false)
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
			{avatar && !err ? (
				<img
					src={avatar}
					alt={truncate(name, 20)}
					style={{ width: '100%', height: '100%', objectFit: 'cover' }}
					onError={() => setErr(true)}
				/>
			) : isGroup ? (
				<svg
					width={size * 0.46}
					height={size * 0.46}
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
						bottom: size > 40 ? 2 : 1,
						right: size > 40 ? 2 : 1,
						width: size * 0.26,
						height: size * 0.26,
						borderRadius: '50%',
						background: '#30D158',
						border: `${size > 40 ? 2.5 : 2}px solid var(--bg)`,
					}}
				/>
			)}
		</div>
	)
})

// ─── CONV ROW ────────────────────────────────────────────────────────────────

const ConvRow = memo(function ConvRow({
	conv,
	meta,
	meId,
	unreadCount,
	selected,
	onSelect,
	isDark,
	typingMap,
}) {
	const [hover, setHover] = useState(false)
	const msg = conv.lastMessage
	const isUnread = unreadCount > 0 || (msg && !msg.read)
	const isMine = msg?.sender?._id === meId || msg?.sender === meId
	const sender =
		!isMine && msg?.sender?.firstname
			? truncate(msg.sender.firstname, 16) + ': '
			: ''
	const typingLabel = buildTypingLabel(typingMap, !!meta?.isGroup)
	const hasTyping = Boolean(typingLabel)

	const preview = hasTyping
		? typingLabel
		: msg?.text
			? truncate(msg.text, 52)
			: msg?.files?.length
				? '📎 Fayl'
				: msg?.video?.length
					? '🎥 Video'
					: null
	const timeStr = formatTime(conv.lastMessageAt || conv.updatedAt)
	const txt2 = isDark ? 'rgba(255,255,255,0.46)' : 'rgba(0,0,0,0.42)'

	return (
		<div
			onClick={() => onSelect(conv)}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			style={{
				display: 'flex',
				alignItems: 'center',
				padding: '9px 14px 9px 16px',
				gap: 12,
				cursor: 'pointer',
				position: 'relative',
				background: selected
					? 'var(--sel)'
					: hover
						? 'var(--hover)'
						: 'transparent',
				transition: 'background 0.13s',
				WebkitTapHighlightColor: 'transparent',
			}}
		>
			{selected && (
				<div
					style={{
						position: 'absolute',
						left: 0,
						top: 8,
						bottom: 8,
						width: 3,
						background: '#0A84FF',
						borderRadius: '0 3px 3px 0',
					}}
				/>
			)}

			<Avatar
				name={meta.name}
				color={meta.color}
				avatar={meta.avatar}
				online={meta.online}
				size={50}
				isGroup={meta.isGroup}
			/>

			<div style={{ flex: 1, minWidth: 0 }}>
				{/* Row 1 */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 6,
						marginBottom: 3,
					}}
				>
					<span
						style={{
							fontSize: 15,
							fontWeight: isUnread ? 700 : 600,
							color: 'var(--txt1)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							flex: 1,
							minWidth: 0,
							lineHeight: 1.35,
						}}
					>
						{truncate(meta.name, 30)}
					</span>
					<span
						style={{
							fontSize: 12,
							flexShrink: 0,
							color: isUnread ? '#0A84FF' : txt2,
							fontWeight: isUnread ? 600 : 400,
						}}
					>
						{timeStr}
					</span>
				</div>

				{/* Row 2 */}
				<div
					style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}
				>
					{isMine && !hasTyping && (
						<svg
							width='15'
							height='11'
							viewBox='0 0 18 13'
							fill='none'
							style={{ flexShrink: 0, opacity: 0.5 }}
						>
							<path
								d='M1 6.5L5.5 11L17 1'
								stroke={txt2}
								strokeWidth='1.7'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
							<path
								d='M9 6.5l4.5 4.5'
								stroke={txt2}
								strokeWidth='1.7'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
					)}
					{sender && (
						<span
							style={{
								fontSize: 14,
								color: '#0A84FF',
								fontWeight: 500,
								flexShrink: 0,
								maxWidth: 86,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{sender}
						</span>
					)}
					<span
						style={{
							fontSize: 14,
							color: hasTyping ? '#0A84FF' : txt2,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							flex: 1,
							minWidth: 0,
						}}
					>
						{preview ?? (
							<em style={{ opacity: 0.4, fontStyle: 'normal' }}>Xabar yo'q</em>
						)}
					</span>
					{unreadCount > 0 && !selected && (
						<div
							style={{
								minWidth: unreadCount > 99 ? 24 : 20,
								height: 20,
								padding: '0 6px',
								borderRadius: 999,
								background: '#0A84FF',
								color: '#fff',
								fontSize: 11,
								fontWeight: 700,
								lineHeight: '20px',
								textAlign: 'center',
								flexShrink: 0,
								boxShadow: '0 0 0 2px var(--bg)',
							}}
						>
							{unreadCount > 99 ? '99+' : unreadCount}
						</div>
					)}
				</div>
			</div>
		</div>
	)
})

// ─── SEARCH BAR ──────────────────────────────────────────────────────────────

const SearchBar = memo(function SearchBar({ value, onChange }) {
	return (
		<div
			style={{
				padding: '7px 12px 8px',
				background: 'var(--hdr)',
				flexShrink: 0,
			}}
		>
			<div
				style={{
					background: 'var(--srch)',
					borderRadius: 11,
					display: 'flex',
					alignItems: 'center',
					padding: '7px 11px',
					gap: 8,
				}}
			>
				<svg width='15' height='15' viewBox='0 0 18 18' fill='none'>
					<circle
						cx='7.5'
						cy='7.5'
						r='5.5'
						stroke='var(--txt2)'
						strokeWidth='1.6'
					/>
					<path
						d='M12 12L16 16'
						stroke='var(--txt2)'
						strokeWidth='1.6'
						strokeLinecap='round'
					/>
				</svg>
				<input
					value={value}
					onChange={e => onChange(e.target.value)}
					placeholder='Qidirish'
					style={{
						background: 'transparent',
						border: 'none',
						outline: 'none',
						fontSize: 15,
						flex: 1,
						fontFamily: 'inherit',
						color: 'var(--txt1)',
						minWidth: 0,
					}}
				/>
				{value && (
					<button
						onClick={() => onChange('')}
						style={{
							background: 'rgba(120,120,128,0.38)',
							border: 'none',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: 0,
							width: 18,
							height: 18,
							borderRadius: '50%',
							flexShrink: 0,
						}}
					>
						<svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
							<path
								d='M2 2l6 6M8 2L2 8'
								stroke='#fff'
								strokeWidth='1.5'
								strokeLinecap='round'
							/>
						</svg>
					</button>
				)}
			</div>
		</div>
	)
})

// ─── TAB BAR ─────────────────────────────────────────────────────────────────

const TabBar = memo(function TabBar({ active, onChange }) {
	return (
		<div
			style={{
				display: 'flex',
				background: 'var(--hdr)',
				borderBottom: '0.5px solid var(--div)',
				flexShrink: 0,
				overflowX: 'auto',
				scrollbarWidth: 'none',
			}}
		>
			{TABS.map(t => (
				<button
					key={t.value}
					onClick={() => onChange(t.value)}
					style={{
						padding: '10px 18px 9px',
						fontSize: 13,
						fontWeight: active === t.value ? 600 : 400,
						color: active === t.value ? '#0A84FF' : 'var(--txt2)',
						background: 'transparent',
						border: 'none',
						borderBottom:
							active === t.value
								? '2px solid #0A84FF'
								: '2px solid transparent',
						cursor: 'pointer',
						whiteSpace: 'nowrap',
						fontFamily: 'inherit',
						transition: 'color 0.15s',
						flexShrink: 0,
						letterSpacing: '-0.1px',
					}}
				>
					{t.label}
				</button>
			))}
		</div>
	)
})

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

function EmptyState({ q }) {
	return (
		<div
			style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 10,
				padding: '48px 24px',
			}}
		>
			<svg
				width='52'
				height='52'
				viewBox='0 0 64 64'
				fill='none'
				style={{ opacity: 0.2 }}
			>
				{q ? (
					<>
						<circle
							cx='27'
							cy='27'
							r='18'
							stroke='var(--txt1)'
							strokeWidth='3'
						/>
						<path
							d='M40 40L56 56'
							stroke='var(--txt1)'
							strokeWidth='3'
							strokeLinecap='round'
						/>
					</>
				) : (
					<path
						d='M32 8C18.7 8 8 18 8 30.5c0 7.5 3.7 14.2 9.4 18.6L16 56l12-5.4A28 28 0 0 0 32 52c13.3 0 24-10 24-21.5S45.3 8 32 8z'
						stroke='var(--txt1)'
						strokeWidth='3'
						strokeLinejoin='round'
					/>
				)}
			</svg>
			<p
				style={{
					fontSize: 15,
					fontWeight: 600,
					margin: 0,
					color: 'var(--txt2)',
				}}
			>
				{q ? 'Natija topilmadi' : "Chatlar yo'q"}
			</p>
			<p
				style={{
					fontSize: 13,
					margin: 0,
					textAlign: 'center',
					maxWidth: 200,
					lineHeight: 1.55,
					color: 'var(--txt3)',
				}}
			>
				{q
					? `"${truncate(q, 22)}" bo'yicha hech narsa yo'q`
					: 'Yangi suhbat boshlash uchun + ni bosing'}
			</p>
		</div>
	)
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

function ConvList({ selectedId, onSelect, isDark }) {
	const [tab, setTab] = useState('all')
	const [q, setQ] = useState('')
	const { typingByConversation = {} } = useSelector(
		state => state.realtime || {},
	)

	// Backend ga type parametr yuboradi: all | private | group
	const {
		data: conversations = [],
		isLoading,
		isFetching,
	} = useGetChatsQuery(tab)
	const { data: me } = useGetMeQuery()
	const meId = me?._id

	const convsWithMeta = useMemo(
		() =>
			(conversations || []).map(conv => ({
				conv,
				meta: getConvMeta(conv, meId),
			})),
		[conversations, meId],
	)

	// Faqat local text search (tab filter backend da)
	const filtered = useMemo(() => {
		if (!q) return convsWithMeta
		const ql = q.toLowerCase()
		return convsWithMeta.filter(
			({ conv, meta }) =>
				meta.name.toLowerCase().includes(ql) ||
				(conv.lastMessage?.text || '').toLowerCase().includes(ql),
		)
	}, [convsWithMeta, q])

	const handleTab = useCallback(t => {
		setTab(t)
		setQ('')
	}, [])
	const handleSearch = useCallback(v => setQ(v), [])
	const handleSelect = useCallback(conv => onSelect(conv), [onSelect])

	const showSkeleton = isLoading && (conversations?.length || 0) === 0

	return (
		<>
			<SearchBar value={q} onChange={handleSearch} />
			<TabBar active={tab} onChange={handleTab} />

			<div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
				{showSkeleton ? (
					Array.from({ length: 8 }).map((_, i) => (
						<ConvSkeleton key={i} index={i} />
					))
				) : filtered.length === 0 ? (
					<EmptyState q={q} />
				) : (
					filtered.map(({ conv, meta }) =>
						(() => {
							const resolvedUnreadCount = conv.unreadCount ?? 0
							return (
								<ConvRow
									key={conv._id}
									conv={conv}
									meta={meta}
									meId={meId}
									unreadCount={resolvedUnreadCount}
									selected={selectedId === conv._id}
									onSelect={handleSelect}
									isDark={isDark}
									typingMap={typingByConversation[conv._id]}
								/>
							)
						})(),
					)
				)}
			</div>
		</>
	)
}

export default memo(ConvList)
