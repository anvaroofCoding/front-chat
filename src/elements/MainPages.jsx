import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ensureSocketAuth, socket } from '@/elements/socket'
import { cn } from '@/lib/utils'
import {
	api,
	useDeleteMessageMutation,
	useGetConversationsQuery,
	useGetMeQuery,
	useGetMessagesQuery,
	useMarkConversationReadMutation,
	useSendMessageMutation,
	useUpdateMessageMutation,
} from '@/store/api'
import { realtimeActions } from '@/store/realtimeSlice'
import {
	CheckCheck,
	ChevronLeft,
	ChevronRight,
	Copy,
	Download,
	FileText,
	Mic,
	Paperclip,
	Pause,
	Pencil,
	Play,
	Reply,
	Search,
	SendHorizonal,
	SquarePen,
	StopCircle,
	Trash2,
	Video,
	Volume2,
	X,
	ZoomIn,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import MoreVenticalInformation from './MoreVentical_information'

/* ─────────────── Helpers ─────────────── */

function getInitials(a = '', b = '') {
	return `${a?.[0] || ''}${b?.[0] || ''}`.toUpperCase() || '?'
}

function normalizeId(id) {
	if (!id) return ''
	if (typeof id === 'string') return id
	if (typeof id === 'number') return String(id)
	if (typeof id === 'object') return id._id || id.id || id.userId || ''
	return ''
}

function getFullName(user) {
	if (!user) return ''
	if (typeof user === 'string') return user
	const full = [user.firstname, user.lastname].filter(Boolean).join(' ').trim()
	return full || user.fullname || user.name || user.username || ''
}

function getInitialsFromName(name = '') {
	const parts = String(name).trim().split(/\s+/).filter(Boolean)
	if (!parts.length) return '?'
	if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
	return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function getMessageId(message) {
	return message?._id || message?.id || message?.messageId || ''
}

function getMessageConversationId(message) {
	return normalizeId(
		message?.conversationId ||
			message?.conversation?._id ||
			message?.conversation ||
			message?.chatId ||
			message?.roomId ||
			message?.room?._id ||
			message?.room,
	)
}

function upsertRealtimeMessage(draft, message) {
	if (!Array.isArray(draft) || !message) return
	const messageId = getMessageId(message)
	if (!messageId) return

	const index = draft.findIndex(item => getMessageId(item) === messageId)
	if (index >= 0) {
		draft[index] = { ...draft[index], ...message }
	} else {
		draft.push(message)
	}

	draft.sort(
		(a, b) =>
			new Date(a?.createdAt || 0).getTime() -
			new Date(b?.createdAt || 0).getTime(),
	)
}

function fmtTime(v) {
	if (!v) return ''
	const d = new Date(v)
	if (isNaN(d)) return ''
	return d.toLocaleTimeString('uz', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})
}

function fmtDateLabel(v) {
	if (!v) return ''
	const d = new Date(v)
	if (isNaN(d)) return ''
	const now = new Date()
	const diff = now - d
	if (diff < 86400000 && d.getDate() === now.getDate()) return 'Bugun'
	if (diff < 172800000) return 'Kecha'
	return d.toLocaleDateString('uz', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	})
}

function fmtDuration(sec) {
	if (!sec || isNaN(sec)) return '0:00'
	const m = Math.floor(sec / 60)
	const s = Math.floor(sec % 60)
	return `${m}:${String(s).padStart(2, '0')}`
}

function getOtherMember(conv, meId) {
	const members = Array.isArray(conv?.members) ? conv.members : []
	if (!members.length) return null
	return (
		members.find(
			member => normalizeId(member) && normalizeId(member) !== meId,
		) ||
		members[0] ||
		null
	)
}

function getConvTitle(conv, meId) {
	if (!conv) return 'Suhbat'
	if (conv.type === 'group') return conv.groupId?.name || conv.name || 'Guruh'
	const other = getOtherMember(conv, meId)
	const otherName = getFullName(other)
	return otherName || conv.name || 'Suhbat'
}

function getConvAvatar(conv, meId) {
	if (!conv) return ''
	if (conv.type === 'group') return conv.groupId?.avatar || conv.avatar || ''
	const other = getOtherMember(conv, meId)
	if (other && typeof other === 'object')
		return other.avatar || conv.avatar || ''
	return conv.avatar || ''
}

function buildParticipantsMap(conv) {
	const members = Array.isArray(conv?.members) ? conv.members : []
	const map = {}
	for (const member of members) {
		const id = normalizeId(member)
		if (!id || typeof member !== 'object') continue
		map[id] = {
			name: getFullName(member),
			avatar: member.avatar || '',
		}
	}
	return map
}

function getTypingName(entry) {
	const name = String(entry?.name || '').trim()
	return name || 'Kimdir'
}

function buildTypingLabel(typingMap, isGroup) {
	const now = Date.now()
	const activeUsers = Object.values(typingMap || {}).filter(
		user => now - (user?.lastAt || 0) < 5000,
	)
	if (!activeUsers.length) return ''

	const names = []
	for (const user of activeUsers) {
		const name = getTypingName(user)
		if (!names.includes(name)) names.push(name)
	}

	if (!isGroup || names.length === 1) return `${names[0]} yozmoqda...`
	if (names.length === 2) return `${names[0]}, ${names[1]} yozmoqda...`
	return `${names[0]}, ${names[1]} va yana ${names.length - 2} kishi yozmoqda...`
}

function getMsgText(msg) {
	return msg?.text || ''
}

function getAllAttachments(msg) {
	const normalizeList = value => {
		if (!value) return []
		return Array.isArray(value) ? value.filter(Boolean) : [value]
	}
	const files = normalizeList(msg?.files)
	const videos = normalizeList(msg?.video)
	const audios = normalizeList(msg?.audio)
	return [...files, ...videos, ...audios]
}

function classify(item) {
	const direct = typeof item === 'string' ? item : ''
	const name =
		item?.name || item?.filename || item?.originalname || direct || ''
	const t = String(item?.mimetype || item?.type || name).toLowerCase()
	if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name) || t.includes('image'))
		return 'image'
	if (/\.(mp4|mov|avi|mkv)$/i.test(name) || t.includes('video')) return 'video'
	if (
		/\.(mp3|ogg|wav|m4a|webm)$/i.test(name) ||
		t.includes('audio') ||
		t.includes('webm')
	)
		return 'audio'
	return 'file'
}

function getFileUrl(item) {
	if (typeof item === 'string') return item
	return item?.url || item?.path || item?.src || ''
}

