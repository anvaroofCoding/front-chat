import { useState } from 'react'
import Card from './Card'
import Chevron from './Chevron'
import HDivider from './HDivider'
import IconBtn from './IconBtn'
import SLabel from './Slabel'
import SettingRow from './settingRow'

const AVATAR_COLORS = [
	'#0A84FF',
	'#FF375F',
	'#FF9F0A',
	'#30D158',
	'#5E5CE6',
	'#FF6B35',
	'#BF5AF2',
	'#32ADE6',
	'#FF453A',
	'#64D2FF',
	'#FFD60A',
	'#32D74B',
]

const truncate = (str = '', max = 60) =>
	typeof str === 'string' && str.length > max ? str.slice(0, max) + '…' : str

const getColor = str => {
	if (!str) return AVATAR_COLORS[0]
	let h = 0
	for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
	return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function SettingsPage({ isDark, setIsDark, me, meLoading }) {
	const [notif, setNotif] = useState(true)
	const [preview, setPreview] = useState(true)
	const [twoFA, setTwoFA] = useState(false)
	const [autoDown, setAutoDown] = useState(true)
	const [animEmoji, setAnimEmoji] = useState(true)
	const [subPage, setSubPage] = useState(null)
	const [imgErr, setImgErr] = useState(false)
	const fullName = truncate(
		[me?.firstname, me?.lastname].filter(Boolean).join(' ') || 'Foydalanuvchi',
		40,
	)

	if (subPage)
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					flex: 1,
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						padding: '0 12px',
						height: 56,
						background: 'var(--hdr)',
						borderBottom: '0.5px solid var(--div)',
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						flexShrink: 0,
					}}
				>
					<IconBtn onClick={() => setSubPage(null)}>
						<svg width='9' height='16' viewBox='0 0 9 16' fill='none'>
							<path
								d='M8 1L1 8l7 7'
								stroke='currentColor'
								strokeWidth='1.7'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
					</IconBtn>
					<span
						style={{
							fontSize: 17,
							fontWeight: 700,
							color: 'var(--txt1)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{subPage}
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
					<span style={{ fontSize: 36, opacity: 0.4 }}>🚧</span>
					<span style={{ fontSize: 14 }}>{subPage} tez orada</span>
				</div>
			</div>
		)

	if (meLoading) return <SettingsSkeleton />

	return (
		<div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
			{/* Profile card */}
			<div
				style={{
					margin: '12px 12px 8px',
					background: 'var(--card)',
					borderRadius: 16,
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 14,
						padding: '14px 16px',
						cursor: 'pointer',
						transition: 'background 0.15s',
					}}
					onMouseEnter={e =>
						(e.currentTarget.style.background = 'var(--hover)')
					}
					onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
				>
					<div
						style={{
							width: 56,
							height: 56,
							borderRadius: '50%',
							overflow: 'hidden',
							background: getColor(me?._id || ''),
							flexShrink: 0,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 22,
							fontWeight: 700,
							color: '#fff',
						}}
					>
						{me?.avatar && !imgErr ? (
							<img
								src={`${BASE_URL}${me.avatar}`}
								alt={fullName}
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
								onError={() => setImgErr(true)}
							/>
						) : (
							(me?.firstname?.[0] || '?').toUpperCase()
						)}
					</div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div
							style={{
								fontSize: 16,
								fontWeight: 700,
								color: 'var(--txt1)',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{fullName}
						</div>
						<div
							style={{
								fontSize: 13,
								color: 'var(--txt3)',
								marginTop: 2,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{truncate(me?.job || me?.biography || "Bio qo'shing", 40)}
						</div>
						<div
							style={{
								fontSize: 12,
								color: '#0A84FF',
								marginTop: 2,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{truncate(me?.email || '', 40)}
						</div>
					</div>
					<Chevron />
				</div>
			</div>

			<SLabel text='Bildirishnomalar' />
			<Card>
				<SettingRow
					icon='🔔'
					label='Bildirishnomalar'
					toggle
					togVal={notif}
					onTogChange={setNotif}
				/>
				<HDivider />
				<SettingRow
					icon='👁'
					label="Xabar ko'rinishi"
					toggle
					togVal={preview}
					onTogChange={setPreview}
				/>
				<HDivider />
				<SettingRow
					icon='🔕'
					label='Ovoz sozlamalari'
					onClick={() => setSubPage('Ovoz sozlamalari')}
				/>
			</Card>

			<SLabel text='Maxfiylik va xavfsizlik' />
			<Card>
				<SettingRow
					icon='🔒'
					label='Ikki bosqichli tekshiruv'
					toggle
					togVal={twoFA}
					onTogChange={setTwoFA}
				/>
				<HDivider />
				<SettingRow
					icon='📱'
					label='Faol seanslar'
					value='2 qurilma'
					onClick={() => setSubPage('Faol seanslar')}
				/>
				<HDivider />
				<SettingRow
					icon='🚫'
					label='Bloklangan'
					value='0'
					onClick={() => setSubPage('Bloklangan')}
				/>
			</Card>

			<SLabel text="Ko'rinish" />
			<Card>
				<SettingRow
					icon={isDark ? '🌙' : '☀️'}
					label='Tungi rejim'
					toggle
					togVal={isDark}
					onTogChange={setIsDark}
				/>
				<HDivider />
				<SettingRow
					icon='🎨'
					label='Chat foni'
					onClick={() => setSubPage('Chat foni')}
				/>
				<HDivider />
				<SettingRow
					icon='✨'
					label='Animatsiyali emoji'
					toggle
					togVal={animEmoji}
					onTogChange={setAnimEmoji}
				/>
				<HDivider />
				<SettingRow
					icon='🔤'
					label="Shrift o'lchami"
					value='Standart'
					onClick={() => setSubPage('Shrift')}
				/>
			</Card>

			<SLabel text="Ma'lumotlar" />
			<Card>
				<SettingRow
					icon='⬇️'
					label='Avtomatik yuklab olish'
					toggle
					togVal={autoDown}
					onTogChange={setAutoDown}
				/>
				<HDivider />
				<SettingRow
					icon='💾'
					label='Saqlash hajmi'
					value='1.4 GB'
					onClick={() => setSubPage('Saqlash')}
				/>
			</Card>

			<SLabel text='Yordam' />
			<Card>
				<SettingRow
					icon='❓'
					label='Yordam markazi'
					onClick={() => setSubPage('Yordam')}
				/>
				<HDivider />
				<SettingRow
					icon='ℹ️'
					label='Haqida'
					value='v10.14.0'
					onClick={() => setSubPage('Haqida')}
				/>
			</Card>

			<SLabel text='' />
			<Card>
				<SettingRow icon='🚪' label='Chiqish' danger onClick={() => {}} />
			</Card>
			<div style={{ height: 28 }} />
		</div>
	)
}

export default SettingsPage
