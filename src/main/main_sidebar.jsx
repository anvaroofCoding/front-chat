import { Skeleton } from '@/elements/all-skeleton'
import ContactsPage from '@/elements/ContactPage'
import ConvList from '@/elements/Convlist'
import DrawerMenu from '@/elements/DrawerMenu'
import IconBtn from '@/elements/IconBtn'
import MainPanel from '@/elements/mainPanel'
import SettingsPage from '@/elements/settingPanel'
import { useGetChatsQuery } from '@/store/api'
import { realtimeActions } from '@/store/realtimeSlice'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MIN_W = 220,
	MAX_W = 560,
	DEF_W = 340

export default function TelegramLayout({
	conversations, // array | undefined (undefined = loading)
	me, // object | null | undefined (undefined = loading)
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
	const [internalIsDark, setInternalIsDark] = useState(() => {
		const savedTheme = localStorage.getItem('theme')
		return savedTheme === 'dark'
	})

	const [page, setPage] = useState('chats')
	const [selectedConv, setSelectedConv] = useState(null)
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [isMobile, setIsMobile] = useState(false)
	const [mobileView, setMobileView] = useState('list')
	const [sidebarW, setSidebarW] = useState(DEF_W)
	const dragRef = useRef({ dragging: false, startX: 0, startW: DEF_W })
	const d = typeof isDark === 'boolean' ? isDark : internalIsDark

	const setTheme = useCallback(
		nextValue => {
			const resolved =
				typeof nextValue === 'function' ? nextValue(d) : nextValue
			if (typeof setIsDark === 'function') {
				setIsDark(resolved)
			} else {
				setInternalIsDark(resolved)
			}
			localStorage.setItem('theme', resolved ? 'dark' : 'light')
		},
		[d, setIsDark],
	)

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
			localStorage.setItem('theme', isDark ? 'dark' : 'light')
		}
	}, [isDark])

	useEffect(() => {
		if (!chatId) {
			setSelectedConv(null)
			return
		}

		const matchedConversation = chatConversations.find(
			conv => conv._id === chatId,
		)
		if (matchedConversation) {
			setSelectedConv(matchedConversation)
		}
	}, [chatConversations, chatId])

	const handleDividerMD = useCallback(
		e => {
			e.preventDefault()
			dragRef.current = { dragging: true, startX: e.clientX, startW: sidebarW }
			document.body.style.cursor = 'col-resize'
			document.body.style.userSelect = 'none'
		},
		[sidebarW],
	)

	const css = `
    *{box-sizing:border-box;margin:0;padding:0;}
    :root{
      --bg:         ${d ? '#1c1c1e' : '#ffffff'};
      --hdr:        ${d ? '#1c1c1e' : '#f9f9fb'};
      --card:       ${d ? '#2c2c2e' : '#f2f2f7'};
      --hover:      ${d ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.042)'};
      --sel:        ${d ? 'rgba(10,132,255,0.14)' : 'rgba(10,132,255,0.08)'};
      --div:        ${d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'};
      --srch:       ${d ? '#2c2c2e' : '#e8e8ed'};
      --icon-bg:    ${d ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
      --tog-off:    ${d ? 'rgba(120,120,130,0.5)' : 'rgba(180,180,190,0.6)'};
      --skel:       ${d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'};
      --skel-shine: ${d ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)'};
      --skel-banner:${d ? '#2a2a30' : '#e0e4ec'};
      --txt1:       ${d ? '#ffffff' : '#000000'};
      --txt2:       ${d ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.42)'};
      --txt3:       ${d ? 'rgba(255,255,255,0.26)' : 'rgba(0,0,0,0.28)'};
    }
    input{color:var(--txt1);}
    input::placeholder{color:var(--txt2);}
    @keyframes tgSkelPulse{
      0%,100%{opacity:1;}
      50%{opacity:0.45;}
    }
    @keyframes tgSlideIn{from{transform:translateX(-100%);opacity:0;}to{transform:translateX(0);opacity:1;}}
    @keyframes tgFadeIn{from{opacity:0;}to{opacity:1;}}
    .tg-skel{animation:tgSkelPulse 1.6s ease-in-out infinite;}
    .tg-slide{animation:tgSlideIn 0.26s cubic-bezier(0.4,0,0.2,1);}
    .tg-fade{animation:tgFadeIn 0.2s ease;}
    *::-webkit-scrollbar{width:0;height:0;}
    *{scrollbar-width:none;}
  `

	// ── Sidebar left panel content ─────────────────────────────────────
	const SidebarContent = () => (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				background: 'var(--bg)',
				overflow: 'hidden',
			}}
		>
			{/* Top bar */}
			<div
				style={{
					background: 'var(--hdr)',
					height: 56,
					padding: '0 12px',
					flexShrink: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					boxShadow: d
						? '0 1px 0 rgba(255,255,255,0.06)'
						: '0 1px 0 rgba(0,0,0,0.07)',
				}}
			>
				<div
					style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}
				>
					<IconBtn onClick={() => setDrawerOpen(true)}>
						<svg width='18' height='18' viewBox='0 0 18 18' fill='none'>
							<rect
								x='2'
								y='4'
								width='14'
								height='1.6'
								rx='0.8'
								fill='currentColor'
							/>
							<rect
								x='2'
								y='8.2'
								width='10'
								height='1.6'
								rx='0.8'
								fill='currentColor'
							/>
							<rect
								x='2'
								y='12.4'
								width='14'
								height='1.6'
								rx='0.8'
								fill='currentColor'
							/>
						</svg>
					</IconBtn>
					{meLoading ? (
						<Skeleton w={100} h={17} r={8} />
					) : (
						<span
							style={{
								fontSize: 19,
								fontWeight: 700,
								color: 'var(--txt1)',
								letterSpacing: '-0.3px',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{page === 'chats'
								? 'Mchats'
								: page === 'contacts'
									? 'Kontaktlar'
									: 'Sozlamalar'}
						</span>
					)}
				</div>
			</div>

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
		</div>
	)

	const drawerEl = (
		<DrawerMenu
			isDark={d}
			setIsDark={setTheme}
			page={page}
			onNav={p => {
				setPage(p)
				if (isMobile) setMobileView('list')
			}}
			onClose={() => setDrawerOpen(false)}
			me={me}
			meLoading={meLoading}
		/>
	)

	return (
		<>
			<style>{css}</style>
			<div
				style={{
					width: '100%',
					height: '100vh',
					display: 'flex',
					fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
					overflow: 'hidden',
					position: 'relative',
				}}
			>
				{!isMobile ? (
					// ─── DESKTOP ──────────────────────────────────────────────
					<>
						{drawerOpen && (
							<>
								<div
									className='tg-fade'
									onClick={() => setDrawerOpen(false)}
									style={{
										position: 'fixed',
										inset: 0,
										background: 'rgba(0,0,0,0.45)',
										zIndex: 200,
										backdropFilter: 'blur(3px)',
									}}
								/>
								<div
									className='tg-slide'
									style={{
										position: 'fixed',
										left: 0,
										top: 0,
										bottom: 0,
										width: 290,
										zIndex: 201,
										boxShadow: '8px 0 40px rgba(0,0,0,0.4)',
									}}
								>
									{drawerEl}
								</div>
							</>
						)}

						<div
							style={{
								width: sidebarW,
								flexShrink: 0,
								overflow: 'hidden',
							}}
						>
							<SidebarContent />
						</div>

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
					// ─── MOBILE ───────────────────────────────────────────────
					<>
						{drawerOpen && (
							<>
								<div
									className='tg-fade'
									onClick={() => setDrawerOpen(false)}
									style={{
										position: 'fixed',
										inset: 0,
										background: 'rgba(0,0,0,0.5)',
										zIndex: 200,
									}}
								/>
								<div
									className='tg-slide'
									style={{
										position: 'fixed',
										left: 0,
										top: 0,
										bottom: 0,
										width: Math.min(window.innerWidth * 0.82, 300),
										zIndex: 201,
										boxShadow: '6px 0 40px rgba(0,0,0,0.4)',
									}}
								>
									{drawerEl}
								</div>
							</>
						)}

						<div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
							{/* List screen */}
							<div
								style={{
									position: 'absolute',
									inset: 0,
									transform:
										mobileView === 'chat'
											? 'translateX(-100%)'
											: 'translateX(0)',
									transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
								}}
							>
								<SidebarContent />
							</div>

							{/* Chat screen */}
							<div
								style={{
									position: 'absolute',
									inset: 0,
									transform:
										mobileView === 'chat'
											? 'translateX(0)'
											: 'translateX(100%)',
									transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
								}}
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
					</>
				)}
			</div>
		</>
	)
}
