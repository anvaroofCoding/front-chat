function SLabel({ text }) {
	return (
		<div
			style={{
				padding: '18px 16px 6px',
				fontSize: 12,
				fontWeight: 600,
				color: 'var(--txt3)',
				textTransform: 'uppercase',
				letterSpacing: '0.7px',
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap',
			}}
		>
			{text}
		</div>
	)
}

export default SLabel
