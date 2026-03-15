import { cn } from '@/lib/utils'
import { useGetChatsQuery, useGetMeQuery } from '@/store/api'
import { memo, useCallback, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { getColor } from './helpers'

// ── shadcn/ui ─────────────────────────────────────────────────────────────────
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
	return name || 'Kimdir'
}

function buildTypingLabel(typingMap, isGroup) {
	const now = Date.now()
	const activeUsers = Object.values(typingMap || {}).filter(
		u => now - (u?.lastAt || 0) < 5000,
	)
	if (!activeUsers.length) return ''
	const uniqueNames = []
	for (const user of activeUsers) {
		const name = getTypingName(user)
		if (!uniqueNames.includes(name)) uniqueNames.push(name)
	}
	if (!isGroup || uniqueNames.length === 1)
		return `${uniqueNames[0]} yozmoqda...`
	if (uniqueNames.length === 2)
		return `${uniqueNames[0]}, ${uniqueNames[1]} yozmoqda...`
	const extraCount = uniqueNames.length - 2
	return `${uniqueNames[0]}, ${uniqueNames[1]} va yana ${extraCount} kishi yozmoqda...`
}

// ─── SKELETON ROWS ────────────────────────────────────────────────────────────
const SKEL_PAIRS = [
	['58%', '71%'],
	['44%', '82%'],
	['62%', '55%'],
	['50%', '76%'],
	['66%', '48%'],
	['52%', '68%'],
	['70%', '58%'],
	['46%', '74%'],
]

const ConvSkeleton = memo(function ConvSkeleton({ index }) {
	const [nw, pw] = SKEL_PAIRS[index % SKEL_PAIRS.length]
	return (
		<div className='flex items-center px-4 py-[11px] gap-3'>
			<Skeleton className='w-[50px] h-[50px] rounded-full shrink-0' />
			<div className='flex-1 flex flex-col gap-2.5'>
				<div className='flex justify-between items-center gap-2'>
					<Skeleton className='h-[14px] rounded-[7px]' style={{ width: nw }} />
					<Skeleton className='h-[11px] w-8 rounded-[6px]' />
				</div>
				<Skeleton className='h-[12px] rounded-[6px]' style={{ width: pw }} />
			</div>
		</div>
	)
})

// ─── CONV AVATAR ──────────────────────────────────────────────────────────────
const GroupIcon = ({ size }) => (
	<svg width={size * 0.46} height={size * 0.46} viewBox='0 0 24 24' fill='none'>
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
)

const ConvAvatar = memo(function ConvAvatar({
	name = '?',
	color,
	avatar,
	online,
	size = 50,
	isGroup,
}) {
	const [err, setErr] = useState(false)
	const dotSize = Math.round(size * 0.26)
	const dotPos = size > 40 ? 2 : 1
	const dotBorder = size > 40 ? 'border-[2.5px]' : 'border-2'

	return (
		<div
			className='relative shrink-0 rounded-full flex items-center justify-center font-bold text-white select-none overflow-hidden'
			style={{
				width: size,
				height: size,
				fontSize: size * 0.38,
				background: color || getColor(name),
			}}
		>
			{avatar && !err ? (
				<Avatar className='w-full h-full rounded-full'>
					<AvatarImage
						src={avatar}
						alt={truncate(name, 20)}
						className='object-cover'
						onError={() => setErr(true)}
					/>
					<AvatarFallback
						style={{ background: color || getColor(name) }}
						className='text-white font-bold rounded-full'
					>
						{isGroup ? (
							<GroupIcon size={size} />
						) : (
							(name[0] || '?').toUpperCase()
						)}
					</AvatarFallback>
				</Avatar>
			) : isGroup ? (
				<GroupIcon size={size} />
			) : (
				(name[0] || '?').toUpperCase()
			)}

			{online && (
				<span
					className={cn(
						'absolute rounded-full bg-[#30D158] border-background',
						dotBorder,
					)}
					style={{
						width: dotSize,
						height: dotSize,
						bottom: dotPos,
						right: dotPos,
					}}
				/>
			)}
		</div>
	)
})

