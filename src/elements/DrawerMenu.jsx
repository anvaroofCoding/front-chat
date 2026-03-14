import { useGetMeQuery } from '@/store/api'
import { memo, useCallback, useState } from 'react'
import Toggle from './Toggle'
import { DrawerSkeleton } from './all-skeleton'
import { getColor } from './helpers'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const truncate = (str = '', max = 60) =>
	typeof str === 'string' && str.length > max ? str.slice(0, max) + '…' : str

// ─── HQ SVG ICONS ────────────────────────────────────────────────────────────

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
	close: (
		<svg width='13' height='13' viewBox='0 0 13 13' fill='none'>
			<path
				d='M1.5 1.5l10 10M11.5 1.5l-10 10'
				stroke='currentColor'
				strokeWidth='1.8'
				strokeLinecap='round'
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

// ─── ICON BADGE ──────────────────────────────────────────────────────────────

function NavIcon({ iconKey, active }) {
	const colors = {
		chats: '#0A84FF',
		contacts: '#30D158',
		calls: '#FF9F0A',
		saved: '#BF5AF2',
		settings: '#8E8E93',
	}
	const bg = active ? colors[iconKey] + '22' : 'transparent'
	const color = active ? colors[iconKey] : 'var(--txt2)'

	return (
		<div
			style={{
				width: 40,
				height: 40,
				borderRadius: 12,
				background: bg,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				color,
				transition: 'background 0.2s, color 0.2s',
			}}
		>
			{Icons[iconKey]}
		</div>
	)
}

// ─── AVATAR PREVIEW MODAL ─────────────────────────────────────────────────────

const AvatarPreview = memo(function AvatarPreview({ src, name, onClose }) {
	return (
		<div
			onClick={onClose}
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 999,
				background: 'rgba(0,0,0,0.88)',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				backdropFilter: 'blur(12px)',
				WebkitBackdropFilter: 'blur(12px)',
				animation: 'tgFadeIn 0.2s ease',
			}}
		>
			{/* Top bar */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					padding: '16px 20px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
				onClick={e => e.stopPropagation()}
			>
				<span
					style={{
						fontSize: 16,
						fontWeight: 600,
						color: '#fff',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						maxWidth: 220,
					}}
				>
					{name}
				</span>
				<div style={{ display: 'flex', gap: 8 }}>
					<a
						href={src}
						download
						target='_blank'
						rel='noreferrer'
						style={{
							width: 38,
							height: 38,
							borderRadius: '50%',
							background: 'rgba(255,255,255,0.15)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: '#fff',
							textDecoration: 'none',
						}}
						title='Yuklab olish'
					>
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
					</a>
					<button
						onClick={onClose}
						style={{
							width: 38,
							height: 38,
							borderRadius: '50%',
							border: 'none',
							background: 'rgba(255,255,255,0.15)',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: '#fff',
						}}
					>
						{Icons.closeCircle}
					</button>
				</div>
			</div>

			{/* Image */}
			<div
				onClick={e => e.stopPropagation()}
				style={{
					maxWidth: '90vw',
					maxHeight: '80vh',
					borderRadius: 16,
					overflow: 'hidden',
					boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
				}}
			>
				<img
					src={src}
					alt={name}
					style={{
						display: 'block',
						maxWidth: '90vw',
						maxHeight: '80vh',
						width: 'auto',
						height: 'auto',
						objectFit: 'contain',
					}}
				/>
			</div>

			{/* Hint */}
			<p
				style={{
					position: 'absolute',
					bottom: 24,
					fontSize: 13,
					color: 'rgba(255,255,255,0.4)',
				}}
			>
				Yopish uchun tashqariga bosing
			</p>
		</div>
	)
})

// ─── NAV ITEM ─────────────────────────────────────────────────────────────────

