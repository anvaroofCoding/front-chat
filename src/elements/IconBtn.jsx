import { useState } from 'react'

function IconBtn({ onClick, children, size = 32, color, disabled }) {
	const [h, setH] = useState(false)
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			onMouseEnter={() => setH(true)}
			onMouseLeave={() => setH(false)}
			style={{
				width: size,
				height: size,
				borderRadius: '50%',
				border: 'none',
				cursor: disabled ? 'default' : 'pointer',
				background: h && !disabled ? 'var(--hover)' : 'transparent',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: color || 'var(--txt2)',
				opacity: disabled ? 0.4 : 1,
				transition: 'background 0.15s, transform 0.12s',
				transform: h && !disabled ? 'scale(1.1)' : 'scale(1)',
				flexShrink: 0,
			}}
		>
			{children}
		</button>
	)
}

export default IconBtn
