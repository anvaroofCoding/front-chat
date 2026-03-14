import { Skeleton } from './all-skeleton'

function ContactsPage({ loading }) {
	if (loading)
		return (
			<div style={{ flex: 1, padding: '12px 0' }}>
				{Array.from({ length: 7 }).map((_, i) => (
					<div
						key={i}
						style={{
							display: 'flex',
							alignItems: 'center',
							padding: '10px 16px',
							gap: 13,
						}}
					>
						<Skeleton w={46} h={46} r={23} />
						<div
							style={{
								flex: 1,
								display: 'flex',
								flexDirection: 'column',
								gap: 7,
							}}
						>
							<Skeleton w='55%' h={14} r={7} />
							<Skeleton w='35%' h={11} r={6} />
						</div>
					</div>
				))}
			</div>
		)
	return (
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
			<span style={{ fontSize: 44, opacity: 0.25 }}>👥</span>
			<span style={{ fontSize: 14 }}>Kontaktlar tez orada</span>
		</div>
	)
}

export default ContactsPage