function isAudioLikeFile(file) {
	if (!file) return false
	const name = String(file?.name || '').toLowerCase()
	const type = String(file?.type || '').toLowerCase()
	return (
		type.startsWith('audio/') ||
		type.includes('webm') ||
		/\.(mp3|ogg|wav|m4a|aac|webm)$/i.test(name)
	)
}

function getMicErrorMessage(error) {
	const name = String(error?.name || '')
	if (name === 'NotAllowedError' || name === 'SecurityError') {
		return 'Mikrofonga ruxsat yoq. Brauzer settingsdan microphone ni Allow qiling.'
	}
	if (name === 'NotFoundError') {
		return 'Mikrofon topilmadi. Qurilmada mic borligini tekshiring.'
	}
	if (name === 'NotReadableError') {
		return 'Mikrofon band yoki ishlamayapti. Boshqa appdan foydalanilmayotganini tekshiring.'
	}
	if (name === 'OverconstrainedError') {
		return "Mikrofon parametrlari mos kelmadi. Qayta urinib ko'ring."
	}
	return "Ovoz yozishda xatolik bo'ldi. Mikrofon ruxsatini tekshirib qayta urinib ko'ring."
}

const COLORS = [
	'from-violet-500 to-purple-600',
	'from-sky-500 to-blue-600',
	'from-emerald-500 to-teal-600',
	'from-rose-500 to-pink-600',
	'from-amber-500 to-orange-600',
	'from-cyan-500 to-sky-600',
]
function avatarColor(name = '') {
	return COLORS[(name.charCodeAt(0) || 0) % COLORS.length]
}

const EMPTY_TYPING_MAP = Object.freeze({})

/* ─────────────── Media Lightbox (simple & fast) ─────────────── */

function MediaViewer({ items, startIndex = 0, onClose }) {
	const [idx, setIdx] = useState(startIndex)
	const item = items[idx]
	const type = classify(item)
	const url = getFileUrl(item)
	const total = items.length

	useEffect(() => {
		const onKey = e => {
			if (e.key === 'Escape') onClose()
			if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, total - 1))
			if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0))
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [total, onClose])

	return (
		<div
			className='fixed inset-0 z-[300] flex flex-col bg-black'
			onClick={onClose}
		>
			{/* Top bar */}
			<div
				className='flex shrink-0 items-center justify-between px-4 py-3'
				onClick={e => e.stopPropagation()}
			>
				<span className='text-sm text-white/50'>
					{total > 1 ? `${idx + 1} / ${total}` : ''}
				</span>
				<div className='flex gap-1'>
					{url && (
						<a
							href={url}
							download
							target='_blank'
							rel='noreferrer'
							className='flex size-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition'
							onClick={e => e.stopPropagation()}
						>
							<Download className='size-4' />
						</a>
					)}
					<button
						onClick={onClose}
						className='flex size-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition'
					>
						<X className='size-5' />
					</button>
				</div>
			</div>

			{/* Main media */}
			<div
				className='relative flex flex-1 items-center justify-center overflow-hidden'
				onClick={e => e.stopPropagation()}
			>
				{/* Prev */}
				{idx > 0 && (
					<button
						onClick={() => setIdx(i => i - 1)}
						className='absolute left-3 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition'
					>
						<ChevronLeft className='size-5' />
					</button>
				)}

				{type === 'image' && url ? (
					<img
						src={url}
						alt=''
						className='max-h-full max-w-full object-contain select-none'
						draggable={false}
					/>
				) : type === 'video' && url ? (
					<video
						key={url}
						src={url}
						controls
						autoPlay
						className='max-h-full max-w-full'
					/>
				) : (
					<div className='text-white/30 text-center'>
						<Video className='mx-auto size-16' />
						<p className='mt-2 text-sm'>Ko'rib bo'lmaydi</p>
					</div>
				)}

				{/* Next */}
				{idx < total - 1 && (
					<button
						onClick={() => setIdx(i => i + 1)}
						className='absolute right-3 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition'
					>
						<ChevronRight className='size-5' />
					</button>
				)}
			</div>

			{/* Thumbnail strip */}
			{total > 1 && (
				<div
					className='flex shrink-0 justify-center gap-1.5 overflow-x-auto px-4 pb-4 pt-2'
					onClick={e => e.stopPropagation()}
				>
					{items.map((it, i) => {
						const u = getFileUrl(it)
						const t = classify(it)
						return (
							<button
								key={i}
								onClick={() => setIdx(i)}
								className={cn(
									'size-11 shrink-0 overflow-hidden rounded-lg border-2 transition',
									i === idx
										? 'border-white'
										: 'border-transparent opacity-40 hover:opacity-70',
								)}
							>
								{t === 'image' && u ? (
									<img src={u} alt='' className='size-full object-cover' />
								) : (
									<div className='flex size-full items-center justify-center bg-white/10'>
										<Video className='size-3.5 text-white/60' />
									</div>
								)}
							</button>
						)
					})}
				</div>
			)}
		</div>
	)
}

/* ─────────────── Image Grid ─────────────── */

function ImageGrid({ images, onOpen }) {
	const count = images.length
	const show = images.slice(0, 4)
	const extra = count - 4

	if (count === 1) {
		const url = getFileUrl(show[0])
		return (
			<button
				type='button'
				onClick={() => onOpen(0)}
				className='group relative block w-full overflow-hidden rounded-xl'
			>
				<img
					src={url}
					alt=''
					className='max-h-64 w-full object-cover transition group-hover:brightness-90'
				/>
				<div className='absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100'>
					<ZoomIn className='size-8 text-white drop-shadow-lg' />
				</div>
			</button>
		)
	}

	if (count === 2) {
		return (
			<div className='grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl'>
				{show.map((img, i) => (
					<button
						key={i}
						type='button'
						onClick={() => onOpen(i)}
						className='group relative aspect-square overflow-hidden'
					>
						<img
							src={getFileUrl(img)}
							alt=''
							className='size-full object-cover transition group-hover:brightness-90'
						/>
					</button>
				))}
			</div>
		)
	}

	if (count === 3) {
		return (
			<div className='grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl'>
				<button
					type='button'
					onClick={() => onOpen(0)}
					className='group relative overflow-hidden row-span-2'
				>
					<img
						src={getFileUrl(show[0])}
						alt=''
						className='size-full object-cover transition group-hover:brightness-90'
						style={{ aspectRatio: '1/2' }}
					/>
				</button>
				{[1, 2].map(i => (
					<button
						key={i}
						type='button'
						onClick={() => onOpen(i)}
						className='group relative aspect-square overflow-hidden'
					>
						<img
							src={getFileUrl(show[i])}
							alt=''
							className='size-full object-cover transition group-hover:brightness-90'
						/>
					</button>
				))}
			</div>
		)
	}

	return (
		<div className='grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl'>
			{show.map((img, i) => (
				<button
					key={i}
					type='button'
					onClick={() => onOpen(i)}
					className='group relative aspect-square overflow-hidden'
				>
					<img
						src={getFileUrl(img)}
						alt=''
						className='size-full object-cover transition group-hover:brightness-90'
					/>
					{i === 3 && extra > 0 && (
						<div className='absolute inset-0 flex items-center justify-center bg-black/55'>
							<span className='text-xl font-bold text-white'>+{extra}</span>
						</div>
					)}
				</button>
			))}
		</div>
	)
}

