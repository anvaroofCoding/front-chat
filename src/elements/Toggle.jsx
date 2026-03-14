function Toggle({ value, onChange, disabled }) {
	return (
		<div
			onClick={() => !disabled && onChange(!value)}
			style={{
				width: 50,
				height: 28,
				borderRadius: 14,
				cursor: disabled ? 'default' : 'pointer',
				position: 'relative',
				background: value ? '#0A84FF' : 'var(--tog-off)',
				transition: 'background 0.25s',
				flexShrink: 0,
				opacity: disabled ? 0.5 : 1,
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 3,
					left: value ? 25 : 3,
					width: 22,
					height: 22,
					borderRadius: '50%',
					background: '#fff',
					transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
					boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
				}}
			/>
		</div>
	)
}

export default Toggle
