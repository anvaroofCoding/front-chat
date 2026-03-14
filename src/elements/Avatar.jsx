import { useState } from 'react'
import { Skeleton } from './all-skeleton'
import { BASE_URL, getColor, truncate } from './helpers'

function Avatar({
	name = '?',
	color,
	avatar,
	online,
	size = 48,
	isGroup,
	loading,
}) {
	const [imgErr, setImgErr] = useState(false)
	const letter = isGroup ? '#' : (name[0] || '?').toUpperCase()

	if (loading) return <Skeleton w={size} h={size} r={size / 2} />

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
				userSelect: 'none',
				overflow: 'hidden',
			}}
		>
			{avatar && !imgErr ? (
				<img
					src={`${BASE_URL}${avatar}`}
					alt={truncate(name, 30)}
					style={{
						width: '100%',
						height: '100%',
						objectFit: 'cover',
						borderRadius: '50%',
					}}
					onError={() => setImgErr(true)}
				/>
			) : (
				letter
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
}

export default Avatar