/* ─────────────── Video Thumb ─────────────── */

function VideoThumb({ item, onClick }) {
	const url = getFileUrl(item)
	return (
		<button
			type='button'
			onClick={onClick}
			className='group relative w-full max-w-xs overflow-hidden rounded-xl bg-black/20'
		>
			{url ? (
				<video
					src={url}
					className='w-full rounded-xl object-cover'
					style={{ maxHeight: 180 }}
				/>
			) : (
				<div className='flex aspect-video items-center justify-center rounded-xl bg-black/20'>
					<Video className='size-10 text-white/30' />
				</div>
			)}
			<div className='absolute inset-0 flex items-center justify-center'>
				<div className='flex size-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition group-hover:bg-black/70'>
					<Play className='ml-0.5 size-5' />
				</div>
			</div>
		</button>
	)
}

/* ─────────────── Audio Player ─────────────── */

function AudioPlayer({ item, isMine }) {
	const url = getFileUrl(item)
	const audioRef = useRef(null)
	const [playing, setPlaying] = useState(false)
	const [progress, setProgress] = useState(0)
	const [duration, setDuration] = useState(0)
	const [current, setCurrent] = useState(0)

	const toggle = () => {
		if (!audioRef.current) return
		if (playing) {
			audioRef.current.pause()
			setPlaying(false)
		} else {
			audioRef.current.play()
			setPlaying(true)
		}
	}

	const seek = e => {
		if (!audioRef.current || !duration) return
		const rect = e.currentTarget.getBoundingClientRect()
		audioRef.current.currentTime =
			((e.clientX - rect.left) / rect.width) * duration
	}

	return (
		<div className='flex w-full min-w-[200px] items-center gap-2.5'>
			{url && (
				<audio
					ref={audioRef}
					src={url}
					onTimeUpdate={() => {
						const a = audioRef.current
						if (a) {
							setCurrent(a.currentTime)
							setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0)
						}
					}}
					onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
					onEnded={() => {
						setPlaying(false)
						setProgress(0)
						setCurrent(0)
					}}
				/>
			)}

			<button
				type='button'
				onClick={toggle}
				className={cn(
					'flex size-9 shrink-0 items-center justify-center rounded-full transition',
					isMine
						? 'bg-white/18 text-white hover:bg-white/26 dark:bg-sky-400/20 dark:text-sky-200 dark:hover:bg-sky-400/30'
						: 'bg-white/14 text-white hover:bg-white/22 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
				)}
			>
				{playing ? (
					<Pause className='size-4' />
				) : (
					<Play className='ml-0.5 size-4' />
				)}
			</button>

			<div className='flex flex-1 flex-col gap-1'>
				<div
					className='relative h-1.5 cursor-pointer overflow-hidden rounded-full bg-current/20'
					onClick={seek}
				>
					<div
						className={cn(
							'h-full rounded-full transition-all',
							isMine
								? 'bg-white dark:bg-sky-300'
								: 'bg-white/90 dark:bg-slate-300',
						)}
						style={{ width: `${progress}%` }}
					/>
				</div>
				<div className='flex justify-between text-[10px] text-white/75 dark:text-slate-400'>
					<span>{fmtDuration(current)}</span>
					<span>{fmtDuration(duration)}</span>
				</div>
			</div>

			<Volume2 className='size-3.5 shrink-0 text-white/70 dark:text-slate-400' />
		</div>
	)
}

/* ─────────────── File Chip (in bubble) ─────────────── */

function FileChipBubble({ item, isMine }) {
	const url = getFileUrl(item)
	const name = item?.name || item?.filename || 'Fayl'
	const size = item?.size ? `${(item.size / 1024).toFixed(0)} KB` : ''

	return (
		<a
			href={url || '#'}
			download={name}
			target='_blank'
			rel='noreferrer'
			className={cn(
				'flex items-center gap-2.5 rounded-xl border px-3 py-2 transition hover:opacity-90',
				isMine
					? 'border-white/12 bg-white/10 text-white dark:border-sky-400/20 dark:bg-sky-400/15 dark:text-slate-100'
					: 'border-white/10 bg-white/8 text-white dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-100',
			)}
		>
			<div
				className={cn(
					'flex size-9 shrink-0 items-center justify-center rounded-lg',
					isMine
						? 'bg-white/14 text-white dark:bg-sky-400/15 dark:text-sky-200'
						: 'bg-white/12 text-white dark:bg-slate-700 dark:text-slate-200',
				)}
			>
				<FileText className='size-4' />
			</div>
			<div className='min-w-0 flex-1'>
				<p className='truncate text-[13px] font-medium'>{name}</p>
				{size && (
					<p className='text-[11px] text-white/70 dark:text-slate-400'>
						{size}
					</p>
				)}
			</div>
			<Download className='size-3.5 shrink-0 opacity-50' />
		</a>
	)
}

/* ─────────────── Pending file chip (input row) ─────────────── */

function PendingChip({ file, onRemove }) {
	const icons = {
		image: () => '🖼',
		video: () => '🎬',
		audio: () => '🎤',
		file: () => '📄',
	}
	const Ico = icons[classify(file)] || icons.file
	return (
		<div className='flex items-center gap-1.5 rounded-lg border border-border/60 bg-accent/70 px-2 py-1 text-xs'>
			<span>{Ico()}</span>
			<span className='max-w-[90px] truncate font-medium'>{file.name}</span>
			<button
				type='button'
				onClick={onRemove}
				className='ml-0.5 text-muted-foreground hover:text-foreground'
			>
				<X className='size-3' />
			</button>
		</div>
	)
}

