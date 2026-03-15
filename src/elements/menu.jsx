import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useGetChatsQuery, useGetMeQuery } from '@/store/api'
import {
	CheckCheck,
	Edit3,
	Layers2,
	MessageCircle,
	Pin,
	Search,
	SlidersHorizontal,
	Users2,
	VolumeX,
	X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'

function isGroupChat(chat) {
	return (
		chat?.type === 'group' || Boolean(chat?.groupId) || chat?.isGroup === true
	)
}

function normalizeId(id) {
	if (!id) return ''
	if (typeof id === 'string') return id
	if (typeof id === 'number') return String(id)
	if (typeof id === 'object') return id._id || id.id || ''
	return ''
}

function formatTime(value) {
	if (!value) return ''
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return ''

	const now = new Date()
	const diff = now - date
	const oneDay = 24 * 60 * 60 * 1000

	if (diff < oneDay) {
		return date.toLocaleTimeString('uz', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		})
	}

	if (diff < 7 * oneDay) {
		return date.toLocaleDateString('uz', { weekday: 'short' })
	}

	return date.toLocaleDateString('uz', {
		day: '2-digit',
		month: '2-digit',
	})
}

function getSenderLabel(sender) {
	if (!sender) return ''
	if (typeof sender === 'string') return sender
	if (typeof sender === 'object') {
		const fullName = [sender.firstname, sender.lastname]
			.filter(Boolean)
			.join(' ')
			.trim()
		return fullName || sender.name || sender.username || ''
	}
	return String(sender)
}

function getOtherMember(chat, meId) {
	const members = Array.isArray(chat?.members) ? chat.members : []
	if (!members.length) return null
	return (
		members.find(member => {
			const id = normalizeId(member)
			return id && id !== normalizeId(meId)
		}) || members[0]
	)
}

function getChatDisplayName(chat, meId) {
	if (isGroupChat(chat)) return chat?.groupId?.name || chat?.name || 'Guruh'
	const other = getOtherMember(chat, meId)
	if (other && typeof other !== 'object') return chat?.name || 'Foydalanuvchi'
	if (!other || typeof other !== 'object') return chat?.name || 'Foydalanuvchi'
	const name = [other.firstname, other.lastname]
		.filter(Boolean)
		.join(' ')
		.trim()
	return name || other.name || chat?.name || 'Foydalanuvchi'
}

function getChatAvatar(chat, meId) {
	if (isGroupChat(chat)) return chat?.groupId?.avatar || chat?.avatar || ''
	if (chat?.avatar) return chat.avatar
	const other = getOtherMember(chat, meId)
	if (other && typeof other === 'object') return other.avatar || ''
	return ''
}

function getInitials(label = '') {
	const words = String(label).trim().split(/\s+/).filter(Boolean)
	if (words.length === 0) return '?'
	if (words.length === 1) return words[0][0].toUpperCase()
	return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

// Subtle color palette for avatars based on initials
const AVATAR_GRADIENTS = [
	'from-violet-500 to-purple-600',
	'from-sky-500 to-blue-600',
	'from-emerald-500 to-teal-600',
	'from-rose-500 to-pink-600',
	'from-amber-500 to-orange-600',
	'from-cyan-500 to-sky-600',
	'from-indigo-500 to-violet-600',
	'from-fuchsia-500 to-pink-600',
]

function getAvatarGradient(name = '') {
	const code = name.charCodeAt(0) || 0
	return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length]
}

function getTypingLabel(typingMap, isGroup) {
	const now = Date.now()
	const activeUsers = Object.values(typingMap || {}).filter(
		user => now - (user?.lastAt || 0) < 5000,
	)
	if (!activeUsers.length) return ''

	const names = []
	for (const user of activeUsers) {
		const name = String(user?.name || '').trim() || 'Kimdir'
		if (!names.includes(name)) names.push(name)
	}

	if (!isGroup || names.length === 1) return `${names[0]} yozmoqda...`
	if (names.length === 2) return `${names[0]}, ${names[1]} yozmoqda...`
	return `${names[0]}, ${names[1]} va yana ${names.length - 2} kishi yozmoqda...`
}

