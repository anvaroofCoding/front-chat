import ContactsPage from '@/elements/ContactPage'
import ConvList from '@/elements/Convlist'
import CreateGroup from '@/elements/create-group'
import DrawerMenu from '@/elements/DrawerMenu'
import MainPanel from '@/elements/mainPanel'
import SettingsPage from '@/elements/settingPanel'
import { cn } from '@/lib/utils'
import { useGetChatsQuery } from '@/store/api'
import { realtimeActions } from '@/store/realtimeSlice'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'

// ── shadcn/ui ─────────────────────────────────────────────────────────────────
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MIN_W = 220
const MAX_W = 560
const DEF_W = 340

// Hamburger icon
const MenuIcon = () => (
	<svg width='18' height='18' viewBox='0 0 18 18' fill='none'>
		<rect x='2' y='4' width='14' height='1.6' rx='0.8' fill='currentColor' />
		<rect x='2' y='8.2' width='10' height='1.6' rx='0.8' fill='currentColor' />
		<rect x='2' y='12.4' width='14' height='1.6' rx='0.8' fill='currentColor' />
	</svg>
)

export default function TelegramLayout({
	conversations, // array | undefined  (undefined = loading)
	me, // object | null | undefined
	isDark,
	setIsDark,
}) {
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const { chatId } = useParams()
	const { data: chatConversations = [] } = useGetChatsQuery('all')

	const meId = me?._id
	const convLoading = false
	const meLoading = false

	// ── theme ─────────────────────────────────────────────────────────────────
	const [internalIsDark, setInternalIsDark] = useState(
		() => localStorage.getItem('theme') === 'dark',
	)

	const d = typeof isDark === 'boolean' ? isDark : internalIsDark

	const setTheme = useCallback(
		nextValue => {
			const resolved =
				typeof nextValue === 'function' ? nextValue(d) : nextValue
			document.documentElement.classList.toggle('dark', resolved)
			if (typeof setIsDark === 'function') setIsDark(resolved)
			else setInternalIsDark(resolved)
			localStorage.setItem('theme', resolved ? 'dark' : 'light')
		},
		[d, setIsDark],
	)

	// ── local state ───────────────────────────────────────────────────────────
	const [page, setPage] = useState('chats')
	const [selectedConv, setSelectedConv] = useState(null)
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [isMobile, setIsMobile] = useState(false)
	const [mobileView, setMobileView] = useState('list')
	const [sidebarW, setSidebarW] = useState(DEF_W)
	const dragRef = useRef({ dragging: false, startX: 0, startW: DEF_W })

	// ── effects ───────────────────────────────────────────────────────────────
	useEffect(() => {
		const fn = () => setIsMobile(window.innerWidth < 768)
		fn()
		window.addEventListener('resize', fn)
		return () => window.removeEventListener('resize', fn)
	}, [])

	useEffect(() => {
		const onMove = e => {
			if (!dragRef.current.dragging) return
			const delta = e.clientX - dragRef.current.startX
			setSidebarW(
				Math.min(MAX_W, Math.max(MIN_W, dragRef.current.startW + delta)),
			)
		}
		const onUp = () => {
			if (!dragRef.current.dragging) return
			dragRef.current.dragging = false
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
		}
		window.addEventListener('mousemove', onMove)
		window.addEventListener('mouseup', onUp)
		return () => {
			window.removeEventListener('mousemove', onMove)
			window.removeEventListener('mouseup', onUp)
		}
	}, [])

	useEffect(() => {
		dispatch(realtimeActions.realtimeInit())
		return () => {
			dispatch(realtimeActions.realtimeShutdown())
		}
	}, [dispatch])

	useEffect(() => {
		if (typeof isDark === 'boolean') {
			document.documentElement.classList.toggle('dark', isDark)
			localStorage.setItem('theme', isDark ? 'dark' : 'light')
		}
	}, [isDark])

	useEffect(() => {
		document.documentElement.classList.toggle('dark', d)
	}, [d])

	useEffect(() => {
		if (!chatId) {
			setSelectedConv(null)
			return
		}
		const matched = chatConversations.find(c => c._id === chatId)
		if (matched) setSelectedConv(matched)
	}, [chatConversations, chatId])

	// ── drag divider ──────────────────────────────────────────────────────────
	const handleDividerMD = useCallback(
		e => {
			e.preventDefault()
			dragRef.current = { dragging: true, startX: e.clientX, startW: sidebarW }
			document.body.style.cursor = 'col-resize'
			document.body.style.userSelect = 'none'
		},
		[sidebarW],
	)

	// ── page title ────────────────────────────────────────────────────────────
	const pageLabel =
		page === 'chats'
			? 'Mchats'
			: page === 'contacts'
				? 'Kontaktlar'
				: 'Sozlamalar'

	// ── DrawerMenu (shared between desktop & mobile Sheet) ────────────────────
	const drawerMenuEl = (
		<DrawerMenu
			isDark={d}
			setIsDark={setTheme}
			page={page}
			onNav={p => {
				setPage(p)
				setDrawerOpen(false)
				if (isMobile) setMobileView('list')
			}}
			onClose={() => setDrawerOpen(false)}
			me={me}
			meLoading={meLoading}
		/>
	)

	// ── Sidebar left panel ────────────────────────────────────────────────────
	const SidebarContent = () => (
		<div className='w-full h-full flex flex-col bg-background overflow-hidden'>
			{/* ── Header ── */}
			<div className='flex-shrink-0 h-14 px-3 flex items-center border-b border-border bg-background/95 backdrop-blur-sm'>
				<div className='flex items-center justify-between w-full gap-2'>
					{/* Left: hamburger + title */}
					<div className='flex items-center gap-1.5 min-w-0'>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant='ghost'
									size='icon'
									className='h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground'
									onClick={() => setDrawerOpen(true)}
								>
									<MenuIcon />
								</Button>
							</TooltipTrigger>
							<TooltipContent side='right'>Menyu</TooltipContent>
						</Tooltip>

						{meLoading ? (
							<Skeleton className='h-[17px] w-[100px] rounded-lg' />
						) : (
							<span className='text-[19px] font-bold tracking-tight text-foreground truncate'>
								{pageLabel}
							</span>
						)}
					</div>

					{/* Right: create group */}
					<CreateGroup />
				</div>
			</div>

			{/* ── Page content ── */}
			<ScrollArea className='flex-1'>
				{page === 'chats' && (
					<ConvList
						conversations={convLoading ? undefined : conversations || []}
						meId={meId}
						isDark={d}
						selectedId={selectedConv?._id || chatId}
						loading={convLoading}
						onSelect={conv => {
							setSelectedConv(conv)
							navigate(`/${conv._id}`)
							if (isMobile) setMobileView('chat')
						}}
					/>
				)}
				{page === 'contacts' && <ContactsPage loading={false} />}
				{page === 'settings' && (
					<SettingsPage
						isDark={d}
						setIsDark={setTheme}
						me={me}
						meLoading={meLoading}
					/>
				)}
			</ScrollArea>
		</div>
	)

	// ─── RENDER ────────────────────────────────────────────────────────────────
	return (
		<TooltipProvider>
			<div className='w-full h-screen flex overflow-hidden relative font-sans'>
				{/* ── shadcn Sheet — unified drawer for both mobile & desktop ── */}
				<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
					<SheetContent
						side='left'
						className='p-0 w-[290px] sm:w-[290px] max-w-[82vw] [&>button]:hidden'
					>
						{drawerMenuEl}
					</SheetContent>
				</Sheet>

				{/* ─── DESKTOP ────────────────────────────────────────────────────── */}
				{!isMobile ? (
					<>
						{/* Resizable sidebar */}
						<div
							className='flex-shrink-0 overflow-hidden'
							style={{ width: sidebarW }}
						>
							<SidebarContent />
						</div>

						{/* Drag-to-resize handle */}
						<Separator
							orientation='vertical'
							className={cn(
								'w-[4px] flex-shrink-0 cursor-col-resize',
								'bg-border/50 hover:bg-primary/40 active:bg-primary/60',
								'transition-colors duration-150',
							)}
							onMouseDown={handleDividerMD}
						/>

						{/* Main chat / content panel */}
						<MainPanel
							isDark={d}
							selectedConv={selectedConv}
							meId={meId}
							page={page}
							isMobile={false}
							convLoading={convLoading}
							onMenuOpen={() => setDrawerOpen(true)}
						/>
					</>
				) : (
					/* ─── MOBILE ──────────────────────────────────────────────────── */
					<div className='flex-1 overflow-hidden relative'>
						{/* Conversation list screen */}
						<div
							className={cn(
								'absolute inset-0 transition-transform duration-300',
								'ease-[cubic-bezier(0.4,0,0.2,1)]',
								mobileView === 'chat' ? '-translate-x-full' : 'translate-x-0',
							)}
						>
							<SidebarContent />
						</div>

						{/* Chat screen */}
						<div
							className={cn(
								'absolute inset-0 transition-transform duration-300',
								'ease-[cubic-bezier(0.4,0,0.2,1)]',
								mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full',
							)}
						>
							<MainPanel
								isDark={d}
								selectedConv={selectedConv}
								meId={meId}
								page={page}
								isMobile={true}
								convLoading={convLoading}
								onMenuOpen={() => setDrawerOpen(true)}
								onBack={() => setMobileView('list')}
							/>
						</div>
					</div>
				)}
			</div>
		</TooltipProvider>
	)
}