/* ─────────────── Recording Bar ─────────────── */

function RecordingBar({ onStop, onCancel }) {
	const [secs, setSecs] = useState(0)
	useEffect(() => {
		const t = setInterval(() => setSecs(s => s + 1), 1000)
		return () => clearInterval(t)
	}, [])
	const mm = String(Math.floor(secs / 60)).padStart(2, '0')
	const ss = String(secs % 60).padStart(2, '0')
	return (
		<div className='flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2'>
			<span className='relative flex size-2.5'>
				<span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75' />
				<span className='relative inline-flex size-2.5 rounded-full bg-destructive' />
			</span>
			<span className='flex-1 text-sm font-medium tabular-nums text-destructive'>
				{mm}:{ss} — yozilmoqda
			</span>
			<button
				type='button'
				onClick={onCancel}
				className='rounded-full p-1 text-muted-foreground hover:text-foreground'
			>
				<X className='size-4' />
			</button>
			<Button
				size='sm'
				variant='destructive'
				onClick={onStop}
				className='h-7 gap-1.5 px-2.5 text-xs'
			>
				<StopCircle className='size-3.5' /> Yuborish
			</Button>
		</div>
	)
}

/* ─────────────── Context Menu ─────────────── */

function CtxMenu({ x, y, message, myId, onReply, onCopy, onEdit, onDelete }) {
	const isOwn = (message?.sender?._id || message?.sender) === myId
	const hasText = Boolean(getMsgText(message))
	return (
		<div
			className='fixed z-[400] overflow-hidden rounded-2xl border border-border/50 bg-popover/95 shadow-2xl backdrop-blur-xl'
			style={{ left: x, top: y, minWidth: 160 }}
			onClick={e => e.stopPropagation()}
		>
			<div className='p-1'>
				{[
					{ icon: Reply, label: 'Javob berish', fn: onReply, show: true },
					{ icon: Copy, label: 'Nusxa olish', fn: onCopy, show: hasText },
					{
						icon: Pencil,
						label: 'Tahrirlash',
						fn: onEdit,
						show: isOwn && hasText,
					},
					{
						icon: Trash2,
						label: "O'chirish",
						fn: onDelete,
						show: isOwn,
						danger: true,
					},
				]
					.filter(item => item.show)
					.map(({ icon: Icon, label, fn, danger }) => (
						<button
							key={label}
							type='button'
							onClick={fn}
							className={cn(
								'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition hover:bg-accent',
								danger && 'text-destructive hover:bg-destructive/10',
							)}
						>
							<Icon className='size-3.5 opacity-80' />
							{label}
						</button>
					))}
			</div>
		</div>
	)
}

/* ─────────────── Skeleton ─────────────── */

function MsgSkeleton({ mine }) {
	return (
		<div
			className={cn(
				'flex w-full items-end gap-2',
				mine ? 'justify-end' : 'justify-start',
			)}
		>
			{!mine && <Skeleton className='size-8 shrink-0 rounded-full' />}
			<div
				className={cn(
					'max-w-[65%] space-y-1.5 rounded-2xl px-3.5 py-2.5',
					mine
						? 'rounded-br-sm bg-[#1c4d8d] dark:bg-sky-400/15'
						: 'rounded-bl-sm bg-[#162e4d] dark:bg-slate-800',
				)}
			>
				{!mine && <Skeleton className='h-2.5 w-20 rounded-full' />}
				<Skeleton className='h-3.5 w-48 rounded-full' />
				<Skeleton className='h-3 w-28 rounded-full' />
				<div className='flex justify-end'>
					<Skeleton className='h-2 w-8 rounded-full' />
				</div>
			</div>
		</div>
	)
}

function DateDivider({ label }) {
	return (
		<div className='flex items-center justify-center py-2'>
			<span className='rounded-full bg-muted/70 px-3 py-0.5 text-[11px] text-muted-foreground'>
				{label}
			</span>
		</div>
	)
}

function getMessageKey(message) {
	return normalizeId(message?._id || message?.id || message?.messageId)
}

/* ─────────────── Message Bubble ─────────────── */