// ─── CHECK ICON ───────────────────────────────────────────────────────────────
const CheckIcon = ({ color }) => (
	<svg
		width='15'
		height='11'
		viewBox='0 0 18 13'
		fill='none'
		className='shrink-0 opacity-50'
	>
		<path
			d='M1 6.5L5.5 11L17 1'
			stroke={color}
			strokeWidth='1.7'
			strokeLinecap='round'
			strokeLinejoin='round'
		/>
		<path
			d='M9 6.5l4.5 4.5'
			stroke={color}
			strokeWidth='1.7'
			strokeLinecap='round'
			strokeLinejoin='round'
		/>
	</svg>
)

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
	const txt2Color = isDark ? 'rgba(255,255,255,0.46)' : 'rgba(0,0,0,0.42)'

	return (
		<div
			onClick={() => onSelect(conv)}
			className={cn(
				'relative flex items-center px-3.5 py-[9px] pl-4 gap-3 cursor-pointer',
				'transition-colors duration-[130ms] select-none',
				'active:bg-accent',
				selected ? 'bg-[var(--sel,hsl(var(--accent)))]' : 'hover:bg-accent',
			)}
		>
			{/* Active indicator */}
			{selected && (
				<span className='absolute left-0 top-2 bottom-2 w-[3px] bg-[#0A84FF] rounded-r-[3px]' />
			)}

			<ConvAvatar
				name={meta.name}
				color={meta.color}
				avatar={meta.avatar}
				online={meta.online}
				size={50}
				isGroup={meta.isGroup}
			/>

			<div className='flex-1 min-w-0'>
				{/* Row 1: name + time */}
				<div className='flex items-center justify-between gap-1.5 mb-[3px]'>
					<span
						className={cn(
							'text-[15px] text-foreground truncate flex-1 min-w-0 leading-[1.35]',
							isUnread ? 'font-bold' : 'font-semibold',
						)}
					>
						{truncate(meta.name, 30)}
					</span>
					<span
						className={cn(
							'text-[12px] shrink-0',
							isUnread
								? 'text-[#0A84FF] font-semibold'
								: 'text-muted-foreground',
						)}
					>
						{timeStr}
					</span>
				</div>

				{/* Row 2: preview + badge */}
				<div className='flex items-center gap-1 min-w-0'>
					{isMine && !hasTyping && <CheckIcon color={txt2Color} />}

					{sender && (
						<span className='text-[14px] text-[#0A84FF] font-medium shrink-0 max-w-[86px] truncate'>
							{sender}
						</span>
					)}

					<span
						className={cn(
							'text-[14px] truncate flex-1 min-w-0',
							hasTyping ? 'text-[#0A84FF]' : 'text-muted-foreground',
						)}
					>
						{preview ?? <em className='opacity-40 not-italic'>Xabar yo'q</em>}
					</span>

					{unreadCount > 0 && !selected && (
						<Badge className='min-w-5 h-5 px-1.5 rounded-full bg-[#0A84FF] text-white text-[11px] font-bold leading-none shrink-0 flex items-center justify-center shadow-[0_0_0_2px_hsl(var(--background))]'>
							{unreadCount > 99 ? '99+' : unreadCount}
						</Badge>
					)}
				</div>
			</div>
		</div>
	)
})

