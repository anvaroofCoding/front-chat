import { cn } from '@/lib/utils'
import { useGetMeQuery } from '@/store/api'
import { memo, useCallback, useState } from 'react'
import Toggle from './Toggle'
import { DrawerSkeleton } from './all-skeleton'
import { getColor } from './helpers'

// ── shadcn/ui ─────────────────────────────────────────────────────────────────
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'

// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || ''

const truncate = (str = '', max = 60) =>
	typeof str === 'string' && str.length > max ? str.slice(0, max) + '…' : str

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const Icons = {
	chats: (
		<svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
			<path
				d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
			<path
				d='M8 10h.01M12 10h.01M16 10h.01'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
			/>
		</svg>
	),
	contacts: (
		<svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
			<circle
				cx='9'
				cy='7'
				r='4'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
			/>
			<path
				d='M3 21v-1a6 6 0 0 1 12 0v1'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
			/>
			<path
				d='M18 8v6M21 11h-6'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
			/>
		</svg>
	),
	calls: (
		<svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
			<path
				d='M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 5.1 12.9 19.8 19.8 0 0 1 2.03 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	),
	saved: (
		<svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
			<path
				d='M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
			<path
				d='M9 11l2 2 4-4'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	),
	settings: (
		<svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
			<circle cx='12' cy='12' r='3' stroke='currentColor' strokeWidth='1.7' />
			<path
				d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	),
	moon: (
		<svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
			<path
				d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	),
	sun: (
		<svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
			<circle cx='12' cy='12' r='5' stroke='currentColor' strokeWidth='1.7' />
			<path
				d='M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
			/>
		</svg>
	),
	zoom: (
		<svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
			<path
				d='M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	),
	download: (
		<svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
			<path
				d='M12 3v13M7 12l5 5 5-5'
				stroke='currentColor'
				strokeWidth='1.8'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
			<path
				d='M5 21h14'
				stroke='currentColor'
				strokeWidth='1.8'
				strokeLinecap='round'
			/>
		</svg>
	),
	closeCircle: (
		<svg width='20' height='20' viewBox='0 0 24 24' fill='none'>
			<circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='1.7' />
			<path
				d='M15 9l-6 6M9 9l6 6'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
			/>
		</svg>
	),
}

// ─── NAV COLORS ───────────────────────────────────────────────────────────────
const NAV_COLORS = {
	chats: {
		bg: 'bg-[#0A84FF]/[.13]',
		text: 'text-[#0A84FF]',
		dot: 'bg-[#0A84FF]',
		border: 'border-l-[#0A84FF]',
	},
	contacts: {
		bg: 'bg-[#30D158]/[.13]',
		text: 'text-[#30D158]',
		dot: 'bg-[#30D158]',
		border: 'border-l-[#30D158]',
	},
	calls: {
		bg: 'bg-[#FF9F0A]/[.13]',
		text: 'text-[#FF9F0A]',
		dot: 'bg-[#FF9F0A]',
		border: 'border-l-[#FF9F0A]',
	},
	saved: {
		bg: 'bg-[#BF5AF2]/[.13]',
		text: 'text-[#BF5AF2]',
		dot: 'bg-[#BF5AF2]',
		border: 'border-l-[#BF5AF2]',
	},
	settings: {
		bg: 'bg-[#8E8E93]/[.13]',
		text: 'text-[#8E8E93]',
		dot: 'bg-[#8E8E93]',
		border: 'border-l-[#8E8E93]',
	},
}

// ─── NAV ICON ─────────────────────────────────────────────────────────────────
function NavIcon({ iconKey, active }) {
	const c = NAV_COLORS[iconKey]
	return (
		<div
			className={cn(
				'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
				active ? `${c.bg} ${c.text}` : 'bg-transparent text-muted-foreground',
			)}
		>
			{Icons[iconKey]}
		</div>
	)
}

// ─── NAV ITEM ─────────────────────────────────────────────────────────────────
const NavItem = memo(function NavItem({ item, active, onClick }) {
	const c = NAV_COLORS[item.key]
	return (
		<button
			onClick={onClick}
			className={cn(
				'w-full flex items-center gap-3.5 pl-3 pr-3.5 py-2.5 text-left',
				'border-l-[3px] transition-colors duration-150 select-none',
				'hover:bg-accent',
				active
					? `bg-accent ${c.border}`
					: 'border-l-transparent bg-transparent',
			)}
		>
			<NavIcon iconKey={item.key} active={active} />
			<span
				className={cn(
					'flex-1 text-[15px] text-foreground truncate',
					active ? 'font-semibold' : 'font-normal',
				)}
			>
				{item.label}
			</span>
			{active && (
				<span className={cn('w-[7px] h-[7px] rounded-full shrink-0', c.dot)} />
			)}
		</button>
	)
})

// ─── AVATAR PREVIEW (Dialog) ──────────────────────────────────────────────────
const AvatarPreview = memo(function AvatarPreview({ src, name, onClose }) {
	return (
		<Dialog open onOpenChange={v => !v && onClose()}>
			<DialogContent
				className={cn(
					'max-w-none w-screen h-screen p-0 border-0 rounded-none',
					'bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center',
					'[&>button]:hidden',
				)}
				onClick={onClose}
			>
				{/* Top bar */}
				<div
					className='absolute top-0 left-0 right-0 px-5 py-4 flex items-center justify-between z-10'
					onClick={e => e.stopPropagation()}
				>
					<DialogTitle className='text-base font-semibold text-white truncate max-w-[220px]'>
						{name}
					</DialogTitle>
					<div className='flex gap-2'>
						<a
							href={src}
							download
							target='_blank'
							rel='noreferrer'
							onClick={e => e.stopPropagation()}
							className='w-[38px] h-[38px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors'
							title='Yuklab olish'
						>
							{Icons.download}
						</a>
						<Button
							variant='ghost'
							size='icon'
							className='w-[38px] h-[38px] rounded-full bg-white/15 hover:bg-white/25 text-white'
							onClick={e => {
								e.stopPropagation()
								onClose()
							}}
						>
							{Icons.closeCircle}
						</Button>
					</div>
				</div>

				{/* Image */}
				<div
					className='max-w-[90vw] max-h-[80vh] rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]'
					onClick={e => e.stopPropagation()}
				>
					<img
						src={src}
						alt={name}
						className='block max-w-[90vw] max-h-[80vh] w-auto h-auto object-contain'
					/>
				</div>

				<p className='absolute bottom-6 text-[13px] text-white/40'>
					Yopish uchun tashqariga bosing
				</p>
			</DialogContent>
		</Dialog>
	)
})

// ─── NAV ITEMS LIST ───────────────────────────────────────────────────────────
const ITEMS = [
	{ label: 'Xabarlar', key: 'chats' },
	{ label: 'Kontaktlar', key: 'contacts' },
	{ label: "Qo'ng'iroqlar", key: 'calls' },
	{ label: 'Saqlangan', key: 'saved' },
	{ label: 'Sozlamalar', key: 'settings' },
]

// ─── DRAWER INNER CONTENT ────────────────────────────────────────────────────
// Separated so Sheet renders it cleanly inside SheetContent
function DrawerInner({ isDark, setIsDark, onNav, onClose, page }) {
	const { data: me, isLoading: meLoading } = useGetMeQuery()
	const [imgErr, setImgErr] = useState(false)
	const [previewOpen, setPreviewOpen] = useState(false)

	const fullName = truncate(
		[me?.firstname, me?.lastname].filter(Boolean).join(' ') || 'Foydalanuvchi',
		40,
	)

	const avatarSrc = me?.avatar
		? me.avatar.startsWith('http')
			? me.avatar
			: `${BASE_URL}${me.avatar}`
		: null

	const canPreview = Boolean(avatarSrc && !imgErr)

	const handleNav = useCallback(
		key => {
			onNav(key)
			onClose()
		},
		[onNav, onClose],
	)

	return (
		<>
			{/* Avatar full-screen preview */}
			{previewOpen && canPreview && (
				<AvatarPreview
					src={avatarSrc}
					name={fullName}
					onClose={() => setPreviewOpen(false)}
				/>
			)}

			<ScrollArea className='h-full'>
				<div className='flex flex-col min-h-full'>
					{/* ── Profile banner ──────────────────────────────────────────── */}
					{meLoading ? (
						<DrawerSkeleton />
					) : (
						<div className='relative bg-gradient-to-br from-[#1565c0] to-[#0A84FF] px-[18px] pt-6 pb-[22px] shrink-0'>
							{/* Close — uses SheetTitle hidden for a11y, real close via X button */}
							<Button
								variant='ghost'
								size='icon'
								onClick={onClose}
								className='absolute top-[14px] right-[14px] w-8 h-8 rounded-full bg-white/[.18] hover:bg-white/[.28] text-white'
							>
								<svg width='13' height='13' viewBox='0 0 13 13' fill='none'>
									<path
										d='M1.5 1.5l10 10M11.5 1.5l-10 10'
										stroke='currentColor'
										strokeWidth='1.8'
										strokeLinecap='round'
									/>
								</svg>
							</Button>

							{/* Avatar */}
							<div className='relative w-[72px] h-[72px] mb-4 group'>
								<Avatar
									className={cn(
										'w-[72px] h-[72px] shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
										'transition-transform duration-200 group-hover:scale-105',
										canPreview ? 'cursor-zoom-in' : 'cursor-default',
									)}
									style={{
										background: me
											? getColor(me._id)
											: 'rgba(255,255,255,0.22)',
									}}
									onClick={() => canPreview && setPreviewOpen(true)}
								>
									<AvatarImage
										src={avatarSrc ?? undefined}
										alt={fullName}
										className='object-cover'
										onError={() => setImgErr(true)}
									/>
									<AvatarFallback className='text-white text-[28px] font-bold bg-transparent'>
										{(me?.firstname?.[0] || '?').toUpperCase()}
									</AvatarFallback>
								</Avatar>

								{/* Zoom overlay */}
								{canPreview && (
									<div
										className={cn(
											'absolute inset-0 rounded-full flex items-center justify-center text-white',
											'bg-black/0 opacity-0 group-hover:opacity-100 group-hover:bg-black/35',
											'transition-all duration-200 pointer-events-none',
										)}
									>
										{Icons.zoom}
									</div>
								)}
							</div>

							{/* Name */}
							<p className='text-[18px] font-bold text-white tracking-tight leading-[1.3] truncate'>
								{fullName}
							</p>

							{/* Email */}
							<p className='text-[13px] text-white/70 mt-1 truncate'>
								{truncate(me?.email || '', 40)}
							</p>

							{/* Online badge */}
							{me?.isOnline && (
								<Badge
									variant='outline'
									className='mt-1.5 gap-1.5 border-0 bg-[#30D158]/25 text-[#30D158] text-[12px] font-semibold px-2.5 py-0.5 rounded-full w-fit'
								>
									<span className='w-[7px] h-[7px] rounded-full bg-[#30D158] inline-block' />
									Online
								</Badge>
							)}

							{/* Stats */}
							<div className='flex gap-6 mt-[18px]'>
								{[
									['124', 'Kontakt'],
									['8', 'Guruh'],
									['3', 'Kanal'],
								].map(([n, l]) => (
									<div key={l} className='text-center'>
										<p className='text-[18px] font-bold text-white'>{n}</p>
										<p className='text-[11px] text-white/60 mt-0.5 font-medium'>
											{l}
										</p>
									</div>
								))}
							</div>
						</div>
					)}

					{/* ── Nav items ────────────────────────────────────────────────── */}
					<div className='flex-1 pt-1.5'>
						{ITEMS.map(item => (
							<NavItem
								key={item.key}
								item={item}
								active={page === item.key}
								onClick={() => handleNav(item.key)}
							/>
						))}

						<Separator className='my-1' />

						{/* Dark mode toggle */}
						<div className='flex items-center gap-3.5 px-3 py-2.5 select-none'>
							<div
								className={cn(
									'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
									isDark
										? 'bg-[#5E5CE6]/[.18] text-[#5E5CE6]'
										: 'bg-[#FF9F0A]/[.15] text-[#FF9F0A]',
								)}
							>
								{isDark ? Icons.moon : Icons.sun}
							</div>
							<span className='flex-1 text-[15px] text-foreground'>
								Tungi rejim
							</span>
							<Toggle value={isDark} onChange={setIsDark} />
						</div>
					</div>

					{/* ── Footer ───────────────────────────────────────────────────── */}
					<div className='mt-auto'>
						<Separator />
						<div className='flex items-center justify-between px-[18px] py-3 pb-6'>
							<span className='text-[12px] text-muted-foreground'>
								Telegram v10.14.0
							</span>
							<span className='text-[12px] text-muted-foreground/60'>UZ</span>
						</div>
					</div>
				</div>
			</ScrollArea>
		</>
	)
}

// ─── DRAWER MENU (Sheet wrapper) ──────────────────────────────────────────────
function DrawerMenu({ open, onClose, isDark, setIsDark, onNav, page }) {
	return (
		<Sheet open={open} onOpenChange={v => !v && onClose()}>
			<SheetContent
				side='left'
				className='p-0 w-[290px] sm:w-[290px] max-w-[82vw] [&>button]:hidden'
			>
				{/* SheetHeader hidden but required for a11y */}
				<SheetHeader className='sr-only'>
					<SheetTitle>Navigatsiya menyusi</SheetTitle>
				</SheetHeader>

				<DrawerInner
					isDark={isDark}
					setIsDark={setIsDark}
					onNav={onNav}
					onClose={onClose}
					page={page}
				/>
			</SheetContent>
		</Sheet>
	)
}

export default memo(DrawerMenu)
