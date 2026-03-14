// ─── SKELETON ────────────────────────────────────────────────────────────────
// Pulse animation injected via CSS keyframes in global style
export { ConvSkeleton, DrawerSkeleton, SettingsSkeleton, Skeleton }

function Skeleton({ w = '100%', h = 14, r = 7, style: extra = {} }) {
	return (
		<div
			className='tg-skel'
			style={{
				width: w,
				height: h,
				borderRadius: r,
				background: 'var(--skel)',
				flexShrink: 0,
				...extra,
			}}
		/>
	)
}

function ConvSkeleton() {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				padding: '11px 14px',
				gap: 12,
			}}
		>
			<Skeleton w={50} h={50} r={25} />
			<div
				style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<Skeleton w='55%' h={14} r={7} />
					<Skeleton w={32} h={11} r={6} />
				</div>
				<Skeleton w='78%' h={12} r={6} />
			</div>
		</div>
	)
}

function DrawerSkeleton() {
	return (
		<div
			style={{
				padding: '24px 18px 20px',
				background: 'var(--skel-banner)',
				flexShrink: 0,
			}}
		>
			<Skeleton w={64} h={64} r={32} style={{ marginBottom: 14 }} />
			<Skeleton w='60%' h={16} r={8} style={{ marginBottom: 8 }} />
			<Skeleton w='40%' h={12} r={6} />
		</div>
	)
}

function SettingsSkeleton() {
	return (
		<div style={{ padding: '12px 12px 0' }}>
			<div
				style={{
					background: 'var(--card)',
					borderRadius: 14,
					overflow: 'hidden',
					marginBottom: 8,
					padding: '14px 16px',
					display: 'flex',
					gap: 14,
					alignItems: 'center',
				}}
			>
				<Skeleton w={56} h={56} r={28} />
				<div
					style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}
				>
					<Skeleton w='65%' h={15} r={7} />
					<Skeleton w='45%' h={12} r={6} />
					<Skeleton w='55%' h={11} r={6} />
				</div>
			</div>
			{[80, 65, 70, 55].map((w, i) => (
				<div
					key={i}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 14,
						padding: '12px 16px',
						marginBottom: 2,
					}}
				>
					<Skeleton w={36} h={36} r={10} />
					<Skeleton w={`${w}%`} h={13} r={7} />
				</div>
			))}
		</div>
	)
}
