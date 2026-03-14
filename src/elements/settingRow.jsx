import { useState } from 'react'
import { Skeleton } from './all-skeleton'
import Chevron from './Chevron'
import Toggle from './Toggle'

function SettingRow({
	icon,
	label,
	value,
	danger,
	onClick,
	toggle,
	togVal,
	onTogChange,
	loading,
}) {
	const [h, setH] = useState(false)
	if (loading)
		return (
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 14,
					padding: '12px 16px',
				}}
			>
				<Skeleton w={36} h={36} r={10} />
				<Skeleton w='60%' h={13} r={7} />
			</div>
		)
	return (
		<div
			onClick={toggle ? undefined : onClick}
			onMouseEnter={() => setH(true)}
			onMouseLeave={() => setH(false)}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 14,
				padding: '12px 16px',
				cursor: toggle ? 'default' : 'pointer',
				background: h && !toggle ? 'var(--hover)' : 'transparent',
				transition: 'background 0.15s',
			}}
		>
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: 10,
					background: 'var(--icon-bg)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
					fontSize: 18,
				}}
			>
				{icon}
			</div>
			<span
				style={{
					flex: 1,
					fontSize: 15,
					color: danger ? '#FF375F' : 'var(--txt1)',
					fontWeight: 450,
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
				}}
			>
				{label}
			</span>
			{value && (
				<span
					style={{
						fontSize: 13,
						color: 'var(--txt3)',
						flexShrink: 0,
						maxWidth: 120,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						marginLeft: 8,
					}}
				>
					{value}
				</span>
			)}
			{toggle ? <Toggle value={togVal} onChange={onTogChange} /> : <Chevron />}
		</div>
	)
}

export default SettingRow