const NavItem = memo(function NavItem({ item, active, onClick }) {
	const [hover, setHover] = useState(false)

	return (
		<div
			onClick={onClick}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 14,
				padding: '10px 14px 10px 12px',
				cursor: 'pointer',
				background: active
					? 'var(--hover)'
					: hover
						? 'var(--hover)'
						: 'transparent',
				borderLeft: active ? '3px solid #0A84FF' : '3px solid transparent',
				transition: 'background 0.15s',
				userSelect: 'none',
			}}
		>
			<NavIcon iconKey={item.key} active={active} />
			<span
				style={{
					flex: 1,
					fontSize: 15,
					fontWeight: active ? 600 : 450,
					color: active ? 'var(--txt1)' : 'var(--txt1)',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					transition: 'font-weight 0.15s',
				}}
			>
				{item.label}
			</span>
			{active && (
				<div
					style={{
						width: 7,
						height: 7,
						borderRadius: '50%',
						background: '#0A84FF',
						flexShrink: 0,
					}}
				/>
			)}
		</div>
	)
})

// ─── DRAWER MENU ─────────────────────────────────────────────────────────────

const ITEMS = [
	{ icon: '💬', label: 'Xabarlar', key: 'chats' },
	{ icon: '👥', label: 'Kontaktlar', key: 'contacts' },
	{ icon: '📞', label: "Qo'ng'iroqlar", key: 'calls' },
	{ icon: '🔖', label: 'Saqlangan', key: 'saved' },
	{ icon: '⚙️', label: 'Sozlamalar', key: 'settings' },
]