function ChatRow({ chat, meId, isActive, onSelect, typingMap }) {
	const isGroup = isGroupChat(chat)
	const name = getChatDisplayName(chat, meId)
	const avatar = getChatAvatar(chat, meId)
	const unreadCount = chat?.unreadCount || 0
	const isMuted = Boolean(chat?.isMuted)
	const isPinned = Boolean(chat?.isPinned)
	const lastMessage = chat?.lastMessage
	const senderLabel = getSenderLabel(lastMessage?.sender)
	const time = formatTime(
		chat?.lastMessageAt || lastMessage?.createdAt || chat?.updatedAt,
	)
	const preview = lastMessage?.text || "Xabar yo'q"
	const gradient = getAvatarGradient(name)
	const typingLabel = getTypingLabel(typingMap, isGroup)
	const hasTyping = Boolean(typingLabel)

	return (
		<button
			type='button'
			onClick={() => onSelect(chat._id)}
			className={cn(
				'group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200',
				isActive
					? 'bg-accent shadow-sm dark:bg-white/10'
					: 'hover:bg-accent/60 active:scale-[0.99] dark:hover:bg-white/20',
			)}
		>
			{/* Active indicator */}
			{isActive && (
				<span className='absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-primary' />
			)}

			{/* Avatar with online indicator */}
			<div className='relative shrink-0'>
				<Avatar className='size-12 ring-2 ring-background'>
					<AvatarImage src={avatar} alt={name} />
					<AvatarFallback
						className={cn(
							'bg-gradient-to-br text-white text-sm font-semibold',
							gradient,
						)}
					>
						{isGroup ? (
							<Users2 className='size-5 opacity-90' />
						) : (
							getInitials(name)
						)}
					</AvatarFallback>
				</Avatar>
				{/* Online dot — optional, shown via css for demo */}
				{!isMuted && unreadCount > 0 && (
					<span className='absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-emerald-500' />
				)}
			</div>

			{/* Content */}
			<div className='min-w-0 flex-1'>
				<div className='mb-0.5 flex items-center justify-between gap-2'>
					<div className='flex min-w-0 items-center gap-1.5'>
						{isPinned && (
							<Pin className='size-3 shrink-0 rotate-45 text-primary/60' />
						)}
						<p
							className={cn(
								'truncate text-[13.5px] font-semibold leading-tight',
								isActive ? 'text-primary' : 'text-foreground',
							)}
						>
							{name}
						</p>
					</div>
					<span
						className={cn(
							'shrink-0 text-[11px] tabular-nums',
							unreadCount > 0 && !isMuted
								? 'font-medium text-primary'
								: 'text-muted-foreground/70',
						)}
					>
						{time}
					</span>
				</div>

				<div className='flex items-center justify-between gap-2'>
					<p
						className={cn(
							'flex min-w-0 items-center gap-1 truncate text-[12px] leading-snug',
							hasTyping
								? 'text-emerald-500 font-medium'
								: 'text-muted-foreground',
						)}
					>
						{!hasTyping && lastMessage?.isMine && (
							<CheckCheck className='size-3.5 shrink-0 text-primary/70' />
						)}
						<span className='truncate'>
							{hasTyping ? (
								typingLabel
							) : senderLabel ? (
								<>
									<span className='font-medium text-foreground/70'>
										{senderLabel.split(' ')[0]}:
									</span>{' '}
									{preview}
								</>
							) : (
								preview
							)}
						</span>
					</p>

					<div className='ml-1 flex shrink-0 items-center gap-1'>
						{isMuted && (
							<VolumeX className='size-3.5 text-muted-foreground/50' />
						)}
						{unreadCount > 0 && (
							<Badge
								className={cn(
									'h-5 min-w-5 rounded-full px-1.5 text-[10px] font-semibold tabular-nums shadow-sm',
									isMuted
										? 'bg-muted text-muted-foreground'
										: 'bg-primary text-primary-foreground',
								)}
							>
								{unreadCount > 99 ? '99+' : unreadCount}
							</Badge>
						)}
					</div>
				</div>
			</div>
		</button>
	)
}

function SkeletonRow() {
	return (
		<div className='flex items-center gap-3 rounded-2xl px-3 py-2.5'>
			<Skeleton className='size-12 shrink-0 rounded-full' />
			<div className='min-w-0 flex-1 space-y-2'>
				<div className='flex items-center justify-between gap-4'>
					<Skeleton className='h-3.5 w-28 rounded-full' />
					<Skeleton className='h-3 w-8 rounded-full' />
				</div>
				<Skeleton className='h-3 w-40 rounded-full' />
			</div>
		</div>
	)
}