function MessageBubble({
	message,
	isMine,
	onContextMenu,
	participantsById,
	registerMessageRef,
	onReplyJump,
	isHighlighted,
}) {
	const [viewer, setViewer] = useState(null)
	const text = getMsgText(message)
	const all = getAllAttachments(message)
	const messageId = getMessageKey(message)
	const replyTargetId = getMessageKey(message?.replyTo)

	const images = all.filter(a => classify(a) === 'image')
	const videos = all.filter(a => classify(a) === 'video')
	const audios = all.filter(a => classify(a) === 'audio')
	const files = all.filter(a => classify(a) === 'file')
	const mediaItems = [...images, ...videos]

	// Does this message need a bubble? (text / audio / files / reply / caption)
	const hasBubble =
		text || audios.length > 0 || files.length > 0 || message?.replyTo

	const senderId = normalizeId(message?.sender?._id || message?.sender)
	const senderFromMembers = participantsById?.[senderId]
	const senderName =
		getFullName(message?.sender) || senderFromMembers?.name || ''
	const senderAvatar =
		message?.sender?.avatar || senderFromMembers?.avatar || ''

	return (
		<>
			{viewer && (
				<MediaViewer
					items={viewer.items}
					startIndex={viewer.startIndex}
					onClose={() => setViewer(null)}
				/>
			)}

			<div
				ref={node => registerMessageRef(messageId, node)}
				className={cn(
					'group flex w-full flex-col gap-1 rounded-2xl transition-all duration-500',
					isMine ? 'items-end' : 'items-start',
					isHighlighted &&
						'bg-amber-300/20 ring-2 ring-amber-400/60 ring-offset-2 ring-offset-background',
				)}
				onContextMenu={e => onContextMenu(e, message)}
			>
				{/* Row: avatar + content */}
				<div
					className={cn(
						'flex w-full items-end gap-2',
						isMine ? 'justify-end' : 'justify-start',
					)}
				>
					{/* Avatar (others only) */}
					{!isMine && (
						<div className='mb-1 shrink-0'>
							<Avatar className='size-8 ring-1 ring-border/40'>
								<AvatarImage src={senderAvatar} />
								<AvatarFallback
									className={cn(
										'bg-gradient-to-br text-[10px] font-bold text-white',
										avatarColor(senderName),
									)}
								>
									{getInitialsFromName(senderName)}
								</AvatarFallback>
							</Avatar>
						</div>
					)}

					{/* Content column */}
					<div
						className={cn(
							'flex max-w-[72%] flex-col gap-1',
							isMine ? 'items-end' : 'items-start',
						)}
					>
						{/* Sender name (groups, others) */}
						{!isMine && senderName && (
							<p className='px-1 text-[11px] font-semibold text-primary'>
								{senderName}
							</p>
						)}

						{/* ── Images (NO bubble, bare) ── */}
						{images.length > 0 && (
							<div className='w-full overflow-hidden rounded-2xl'>
								<ImageGrid
									images={images}
									onOpen={i => setViewer({ items: mediaItems, startIndex: i })}
								/>
							</div>
						)}

						{/* ── Videos (NO bubble, bare) ── */}
						{videos.map((v, i) => (
							<div key={i} className='w-full overflow-hidden rounded-2xl'>
								<VideoThumb
									item={v}
									onClick={() =>
										setViewer({
											items: mediaItems,
											startIndex: images.length + i,
										})
									}
								/>
							</div>
						))}

						{/* ── Bubble: text / audio / files / reply ── */}
						{hasBubble && (
							<div
								className={cn(
									'w-full space-y-2 rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
									isMine
										? 'rounded-br-sm bg-[#1c4d8d] text-white ring-1 ring-[#1c4d8d]/90 dark:bg-sky-400/18 dark:text-slate-50 dark:ring-sky-400/25'
										: 'rounded-bl-sm bg-[#162e4d] text-white ring-1 ring-[#162e4d]/90 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700/80',
								)}
							>
								{/* Reply preview */}
								{message?.replyTo && (
									<button
										type='button'
										onClick={() => onReplyJump(replyTargetId)}
										className='block w-full rounded-lg border-l-[3px] border-white/85 px-2.5 py-1.5 text-left text-xs text-white transition hover:bg-white/10 dark:border-sky-400 dark:text-slate-100 dark:hover:bg-white/5'
									>
										<p className='font-semibold text-white dark:text-sky-300'>
											{message.replyTo?.sender?.firstname || 'Xabar'}
										</p>
										<p className='mt-0.5 truncate text-white/75 dark:text-slate-300'>
											{message.replyTo?.text || '📎 Fayl'}
										</p>
									</button>
								)}

								{/* Audio players */}
								{audios.map((a, i) => (
									<AudioPlayer key={i} item={a} isMine={isMine} />
								))}

								{/* File chips */}
								{files.map((f, i) => (
									<FileChipBubble key={i} item={f} isMine={isMine} />
								))}

								{/* Text */}
								{text && (
									<p className='whitespace-pre-wrap break-words leading-relaxed'>
										{text}
									</p>
								)}

								{/* Time */}
								<div className='flex items-center justify-end gap-1'>
									{(message?.isEdited || message?.edited) && (
										<span className='text-[10px] text-white/60 dark:text-slate-400'>
											tahrirlangan
										</span>
									)}
									<span className='text-[10px] tabular-nums text-white/75 dark:text-slate-400'>
										{fmtTime(message?.createdAt)}
									</span>
									{isMine && (
										<CheckCheck className='size-3 text-white/85 dark:text-sky-300' />
									)}
								</div>
							</div>
						)}

						{/* Time when ONLY media (no bubble) */}
						{!hasBubble && (images.length > 0 || videos.length > 0) && (
							<div
								className={cn(
									'flex items-center gap-1 px-1',
									isMine ? 'justify-end' : 'justify-start',
								)}
							>
								<span className='text-[10px] tabular-nums text-muted-foreground/60'>
									{fmtTime(message?.createdAt)}
								</span>
								{isMine && <CheckCheck className='size-3 text-primary/60' />}
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	)
}

/* ─────────────── Main ─────────────── */

export default function MainPages() {
	const dispatch = useDispatch()
	const { chatId } = useParams()
	const { data: conversation, isLoading: isConvLoading } =
		useGetConversationsQuery(chatId, { skip: !chatId })
	const { data: messagesData = [], isLoading: isMsgsLoading } =
		useGetMessagesQuery(chatId, { skip: !chatId })
	const { data: me } = useGetMeQuery()
	const [sendMessage, { isLoading: isSending }] = useSendMessageMutation()
	const [updateMessage] = useUpdateMessageMutation()
	const [deleteMessage] = useDeleteMessageMutation()
	const [markConversationRead] = useMarkConversationReadMutation()

	const [draft, setDraft] = useState('')
	const [pendingFiles, setPendingFiles] = useState([])
	const [replyTo, setReplyTo] = useState(null)
	const [editingMsg, setEditingMsg] = useState(null)
	const [highlightedMessageId, setHighlightedMessageId] = useState('')
	const [ctxMenu, setCtxMenu] = useState({
		open: false,
		x: 0,
		y: 0,
		message: null,
	})
	const [isRecording, setIsRecording] = useState(false)

	const bottomRef = useRef(null)
	const inputRef = useRef(null)
	const mediaRecRef = useRef(null)
	const streamRef = useRef(null)
	const chunksRef = useRef([])
	const messageRefs = useRef(new Map())
	const highlightTimeoutRef = useRef(null)
	const typingTimeoutRef = useRef(null)
	const isTypingRef = useRef(false)
	const markReadTimeoutRef = useRef(null)
	const myId = me?._id
	const convId = normalizeId(chatId)
	const typingMap = useSelector(
		state => state.realtime.typingByConversation?.[convId] ?? EMPTY_TYPING_MAP,
	)

	const messages = useMemo(() => {
		const list = Array.isArray(messagesData)
			? messagesData
			: Array.isArray(messagesData?.messages)
				? messagesData.messages
				: []
		return [...list].sort(
			(a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0),
		)
	}, [messagesData])

	const grouped = useMemo(() => {
		const result = []
		let lastDate = null
		for (const msg of messages) {
			const d = msg?.createdAt ? new Date(msg.createdAt).toDateString() : null
			if (d && d !== lastDate) {
				result.push({
					type: 'date',
					label: fmtDateLabel(msg.createdAt),
					key: `d-${d}`,
				})
				lastDate = d
			}
			result.push({ type: 'msg', data: msg, key: msg._id })
		}
		return result
	}, [messages])

	const participantsById = useMemo(
		() => buildParticipantsMap(conversation),
		[conversation],
	)

	const typingLabel = useMemo(() => {
		const isGroup = conversation?.type === 'group'
		return buildTypingLabel(typingMap, isGroup)
	}, [conversation?.type, typingMap])

	const scheduleConversationRead = useMemo(
		() => delay => {
			if (!convId) return
			if (markReadTimeoutRef.current) clearTimeout(markReadTimeoutRef.current)
			markReadTimeoutRef.current = setTimeout(() => {
				markConversationRead(convId).catch(() => {})
				markReadTimeoutRef.current = null
			}, delay)
		},
		[convId, markConversationRead],
	)

	const stopTyping = useMemo(
		() => () => {
			if (!convId || !isTypingRef.current) return
			dispatch(
				realtimeActions.sendTyping({ conversationId: convId, isTyping: false }),
			)
			isTypingRef.current = false
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
				typingTimeoutRef.current = null
			}
		},
		[convId, dispatch],
	)

	const notifyTyping = useMemo(
		() => () => {
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
			if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
			typingTimeoutRef.current = setTimeout(() => {
				stopTyping()
			}, 2200)
		},
		[convId, dispatch, stopTyping],
	)

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages.length])

	useEffect(() => {
		dispatch(realtimeActions.setActiveConversation(convId || ''))
		return () => {
			dispatch(realtimeActions.clearActiveConversation())
		}
	}, [convId, dispatch])

	useEffect(() => {
		if (!convId) return

		ensureSocketAuth()
		socket.emit('join_conversation', { conversationId: convId })

		const handleIncomingMessage = payload => {
			const message = payload?.message || payload
			if (!message) return

			const incomingConversationId = getMessageConversationId(message)
			if (!incomingConversationId || incomingConversationId !== convId) return

			dispatch(
				api.util.updateQueryData('getMessages', convId, draft => {
					upsertRealtimeMessage(draft, message)
				}),
			)
		}

		socket.on('message:new', handleIncomingMessage)
		socket.on('new_message', handleIncomingMessage)
		socket.on('receive_message', handleIncomingMessage)

		return () => {
			socket.off('message:new', handleIncomingMessage)
			socket.off('new_message', handleIncomingMessage)
			socket.off('receive_message', handleIncomingMessage)
			socket.emit('leave_conversation', { conversationId: convId })
		}
	}, [convId, dispatch])

	useEffect(() => {
		if (!convId) return
		scheduleConversationRead(120)
	}, [convId, scheduleConversationRead])

	useEffect(() => {
		if (!convId || !myId || !messages.length) return
		const hasUnreadIncoming = messages.some(message => {
			const senderId = normalizeId(message?.sender?._id || message?.sender)
			if (!senderId || senderId === myId) return false
			return !(message?.is_read || message?.read)
		})
		if (hasUnreadIncoming) scheduleConversationRead(180)
	}, [convId, messages, myId, scheduleConversationRead])

	useEffect(() => {
		if (!convId) return
		const onVisible = () => {
			if (document.visibilityState === 'visible') scheduleConversationRead(100)
		}
		window.addEventListener('focus', onVisible)
		document.addEventListener('visibilitychange', onVisible)
		return () => {
			window.removeEventListener('focus', onVisible)
			document.removeEventListener('visibilitychange', onVisible)
		}
	}, [convId, scheduleConversationRead])

	useEffect(() => {
		const close = () => setCtxMenu(p => ({ ...p, open: false }))
		const onKey = e => {
			if (e.key === 'Escape') close()
		}
		window.addEventListener('click', close)
		window.addEventListener('keydown', onKey)
		return () => {
			window.removeEventListener('click', close)
			window.removeEventListener('keydown', onKey)
		}
	}, [])

	useEffect(() => {
		if (!chatId) {
			setDraft('')
			setPendingFiles([])
			setReplyTo(null)
			setEditingMsg(null)
		}
	}, [chatId])

	useEffect(() => {
		const highlightTimeout = highlightTimeoutRef.current
		return () => {
			stopTyping()
			if (highlightTimeout) {
				clearTimeout(highlightTimeout)
			}
			if (markReadTimeoutRef.current) clearTimeout(markReadTimeoutRef.current)
		}
	}, [stopTyping])

	const handleFilePick = e => {
		const files = Array.from(e.target.files || [])
		if (!files.length) return
		setPendingFiles(p => [...p, ...files])
		e.target.value = ''
	}

	const startRecording = async () => {
		if (!navigator?.mediaDevices?.getUserMedia) {
			toast.error("Bu brauzer mikrofonda ovoz yozishni qo'llamaydi")
			return
		}

		if (!window.isSecureContext) {
			toast.error('Mikrofon uchun HTTPS kerak (localhost bundan mustasno)')
			return
		}

		if (typeof MediaRecorder === 'undefined') {
			toast.error("Bu brauzer mic recordingni qo'llamaydi")
			return
		}

		try {
			if (navigator.permissions?.query) {
				const status = await navigator.permissions.query({
					name: 'microphone',
				})
				if (status.state === 'denied') {
					toast.error(
						'Mikrofon bloklangan. Brauzer settingsdan microphone ni Allow qiling.',
					)
					return
				}
			}
		} catch {
			// Some browsers (especially mobile) do not support permissions query.
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			})
			streamRef.current = stream
			chunksRef.current = []
			let rec
			try {
				rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
			} catch {
				rec = new MediaRecorder(stream)
			}
			mediaRecRef.current = rec
			rec.ondataavailable = e => {
				if (e.data?.size > 0) chunksRef.current.push(e.data)
			}
			rec.onstop = () => {
				const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
				if (blob.size > 0) {
					const voiceFile = new File([blob], `voice-${Date.now()}.webm`, {
						type: 'audio/webm',
					})
					voiceFile.__kind = 'voice'
					setPendingFiles(p => [...p, voiceFile])
				}
				streamRef.current?.getTracks().forEach(t => t.stop())
				streamRef.current = null
			}
			rec.start()
			setIsRecording(true)
		} catch (err) {
			toast.error(getMicErrorMessage(err))
		}
	}

	const stopRecording = () => {
		if (mediaRecRef.current && isRecording) {
			mediaRecRef.current.stop()
			setIsRecording(false)
		}
	}

	const cancelRecording = () => {
		if (mediaRecRef.current && isRecording) {
			mediaRecRef.current.ondataavailable = null
			mediaRecRef.current.onstop = null
			mediaRecRef.current.stop()
			streamRef.current?.getTracks().forEach(t => t.stop())
			streamRef.current = null
			chunksRef.current = []
			setIsRecording(false)
		}
	}

	const handleSend = async () => {
		if (!chatId) return
		const trimmed = draft.trim()
		if (!trimmed && pendingFiles.length === 0) return
		try {
			stopTyping()
			if (editingMsg) {
				await updateMessage({
					messageId: editingMsg._id,
					conversationId: chatId,
					text: trimmed,
				}).unwrap()
				toast.success('Xabar tahrirlandi')
				setEditingMsg(null)
				setDraft('')
				return
			}
			const form = new FormData()
			form.append('conversationId', chatId)
			if (trimmed) form.append('text', trimmed)
			if (replyTo?._id) form.append('replyTo', replyTo._id)
			pendingFiles.forEach(f => {
				if (f?.__kind === 'voice' || isAudioLikeFile(f)) {
					form.append('audio', f, f.name || `voice-${Date.now()}.webm`)
					return
				}
				form.append('files', f)
			})
			const sent = await sendMessage(form).unwrap()

			const candidate = sent?.message || sent?.data || sent
			const normalizedOutgoing =
				candidate && typeof candidate === 'object'
					? {
							...candidate,
							conversationId:
								candidate.conversationId || candidate.chatId || chatId,
						}
					: null

			if (normalizedOutgoing?.conversationId) {
				socket.emit('send_message', { message: normalizedOutgoing })
				socket.emit('message:new', { message: normalizedOutgoing })
			}
			setDraft('')
			setPendingFiles([])
			setReplyTo(null)
			inputRef.current?.focus()
		} catch (err) {
			toast.error(err?.data?.message || "Xabar jo'natilmadi")
		}
	}

	const onMsgCtx = (e, msg) => {
		e.preventDefault()
		e.stopPropagation()
		const mW = 165,
			mH = 165
		let x = e.clientX,
			y = e.clientY
		if (x + mW > window.innerWidth) x = window.innerWidth - mW - 8
		if (y + mH > window.innerHeight) y = e.clientY - mH
		setCtxMenu({ open: true, x, y, message: msg })
	}

	const handleCopy = async () => {
		const t = getMsgText(ctxMenu.message)
		if (t) await navigator.clipboard.writeText(t)
		toast.success('Nusxa olindi')
		setCtxMenu(p => ({ ...p, open: false }))
	}
	const handleReply = () => {
		setReplyTo(ctxMenu.message)
		setEditingMsg(null)
		setCtxMenu(p => ({ ...p, open: false }))
		inputRef.current?.focus()
	}
	const handleEdit = () => {
		setEditingMsg(ctxMenu.message)
		setReplyTo(null)
		setDraft(getMsgText(ctxMenu.message))
		setCtxMenu(p => ({ ...p, open: false }))
		inputRef.current?.focus()
	}
	const handleDelete = async () => {
		if (!ctxMenu.message?._id) return
		try {
			await deleteMessage({
				messageId: ctxMenu.message._id,
				conversationId: chatId,
			}).unwrap()
			toast.success("Xabar o'chirildi")
		} catch (err) {
			toast.error(err?.data?.message || "O'chirishda xato")
		}
		setCtxMenu(p => ({ ...p, open: false }))
	}

	const registerMessageRef = (messageId, node) => {
		if (!messageId) return
		if (node) {
			messageRefs.current.set(messageId, node)
			return
		}
		messageRefs.current.delete(messageId)
	}

	const handleReplyJump = targetMessageId => {
		if (!targetMessageId) return
		const targetNode = messageRefs.current.get(targetMessageId)
		if (!targetNode) return

		targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
		setHighlightedMessageId(targetMessageId)

		if (highlightTimeoutRef.current) {
			clearTimeout(highlightTimeoutRef.current)
		}

		highlightTimeoutRef.current = setTimeout(() => {
			setHighlightedMessageId(current =>
				current === targetMessageId ? '' : current,
			)
			highlightTimeoutRef.current = null
		}, 1800)
	}

	if (!chatId) {
		return (
			<div className='flex h-full flex-col items-center justify-center gap-4 bg-background p-8'>
				<div className='flex size-20 items-center justify-center rounded-3xl bg-muted'>
					<svg
						viewBox='0 0 24 24'
						className='size-10 text-muted-foreground/30'
						fill='none'
						stroke='currentColor'
						strokeWidth='1.5'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							d='M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z'
						/>
					</svg>
				</div>
				<div className='text-center'>
					<p className='text-sm font-semibold'>Suhbat tanlang</p>
					<p className='mt-1 text-xs text-muted-foreground'>
						Boshlash uchun chapdan chat tanlang
					</p>
				</div>
			</div>
		)
	}

	const convAvatar = getConvAvatar(conversation, myId)
	const resolvedConvTitle = getConvTitle(conversation, myId)
	const isGroup = conversation?.type === 'group'
	const memberCount = conversation?.members?.length

	const showOnlyGroupToast = title => {
		if (isGroup) {
			toast(title)
			return
		}
		toast.info('Bu amal faqat guruh chatlar uchun')
	}

	const handleGroupInfo = () => {
		showOnlyGroupToast("Guruh haqida bo'limi tez orada qo'shiladi")
	}

	const handleAddMembers = () => {
		showOnlyGroupToast("A'zo qo'shish oynasi tez orada qo'shiladi")
	}

	const handleEditGroup = () => {
		showOnlyGroupToast("Guruhni tahrirlash funksiyasi tez orada qo'shiladi")
	}

	const handleViewMembers = () => {
		showOnlyGroupToast("A'zolar ro'yxati tez orada qo'shiladi")
	}

	const handleDeleteGroup = () => {
		if (isGroup) {
			toast.warning(
				"Guruhni o'chirish uchun tasdiqlash oynasi tez orada qo'shiladi",
			)
			return
		}
		toast.warning("Chatni o'chirish funksiyasi tez orada qo'shiladi")
	}

	const handleClearHistory = () => {
		toast.warning("History tozalash funksiyasi tez orada qo'shiladi")
	}

	return (
		<div className='relative flex h-full flex-col bg-background text-foreground'>
			{/* Header */}
			<div className='flex items-center gap-3 border-b border-border/50 bg-background/95 px-4 py-2.5 backdrop-blur'>
				{isConvLoading ? (
					<>
						<Skeleton className='size-10 shrink-0 rounded-full' />
						<div className='flex-1 space-y-1.5'>
							<Skeleton className='h-3.5 w-32 rounded-full' />
							<Skeleton className='h-3 w-20 rounded-full' />
						</div>
					</>
				) : (
					<>
						<Avatar className='size-10 ring-2 ring-border/40'>
							<AvatarImage src={convAvatar} />
							<AvatarFallback
								className={cn(
									'bg-gradient-to-br font-bold text-white',
									avatarColor(resolvedConvTitle),
								)}
							>
								{getInitialsFromName(resolvedConvTitle)}
							</AvatarFallback>
						</Avatar>
						<div className='min-w-0 flex-1'>
							<p className='truncate text-sm font-semibold'>
								{resolvedConvTitle}
							</p>
							<p className='text-[11px] text-muted-foreground'>
								{typingLabel ? (
									<span className='font-medium text-emerald-500'>
										{typingLabel}
									</span>
								) : isGroup ? (
									`${memberCount || 0} a'zo`
								) : (
									<span className='text-emerald-500 font-medium'>online</span>
								)}
							</p>
						</div>
						<Button
							variant='ghost'
							size='icon'
							className='size-9 rounded-xl text-muted-foreground hover:text-foreground'
						>
							<Search className='size-4' />
						</Button>
						<MoreVenticalInformation
							isGroup={isGroup}
							onGroupInfo={handleGroupInfo}
							onAddMembers={handleAddMembers}
							onEditGroup={handleEditGroup}
							onViewMembers={handleViewMembers}
							onDeleteGroup={handleDeleteGroup}
							onClearHistory={handleClearHistory}
						/>
					</>
				)}
			</div>

			{/* Messages */}
			<div className='flex-1 overflow-hidden'>
				<ScrollArea className='h-full'>
					<div className='space-y-1 px-4 py-4'>
						{isMsgsLoading ? (
							<div className='space-y-3'>
								<DateDivider label='Bugun' />
								{[false, true, false, true, false].map((m, i) => (
									<MsgSkeleton key={i} mine={m} />
								))}
							</div>
						) : grouped.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-20 text-center'>
								<div className='flex size-16 items-center justify-center rounded-2xl bg-muted'>
									<svg
										viewBox='0 0 24 24'
										className='size-8 text-muted-foreground/30'
										fill='none'
										stroke='currentColor'
										strokeWidth='1.5'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											d='M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z'
										/>
									</svg>
								</div>
								<p className='mt-3 text-sm font-medium'>Xabarlar yo'q</p>
								<p className='mt-1 text-xs text-muted-foreground'>
									Birinchi xabarni yuboring!
								</p>
							</div>
						) : (
							grouped.map(item =>
								item.type === 'date' ? (
									<DateDivider key={item.key} label={item.label} />
								) : (
									<MessageBubble
										key={item.key}
										message={item.data}
										isMine={
											normalizeId(
												item.data?.sender?._id || item.data?.sender,
											) === normalizeId(myId)
										}
										participantsById={participantsById}
										onContextMenu={onMsgCtx}
										registerMessageRef={registerMessageRef}
										onReplyJump={handleReplyJump}
										isHighlighted={
											highlightedMessageId === getMessageKey(item.data)
										}
									/>
								),
							)
						)}
						<div ref={bottomRef} />
					</div>
				</ScrollArea>
			</div>

			<Separator className='opacity-40' />

			{/* Input */}
			<div className='space-y-2 bg-background/95 px-3 py-2.5 backdrop-blur'>
				{isRecording && (
					<RecordingBar onStop={stopRecording} onCancel={cancelRecording} />
				)}

				{pendingFiles.length > 0 && (
					<div className='flex flex-wrap gap-1.5'>
						{pendingFiles.map((f, i) => (
							<PendingChip
								key={`${f.name}-${i}`}
								file={f}
								onRemove={() =>
									setPendingFiles(p => p.filter((_, j) => j !== i))
								}
							/>
						))}
					</div>
				)}

				{replyTo && (
					<div className='flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2'>
						<div className='w-0.5 shrink-0 self-stretch rounded-full bg-primary' />
						<div className='min-w-0 flex-1 text-xs'>
							<p className='font-semibold text-primary'>Javob</p>
							<p className='truncate opacity-60'>
								{getMsgText(replyTo) || '📎 Fayl'}
							</p>
						</div>
						<button
							type='button'
							onClick={() => setReplyTo(null)}
							className='rounded-full p-1 text-muted-foreground hover:text-foreground'
						>
							<X className='size-3.5' />
						</button>
					</div>
				)}

				{editingMsg && (
					<div className='flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
						<Pencil className='size-3.5 shrink-0 text-amber-500' />
						<p className='flex-1 text-xs font-medium text-amber-500'>
							Tahrirlash rejimi
						</p>
						<button
							type='button'
							onClick={() => {
								setEditingMsg(null)
								setDraft('')
							}}
							className='rounded-full p-1 text-muted-foreground hover:text-foreground'
						>
							<X className='size-3.5' />
						</button>
					</div>
				)}

				{!isRecording && (
					<div className='flex items-end gap-2'>
						<label className='cursor-pointer'>
							<input
								type='file'
								multiple
								accept='image/*,video/*,audio/*,.pdf,.doc,.docx,.txt'
								onChange={handleFilePick}
								className='hidden'
							/>
							<Button
								type='button'
								variant='ghost'
								size='icon'
								className='size-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground'
								asChild
							>
								<span>
									<Paperclip className='size-4' />
								</span>
							</Button>
						</label>

						<Input
							ref={inputRef}
							value={draft}
							onChange={e => {
								const value = e.target.value
								setDraft(value)
								if (value.trim()) {
									notifyTyping()
								} else {
									stopTyping()
								}
							}}
							placeholder='Xabar yozing...'
							className='h-10 flex-1 rounded-2xl border-border/50 bg-muted/50 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40'
							onKeyDown={e => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault()
									handleSend()
								}
							}}
						/>

						{draft.trim() || pendingFiles.length > 0 ? (
							<Button
								type='button'
								size='icon'
								className='size-10 shrink-0 rounded-xl'
								onClick={handleSend}
								disabled={isSending}
							>
								{editingMsg ? (
									<SquarePen className='size-4' />
								) : (
									<SendHorizonal className='size-4' />
								)}
							</Button>
						) : (
							<Button
								type='button'
								variant='ghost'
								size='icon'
								className='size-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground'
								onClick={startRecording}
							>
								<Mic className='size-4' />
							</Button>
						)}
					</div>
				)}
			</div>

			{/* Context Menu */}
			{ctxMenu.open && ctxMenu.message && (
				<CtxMenu
					x={ctxMenu.x}
					y={ctxMenu.y}
					message={ctxMenu.message}
					myId={myId}
					onReply={handleReply}
					onCopy={handleCopy}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>
			)}
		</div>
	)
}