// ─── SEARCH BAR ──────────────────────────────────────────────────────────────
const SearchBar = memo(function SearchBar({ value, onChange }) {
	return (
		<div className='px-3 py-[7px] pb-2 bg-background shrink-0'>
			<div className='relative flex items-center'>
				{/* Search icon */}
				<svg
					className='absolute left-3 text-muted-foreground pointer-events-none shrink-0'
					width='15'
					height='15'
					viewBox='0 0 18 18'
					fill='none'
				>
					<circle
						cx='7.5'
						cy='7.5'
						r='5.5'
						stroke='currentColor'
						strokeWidth='1.6'
					/>
					<path
						d='M12 12L16 16'
						stroke='currentColor'
						strokeWidth='1.6'
						strokeLinecap='round'
					/>
				</svg>

				<Input
					value={value}
					onChange={e => onChange(e.target.value)}
					placeholder='Qidirish'
					className='pl-9 pr-8 h-9 rounded-[11px] bg-muted border-0 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0'
				/>

				{value && (
					<button
						onClick={() => onChange('')}
						className='absolute right-2.5 w-[18px] h-[18px] rounded-full bg-muted-foreground/40 flex items-center justify-center shrink-0 hover:bg-muted-foreground/60 transition-colors'
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
		<div className='bg-background border-b border-border/50 shrink-0'>
			<Tabs value={active} onValueChange={onChange}>
				<TabsList className='w-full h-auto bg-transparent rounded-none p-0 gap-0'>
					{TABS.map(t => (
						<TabsTrigger
							key={t.value}
							value={t.value}
							className={cn(
								'flex-1 rounded-none px-[18px] py-[10px] pb-[9px] text-[13px] font-normal',
								'border-b-2 border-transparent bg-transparent',
								'data-[state=active]:border-[#0A84FF] data-[state=active]:text-[#0A84FF]',
								'data-[state=active]:font-semibold data-[state=active]:shadow-none',
								'data-[state=active]:bg-transparent',
								'text-muted-foreground transition-colors duration-150',
							)}
						>
							{t.label}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
		</div>
	)
})

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
function EmptyState({ q }) {
	return (
		<div className='flex-1 flex flex-col items-center justify-center gap-2.5 px-6 py-12'>
			<svg
				width='52'
				height='52'
				viewBox='0 0 64 64'
				fill='none'
				className='opacity-20 text-foreground'
			>
				{q ? (
					<>
						<circle
							cx='27'
							cy='27'
							r='18'
							stroke='currentColor'
							strokeWidth='3'
						/>
						<path
							d='M40 40L56 56'
							stroke='currentColor'
							strokeWidth='3'
							strokeLinecap='round'
						/>
					</>
				) : (
					<path
						d='M32 8C18.7 8 8 18 8 30.5c0 7.5 3.7 14.2 9.4 18.6L16 56l12-5.4A28 28 0 0 0 32 52c13.3 0 24-10 24-21.5S45.3 8 32 8z'
						stroke='currentColor'
						strokeWidth='3'
						strokeLinejoin='round'
					/>
				)}
			</svg>

			<p className='text-[15px] font-semibold text-muted-foreground m-0'>
				{q ? 'Natija topilmadi' : "Chatlar yo'q"}
			</p>
			<p className='text-[13px] text-muted-foreground/60 text-center max-w-[200px] leading-[1.55] m-0'>
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

	const { data: conversations = [], isLoading } = useGetChatsQuery(tab)
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
		<div className='flex flex-col h-full overflow-hidden'>
			<SearchBar value={q} onChange={handleSearch} />
			<TabBar active={tab} onChange={handleTab} />

			<ScrollArea className='flex-1'>
				{showSkeleton ? (
					Array.from({ length: 8 }).map((_, i) => (
						<ConvSkeleton key={i} index={i} />
					))
				) : filtered.length === 0 ? (
					<EmptyState q={q} />
				) : (
					filtered.map(({ conv, meta }) => (
						<ConvRow
							key={conv._id}
							conv={conv}
							meta={meta}
							meId={meId}
							unreadCount={conv.unreadCount ?? 0}
							selected={selectedId === conv._id}
							onSelect={handleSelect}
							isDark={isDark}
							typingMap={typingByConversation[conv._id]}
						/>
					))
				)}
			</ScrollArea>
		</div>
	)
}

export default memo(ConvList)