function DrawerMenu({ isDark, setIsDark, onNav, onClose, page }) {
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
			{previewOpen && avatarSrc && !imgErr && (
				<AvatarPreview
					src={avatarSrc}
					name={fullName}
					onClose={() => setPreviewOpen(false)}
				/>
			)}

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					height: '100%',
					background: 'var(--bg)',
					overflowY: 'auto',
					scrollbarWidth: 'none',
				}}
			>
				{/* ── Profile banner ────────────────────────────── */}
				{meLoading ? (
					<DrawerSkeleton />
				) : (
					<div
						style={{
							background: 'linear-gradient(155deg, #1565c0 0%, #0A84FF 100%)',
							padding: '24px 18px 22px',
							position: 'relative',
							flexShrink: 0,
						}}
					>
						{/* Close button */}
						<button
							onClick={onClose}
							style={{
								position: 'absolute',
								top: 14,
								right: 14,
								width: 32,
								height: 32,
								borderRadius: '50%',
								border: 'none',
								background: 'rgba(255,255,255,0.18)',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: '#fff',
								transition: 'background 0.15s',
							}}
							onMouseEnter={e =>
								(e.currentTarget.style.background = 'rgba(255,255,255,0.28)')
							}
							onMouseLeave={e =>
								(e.currentTarget.style.background = 'rgba(255,255,255,0.18)')
							}
						>
							{Icons.close}
						</button>

						{/* Avatar — clickable to preview */}
						<div
							onClick={() => avatarSrc && !imgErr && setPreviewOpen(true)}
							style={{
								width: 72,
								height: 72,
								borderRadius: '50%',
								overflow: 'hidden',
								background: me ? getColor(me._id) : 'rgba(255,255,255,0.22)',
								marginBottom: 16,
								flexShrink: 0,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: 28,
								fontWeight: 700,
								color: '#fff',
								boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
								cursor: avatarSrc && !imgErr ? 'zoom-in' : 'default',
								transition: 'transform 0.18s, box-shadow 0.18s',
								position: 'relative',
							}}
							onMouseEnter={e => {
								if (avatarSrc && !imgErr) {
									e.currentTarget.style.transform = 'scale(1.05)'
									e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.4)'
								}
							}}
							onMouseLeave={e => {
								e.currentTarget.style.transform = 'scale(1)'
								e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'
							}}
						>
							{avatarSrc && !imgErr ? (
								<img
									src={avatarSrc}
									alt={fullName}
									style={{
										width: '100%',
										height: '100%',
										objectFit: 'cover',
									}}
									onError={() => setImgErr(true)}
								/>
							) : (
								(me?.firstname?.[0] || '?').toUpperCase()
							)}

							{/* Zoom hint overlay */}
							{avatarSrc && !imgErr && (
								<div
									style={{
										position: 'absolute',
										inset: 0,
										borderRadius: '50%',
										background: 'rgba(0,0,0,0)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: '#fff',
										opacity: 0,
										transition: 'opacity 0.18s, background 0.18s',
									}}
									onMouseEnter={e => {
										e.currentTarget.style.opacity = '1'
										e.currentTarget.style.background = 'rgba(0,0,0,0.35)'
									}}
									onMouseLeave={e => {
										e.currentTarget.style.opacity = '0'
										e.currentTarget.style.background = 'rgba(0,0,0,0)'
									}}
								>
									{Icons.zoom}
								</div>
							)}
						</div>

						{/* Name */}
						<div
							style={{
								fontSize: 18,
								fontWeight: 700,
								color: '#fff',
								letterSpacing: '-0.3px',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
								lineHeight: 1.3,
							}}
						>
							{fullName}
						</div>

						{/* Email */}
						<div
							style={{
								fontSize: 13,
								color: 'rgba(255,255,255,0.7)',
								marginTop: 4,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{truncate(me?.email || '', 40)}
						</div>

						{/* Online badge */}
						{me?.isOnline && (
							<div
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: 5,
									marginTop: 6,
									background: 'rgba(48,209,88,0.25)',
									borderRadius: 20,
									padding: '2px 10px 2px 6px',
								}}
							>
								<div
									style={{
										width: 7,
										height: 7,
										borderRadius: '50%',
										background: '#30D158',
									}}
								/>
								<span
									style={{ fontSize: 12, color: '#30D158', fontWeight: 600 }}
								>
									Online
								</span>
							</div>
						)}

						{/* Stats */}
						<div style={{ display: 'flex', gap: 24, marginTop: 18 }}>
							{[
								['124', 'Kontakt'],
								['8', 'Guruh'],
								['3', 'Kanal'],
							].map(([n, l]) => (
								<div key={l} style={{ textAlign: 'center' }}>
									<div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
										{n}
									</div>
									<div
										style={{
											fontSize: 11,
											color: 'rgba(255,255,255,0.6)',
											marginTop: 2,
											fontWeight: 500,
										}}
									>
										{l}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* ── Nav items ─────────────────────────────────── */}
				<div style={{ flex: 1, paddingTop: 6 }}>
					{ITEMS.map(item => (
						<NavItem
							key={item.key}
							item={item}
							active={page === item.key}
							onClick={() => handleNav(item.key)}
						/>
					))}

					{/* Dark mode row */}
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 14,
							padding: '10px 14px 10px 12px',
							userSelect: 'none',
						}}
					>
						<div
							style={{
								width: 40,
								height: 40,
								borderRadius: 12,
								background: isDark
									? 'rgba(94,92,230,0.18)'
									: 'rgba(255,159,10,0.15)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0,
								color: isDark ? '#5E5CE6' : '#FF9F0A',
								transition: 'background 0.25s, color 0.25s',
							}}
						>
							{isDark ? Icons.moon : Icons.sun}
						</div>
						<span
							style={{
								flex: 1,
								fontSize: 15,
								fontWeight: 450,
								color: 'var(--txt1)',
							}}
						>
							Tungi rejim
						</span>
						<Toggle value={isDark} onChange={setIsDark} />
					</div>
				</div>

				{/* Footer */}
				<div
					style={{
						padding: '12px 18px 24px',
						fontSize: 12,
						color: 'var(--txt3)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<span>Telegram v10.14.0</span>
					<span style={{ opacity: 0.6 }}>UZ</span>
				</div>
			</div>
		</>
	)
}

export default memo(DrawerMenu)
