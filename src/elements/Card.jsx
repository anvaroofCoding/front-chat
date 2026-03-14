function Card({ children }) {
	return (
		<div
			style={{
				background: 'var(--card)',
				borderRadius: 14,
				overflow: 'hidden',
				margin: '0 12px 4px',
			}}
		>
			{children}
		</div>
	)
}
export default Card