export default function Menu() {
	const [tab, setTab] = useState('all')
	const [search, setSearch] = useState('')
	const navigate = useNavigate()
	const { chatId } = useParams()

	const { data: allChats = [], isLoading } = useGetChatsQuery('all')
	const { data: me } = useGetMeQuery()
	const meId = me?._id
	const typingByConversation = useSelector(
		state => state.realtime?.typingByConversation || {},
	)

	const filtered = useMemo(() => {
		const byTab = allChats.filter(chat => {
			if (tab === 'group') return isGroupChat(chat)
			if (tab === 'private') return !isGroupChat(chat)
			return true
		})
		const q = search.trim().toLowerCase()
		if (!q) return byTab
		return byTab.filter(chat => {
			const name = getChatDisplayName(chat, meId).toLowerCase()
			const text = (chat?.lastMessage?.text || '').toLowerCase()
			return name.includes(q) || text.includes(q)
		})
	}, [allChats, meId, search, tab])

	const sorted = useMemo(() => {
		return [...filtered].sort((a, b) => {
			if (a?.isPinned && !b?.isPinned) return -1
			if (!a?.isPinned && b?.isPinned) return 1
			const t1 = new Date(
				a?.lastMessageAt || a?.lastMessage?.createdAt || 0,
			).getTime()
			const t2 = new Date(
				b?.lastMessageAt || b?.lastMessage?.createdAt || 0,
			).getTime()
			return t2 - t1
		})
	}, [filtered])

	const counts = useMemo(() => {
		const all = allChats.length
		const group = allChats.filter(isGroupChat).length
		return { all, private: all - group, group }
	}, [allChats])

	return (
		<div className='flex h-full w-full flex-col bg-background text-foreground'>
			{/* ── Header ── */}
			<div className='flex items-center gap-2 px-3 pb-2 pt-3'>
				<Button
					variant='ghost'
					size='icon'
					className='size-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground'
				>
					<SlidersHorizontal className='size-4' />
				</Button>

				{/* Search */}
				<div className='relative flex-1'>
					<Search className='pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
					<Input
						placeholder='Qidirish...'
						value={search}
						onChange={e => setSearch(e.target.value)}
						className='h-9 rounded-xl border-0 bg-accent/70 pl-9 pr-8 text-sm placeholder:text-muted-foreground/60 focus-visible:bg-accent focus-visible:ring-1 focus-visible:ring-primary/40 bg-transparent data-[state=open]:bg-accent focus-visible:outline-none'
					/>
					{search && (
						<button
							type='button'
							onClick={() => setSearch('')}
							className='absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition hover:text-foreground'
						>
							<X className='size-3.5' />
						</button>
					)}
				</div>

				<Button
					variant='ghost'
					size='icon'
					className='size-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground'
				>
					<Edit3 className='size-4' />
				</Button>
			</div>

			{/* ── Tabs ── */}
			<div className='px-3 pb-2'>
				<Tabs value={tab} onValueChange={setTab} className='w-full'>
					<TabsList className='h-9 w-full gap-1 rounded-xl bg-accent/60 p-1'>
						<TabsTrigger
							value='all'
							className={cn(
								'flex-1 gap-1.5 rounded-lg text-xs font-medium transition-all',
								'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white',
								'data-[state=inactive]:text-muted-foreground',
							)}
						>
							<Layers2 className='size-3.5' />
							Hammasi
							{counts.all > 0 && (
								<span className='rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-semibold text-primary'>
									{counts.all}
								</span>
							)}
						</TabsTrigger>

						<TabsTrigger
							value='private'
							className={cn(
								'flex-1 gap-1.5 rounded-lg text-xs font-medium transition-all',
								'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white',
								'data-[state=inactive]:text-muted-foreground',
							)}
						>
							<MessageCircle className='size-3.5' />
							Shaxsiy
							{counts.private > 0 && (
								<span className='rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-semibold text-primary'>
									{counts.private}
								</span>
							)}
						</TabsTrigger>

						<TabsTrigger
							value='group'
							className={cn(
								'flex-1 gap-1.5 rounded-lg text-xs font-medium transition-all',
								'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white',
								'data-[state=inactive]:text-muted-foreground',
							)}
						>
							<Users2 className='size-3.5' />
							Guruhlar
							{counts.group > 0 && (
								<span className='rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-semibold text-primary'>
									{counts.group}
								</span>
							)}
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			<Separator className='opacity-50' />

			{/* ── Chat List ── */}
			<div className='flex-1 overflow-hidden'>
				{isLoading ? (
					<div className='space-y-0.5 p-2'>
						{Array.from({ length: 8 }).map((_, i) => (
							<SkeletonRow key={i} />
						))}
					</div>
				) : sorted.length === 0 ? (
					<div className='flex h-full flex-col items-center justify-center gap-3 p-8 text-center'>
						<div className='flex size-16 items-center justify-center rounded-2xl bg-accent'>
							<MessageCircle className='size-7 text-muted-foreground/50' />
						</div>
						<div className='space-y-1'>
							<p className='text-sm font-medium text-foreground'>
								{search ? 'Hech narsa topilmadi' : "Chatlar yo'q"}
							</p>
							<p className='text-xs text-muted-foreground'>
								{search
									? `"${search}" bo'yicha natija yo'q`
									: 'Birinchi xabarni yuboring'}
							</p>
						</div>
					</div>
				) : (
					<ScrollArea className='h-full'>
						<div className='space-y-0.5 p-2'>
							{sorted.map(chat => (
								<ChatRow
									key={chat._id}
									chat={chat}
									meId={meId}
									isActive={chatId === chat._id}
									typingMap={typingByConversation[chat._id] || {}}
									onSelect={id => navigate(`/${id}`)}
								/>
							))}
						</div>
						<div className='h-2' />
					</ScrollArea>
				)}
			</div>
		</div>
	)
}
