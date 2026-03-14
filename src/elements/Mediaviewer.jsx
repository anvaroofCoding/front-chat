import { memo, useEffect, useRef, useState } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const toUrl = src =>
	src ? (src.startsWith('http') ? src : BASE_URL + src) : null

// ─── PORTAL (modal uchun body ga render) ─────────────────────────────────────
import { createPortal } from 'react-dom'

// ─── IMAGE LIGHTBOX ───────────────────────────────────────────────────────────
const ImageLightbox = memo(function ImageLightbox({
	images,
	startIndex,
	onClose,
}) {
	const [idx, setIdx] = useState(startIndex)
	const [scale, setScale] = useState(1)
	const [dragging, setDragging] = useState(false)
	const [offset, setOffset] = useState({ x: 0, y: 0 })
	const dragStart = useRef(null)
	const current = images[idx]

	// Keyboard navigation
	useEffect(() => {
		const fn = e => {
			if (e.key === 'Escape') onClose()
			if (e.key === 'ArrowRight')
				setIdx(i => Math.min(i + 1, images.length - 1))
			if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0))
		}
		window.addEventListener('keydown', fn)
		return () => window.removeEventListener('keydown', fn)
	}, [onClose, images.length])

	// Reset zoom when changing image
	useEffect(() => {
		setScale(1)
		setOffset({ x: 0, y: 0 })
	}, [idx])

	const handleWheel = e => {
		e.preventDefault()
		setScale(s => Math.min(5, Math.max(1, s - e.deltaY * 0.002)))
	}

	const handleMouseDown = e => {
		if (scale === 1) return
		setDragging(true)
		dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
	}
	const handleMouseMove = e => {
		if (!dragging) return
		setOffset({
			x: e.clientX - dragStart.current.x,
			y: e.clientY - dragStart.current.y,
		})
	}
	const handleMouseUp = () => setDragging(false)

	return createPortal(
		<div
			onClick={onClose}
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 9999,
				background: 'rgba(0,0,0,0.92)',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				animation: 'tgFadeIn .18s ease',
			}}
		>
			{/* Top bar */}
			<div
				onClick={e => e.stopPropagation()}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '14px 18px',
					background:
						'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
				}}
			>
				<span
					style={{
						fontSize: 14,
						color: 'rgba(255,255,255,0.75)',
						fontWeight: 500,
					}}
				>
					{idx + 1} / {images.length}
				</span>
				<div style={{ display: 'flex', gap: 8 }}>
					{/* Download */}
					<a
						href={toUrl(current.url)}
						download
						target='_blank'
						rel='noreferrer'
						onClick={e => e.stopPropagation()}
						style={{
							width: 36,
							height: 36,
							borderRadius: '50%',
							background: 'rgba(255,255,255,0.12)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: '#fff',
							textDecoration: 'none',
						}}
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
								d='M5 20h14'
								stroke='currentColor'
								strokeWidth='1.8'
								strokeLinecap='round'
							/>
						</svg>
					</a>
					{/* Close */}
					<button
						onClick={onClose}
						style={{
							width: 36,
							height: 36,
							borderRadius: '50%',
							background: 'rgba(255,255,255,0.12)',
							border: 'none',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: '#fff',
						}}
					>
						<svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
							<path
								d='M2 2l12 12M14 2L2 14'
								stroke='currentColor'
								strokeWidth='1.8'
								strokeLinecap='round'
							/>
						</svg>
					</button>
				</div>
			</div>

			{/* Prev arrow */}
			{idx > 0 && (
				<button
					onClick={e => {
						e.stopPropagation()
						setIdx(i => i - 1)
					}}
					style={{
						position: 'absolute',
						left: 16,
						top: '50%',
						transform: 'translateY(-50%)',
						width: 44,
						height: 44,
						borderRadius: '50%',
						background: 'rgba(255,255,255,0.15)',
						border: 'none',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: '#fff',
						zIndex: 2,
					}}
				>
					<svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
						<path
							d='M15 18l-6-6 6-6'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
				</button>
			)}

			{/* Image */}
			<div
				onClick={e => e.stopPropagation()}
				onWheel={handleWheel}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseUp}
				style={{
					cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
					userSelect: 'none',
					maxWidth: '90vw',
					maxHeight: '80vh',
				}}
			>
				<img
					src={toUrl(current.url)}
					alt=''
					style={{
						maxWidth: '90vw',
						maxHeight: '80vh',
						objectFit: 'contain',
						display: 'block',
						borderRadius: 8,
						transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
						transition: dragging ? 'none' : 'transform .2s ease',
					}}
				/>
			</div>

			{/* Next arrow */}
			{idx < images.length - 1 && (
				<button
					onClick={e => {
						e.stopPropagation()
						setIdx(i => i + 1)
					}}
					style={{
						position: 'absolute',
						right: 16,
						top: '50%',
						transform: 'translateY(-50%)',
						width: 44,
						height: 44,
						borderRadius: '50%',
						background: 'rgba(255,255,255,0.15)',
						border: 'none',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: '#fff',
						zIndex: 2,
					}}
				>
					<svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
						<path
							d='M9 18l6-6-6-6'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
				</button>
			)}

			{/* Zoom hint */}
			<div
				style={{
					position: 'absolute',
					bottom: 20,
					fontSize: 12,
					color: 'rgba(255,255,255,0.4)',
				}}
			>
				{scale > 1
					? `${Math.round(scale * 100)}%`
					: 'Scroll — zoom · Arrow keys — navigate'}
			</div>

			{/* Thumbnail strip (multiple images) */}
			{images.length > 1 && (
				<div
					onClick={e => e.stopPropagation()}
					style={{
						position: 'absolute',
						bottom: 48,
						display: 'flex',
						gap: 6,
					}}
				>
					{images.map((img, i) => (
						<div
							key={i}
							onClick={() => setIdx(i)}
							style={{
								width: 48,
								height: 48,
								borderRadius: 6,
								overflow: 'hidden',
								cursor: 'pointer',
								border:
									i === idx ? '2px solid #0A84FF' : '2px solid transparent',
								opacity: i === idx ? 1 : 0.5,
								transition: 'opacity .15s, border-color .15s',
							}}
						>
							<img
								src={toUrl(img.url)}
								alt=''
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						</div>
					))}
				</div>
			)}
		</div>,
		document.body,
	)
})

// ─── VIDEO MODAL ──────────────────────────────────────────────────────────────
const VideoModal = memo(function VideoModal({ file, onClose }) {
	const url = toUrl(file.url)

	useEffect(() => {
		const fn = e => {
			if (e.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', fn)
		return () => window.removeEventListener('keydown', fn)
	}, [onClose])

	return createPortal(
		<div
			onClick={onClose}
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 9999,
				background: 'rgba(0,0,0,0.92)',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				animation: 'tgFadeIn .18s ease',
			}}
		>
			{/* Top bar */}
			<div
				onClick={e => e.stopPropagation()}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '14px 18px',
					background:
						'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
				}}
			>
				<span
					style={{
						fontSize: 14,
						color: 'rgba(255,255,255,0.75)',
						fontWeight: 500,
					}}
				>
					{file.filename || file.originalname || 'Video'}
				</span>
				<div style={{ display: 'flex', gap: 8 }}>
					<a
						href={url}
						download
						target='_blank'
						rel='noreferrer'
						onClick={e => e.stopPropagation()}
						style={{
							width: 36,
							height: 36,
							borderRadius: '50%',
							background: 'rgba(255,255,255,0.12)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: '#fff',
							textDecoration: 'none',
						}}
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
								d='M5 20h14'
								stroke='currentColor'
								strokeWidth='1.8'
								strokeLinecap='round'
							/>
						</svg>
					</a>
					<button
						onClick={onClose}
						style={{
							width: 36,
							height: 36,
							borderRadius: '50%',
							background: 'rgba(255,255,255,0.12)',
							border: 'none',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: '#fff',
						}}
					>
						<svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
							<path
								d='M2 2l12 12M14 2L2 14'
								stroke='currentColor'
								strokeWidth='1.8'
								strokeLinecap='round'
							/>
						</svg>
					</button>
				</div>
			</div>

			{/* Video */}
			<div onClick={e => e.stopPropagation()}>
				<video
					src={url}
					controls
					autoPlay
					style={{
						maxWidth: '90vw',
						maxHeight: '80vh',
						borderRadius: 12,
						display: 'block',
						outline: 'none',
					}}
				/>
			</div>
		</div>,
		document.body,
	)
})

// ─── IMAGE BUBBLE ─────────────────────────────────────────────────────────────
// files[] massivni qabul qiladi — bir yoki bir nechta rasm
export const ImageBubble = memo(function ImageBubble({ files, isMine }) {
	const [lightbox, setLightbox] = useState(null) // startIndex

	const count = files.length
	const max = Math.min(count, 4) // maksimal 4 ta ko'rsatamiz

	// Grid layout
	const grid =
		count === 1
			? { cols: 1, rows: 1 }
			: count === 2
				? { cols: 2, rows: 1 }
				: count === 3
					? { cols: 2, rows: 2, special: '2+1' }
					: { cols: 2, rows: 2 }

	return (
		<>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
					gap: 2,
					borderRadius: 12,
					overflow: 'hidden',
					maxWidth: 260,
					cursor: 'pointer',
				}}
			>
				{files.slice(0, max).map((file, i) => {
					const url = toUrl(file.url)
					const isLast = i === max - 1 && count > max
					return (
						<div
							key={i}
							onClick={() => setLightbox(i)}
							style={{
								position: 'relative',
								// 3 ta rasm: birinchisi keng
								gridColumn: count === 3 && i === 0 ? '1 / -1' : 'auto',
								aspectRatio:
									count === 1 ? 'auto' : count === 3 && i === 0 ? '16/7' : '1',
								overflow: 'hidden',
								background: '#1c1c1e',
								maxHeight: count === 1 ? 300 : 'none',
							}}
						>
							<img
								src={url}
								alt=''
								loading='lazy'
								style={{
									width: '100%',
									height: '100%',
									objectFit: 'cover',
									display: 'block',
									transition: 'transform .2s',
								}}
								onMouseEnter={e =>
									(e.currentTarget.style.transform = 'scale(1.04)')
								}
								onMouseLeave={e =>
									(e.currentTarget.style.transform = 'scale(1)')
								}
							/>
							{/* +N overlay for last image */}
							{isLast && (
								<div
									style={{
										position: 'absolute',
										inset: 0,
										background: 'rgba(0,0,0,0.55)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<span
										style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}
									>
										+{count - max + 1}
									</span>
								</div>
							)}
						</div>
					)
				})}
			</div>

			{lightbox !== null && (
				<ImageLightbox
					images={files}
					startIndex={lightbox}
					onClose={() => setLightbox(null)}
				/>
			)}
		</>
	)
})

// ─── VIDEO BUBBLE ─────────────────────────────────────────────────────────────
export const VideoBubble = memo(function VideoBubble({ file, isMine }) {
	const [open, setOpen] = useState(false)
	const url = toUrl(file.url)
	const name = file.filename || file.originalname || 'Video'

	return (
		<>
			<div
				onClick={() => setOpen(true)}
				style={{
					position: 'relative',
					borderRadius: 12,
					overflow: 'hidden',
					maxWidth: 260,
					cursor: 'pointer',
					background: '#000',
					aspectRatio: '16/9',
				}}
			>
				{/* Video thumbnail */}
				<video
					src={url}
					style={{
						width: '100%',
						height: '100%',
						objectFit: 'cover',
						display: 'block',
					}}
					muted
					playsInline
					preload='metadata'
				/>
				{/* Play overlay */}
				<div
					style={{
						position: 'absolute',
						inset: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: 'rgba(0,0,0,0.28)',
						transition: 'background .15s',
					}}
					onMouseEnter={e =>
						(e.currentTarget.style.background = 'rgba(0,0,0,0.45)')
					}
					onMouseLeave={e =>
						(e.currentTarget.style.background = 'rgba(0,0,0,0.28)')
					}
				>
					<div
						style={{
							width: 52,
							height: 52,
							borderRadius: '50%',
							background: 'rgba(255,255,255,0.22)',
							backdropFilter: 'blur(4px)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
							<path d='M5 3l14 9-14 9V3z' fill='white' />
						</svg>
					</div>
				</div>
				{/* Duration badge */}
				{file.duration && (
					<div
						style={{
							position: 'absolute',
							bottom: 6,
							right: 8,
							background: 'rgba(0,0,0,0.65)',
							color: '#fff',
							fontSize: 11,
							fontWeight: 600,
							padding: '2px 6px',
							borderRadius: 6,
							fontVariantNumeric: 'tabular-nums',
						}}
					>
						{Math.floor(file.duration / 60)}:
						{String((file.duration % 60) | 0).padStart(2, '0')}
					</div>
				)}
				{/* File name */}
				<div
					style={{
						position: 'absolute',
						bottom: 0,
						left: 0,
						right: 0,
						padding: '16px 10px 8px',
						background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
						fontSize: 12,
						color: 'rgba(255,255,255,0.85)',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{name.length > 28 ? name.slice(0, 26) + '…' : name}
				</div>
			</div>

			{open && <VideoModal file={file} onClose={() => setOpen(false)} />}
		</>
	)
})

// ─── AUDIO BUBBLE ─────────────────────────────────────────────────────────────
export const AudioBubble = memo(function AudioBubble({ file, isMine }) {
	const [playing, setPlaying] = useState(false)
	const [progress, setProgress] = useState(0) // 0..1
	const [duration, setDuration] = useState(file.duration || 0)
	const [current, setCurrent] = useState(0)
	const audioRef = useRef(null)

	const url = toUrl(file.url || file.audio)

	const toggle = () => {
		const a = audioRef.current
		if (!a) return
		if (playing) {
			a.pause()
		} else {
			a.play()
		}
		setPlaying(!playing)
	}

	const handleTimeUpdate = () => {
		const a = audioRef.current
		if (!a || !a.duration) return
		setCurrent(a.currentTime)
		setProgress(a.currentTime / a.duration)
	}

	const handleLoaded = () => {
		const a = audioRef.current
		if (a && a.duration && isFinite(a.duration)) setDuration(a.duration)
	}

	const handleEnded = () => {
		setPlaying(false)
		setProgress(1)
	}

	const handleSeek = e => {
		const a = audioRef.current
		if (!a || !a.duration) return
		const rect = e.currentTarget.getBoundingClientRect()
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
		a.currentTime = ratio * a.duration
		setProgress(ratio)
	}

	const fmtTime = s => {
		if (!s || !isFinite(s)) return '0:00'
		return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
	}

	// Waveform bars (static, seeded from url for consistency)
	const bars = Array.from({ length: 36 }, (_, i) => {
		const seed = url?.charCodeAt(i % url.length) || 0
		return 0.2 + ((Math.sin(seed * 0.7 + i * 0.4) + 1) / 2) * 0.8
	})

	const accent = isMine ? 'rgba(255,255,255,0.9)' : '#0A84FF'
	const dim = isMine ? 'rgba(255,255,255,0.3)' : 'rgba(0,122,255,0.28)'

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				minWidth: 220,
				maxWidth: 300,
			}}
		>
			<audio
				ref={audioRef}
				src={url}
				onTimeUpdate={handleTimeUpdate}
				onLoadedMetadata={handleLoaded}
				onEnded={handleEnded}
				preload='metadata'
			/>

			{/* Play / Pause */}
			<button
				onClick={toggle}
				style={{
					width: 42,
					height: 42,
					borderRadius: '50%',
					border: 'none',
					flexShrink: 0,
					cursor: 'pointer',
					background: isMine
						? 'rgba(255,255,255,0.22)'
						: 'rgba(10,132,255,0.14)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: accent,
					transition: 'background .15s, transform .1s',
				}}
				onMouseDown={e => (e.currentTarget.style.transform = 'scale(.92)')}
				onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
			>
				{playing ? (
					<svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
						<rect
							x='2'
							y='1'
							width='4'
							height='12'
							rx='1.5'
							fill='currentColor'
						/>
						<rect
							x='8'
							y='1'
							width='4'
							height='12'
							rx='1.5'
							fill='currentColor'
						/>
					</svg>
				) : (
					<svg width='14' height='16' viewBox='0 0 14 16' fill='none'>
						<path d='M1.5 1.5l11 6.5-11 6.5V1.5z' fill='currentColor' />
					</svg>
				)}
			</button>

			{/* Waveform + seek */}
			<div
				style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}
			>
				{/* Waveform bars — clickable seek */}
				<div
					onClick={handleSeek}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 1.5,
						height: 26,
						cursor: 'pointer',
					}}
				>
					{bars.map((h, i) => {
						const filled = i / bars.length < progress
						return (
							<div
								key={i}
								style={{
									width: 2.5,
									flexShrink: 0,
									borderRadius: 2,
									height: Math.max(3, h * 26),
									background: filled ? accent : dim,
									transition: 'background .1s',
								}}
							/>
						)
					})}
				</div>

				{/* Time row */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<span
						style={{
							fontSize: 11,
							fontVariantNumeric: 'tabular-nums',
							color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--txt3)',
						}}
					>
						{playing ? fmtTime(current) : fmtTime(duration)}
					</span>
					{/* Mic icon */}
					<svg
						width='12'
						height='12'
						viewBox='0 0 24 24'
						fill='none'
						style={{ opacity: 0.45 }}
					>
						<rect
							x='9'
							y='2'
							width='6'
							height='12'
							rx='3'
							stroke={isMine ? '#fff' : '#0A84FF'}
							strokeWidth='1.7'
						/>
						<path
							d='M5 10a7 7 0 0 0 14 0'
							stroke={isMine ? '#fff' : '#0A84FF'}
							strokeWidth='1.7'
							strokeLinecap='round'
						/>
					</svg>
				</div>
			</div>
		</div>
	)
})

// ─── FILE BUBBLE ──────────────────────────────────────────────────────────────
export const FileBubble = memo(function FileBubble({ file, isMine }) {
	const url = toUrl(file.url)
	const mime = file.mimetype || ''
	const isImg =
		mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url || '')
	const isVid =
		mime.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(url || '')
	const isAudio =
		mime.startsWith('audio/') || /\.(mp3|ogg|wav|webm|m4a)$/i.test(url || '')

	if (isImg) return <ImageBubble files={[file]} isMine={isMine} />
	if (isVid) return <VideoBubble file={file} isMine={isMine} />
	if (isAudio) return <AudioBubble file={file} isMine={isMine} />

	// Generic file
	const name =
		file.filename || file.originalname || (url || '').split('/').pop() || 'Fayl'
	const size = file.size
		? file.size > 1048576
			? `${(file.size / 1048576).toFixed(1)} MB`
			: `${(file.size / 1024).toFixed(0)} KB`
		: ''

	const ext = name.split('.').pop()?.toUpperCase() || 'FILE'
	const ic = isMine ? '#fff' : '#0A84FF'
	const ibg = isMine ? 'rgba(255,255,255,0.18)' : 'rgba(10,132,255,0.12)'

	return (
		<a
			href={url}
			target='_blank'
			rel='noreferrer'
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 11,
				textDecoration: 'none',
				minWidth: 180,
				maxWidth: 280,
				padding: '10px 14px',
			}}
		>
			{/* File icon with extension */}
			<div
				style={{
					width: 44,
					height: 44,
					borderRadius: 10,
					flexShrink: 0,
					background: ibg,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 1,
				}}
			>
				<svg width='20' height='22' viewBox='0 0 24 26' fill='none'>
					<path
						d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'
						stroke={ic}
						strokeWidth='1.7'
					/>
					<path
						d='M14 2v6h6'
						stroke={ic}
						strokeWidth='1.7'
						strokeLinecap='round'
					/>
				</svg>
				<span
					style={{
						fontSize: 8,
						fontWeight: 700,
						color: ic,
						letterSpacing: '.5px',
					}}
				>
					{ext.slice(0, 4)}
				</span>
			</div>

			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontSize: 14,
						fontWeight: 500,
						color: isMine ? '#fff' : 'var(--txt1)',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{name.length > 26 ? name.slice(0, 24) + '…' : name}
				</div>
				<div
					style={{
						fontSize: 12,
						marginTop: 2,
						display: 'flex',
						alignItems: 'center',
						gap: 6,
					}}
				>
					{size && (
						<span
							style={{
								color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--txt3)',
							}}
						>
							{size}
						</span>
					)}
					<span
						style={{
							fontSize: 11,
							color: isMine ? 'rgba(255,255,255,0.5)' : 'var(--txt3)',
							display: 'flex',
							alignItems: 'center',
							gap: 3,
						}}
					>
						<svg width='11' height='11' viewBox='0 0 24 24' fill='none'>
							<path
								d='M12 3v13M7 12l5 5 5-5'
								stroke='currentColor'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
							<path
								d='M5 20h14'
								stroke='currentColor'
								strokeWidth='2'
								strokeLinecap='round'
							/>
						</svg>
						Yuklab olish
					</span>
				</div>
			</div>
		</a>
	)
})

// ─── SMART MEDIA RENDERER ─────────────────────────────────────────────────────
// msg.files[] va msg.video[] massivlarini aqlli render qiladi
export function MsgMedia({ msg, isMine }) {
	const files = msg.files || []
	const videos = msg.video || []
	const audio = msg.audio ? [{ url: msg.audio, mimetype: 'audio/webm' }] : []

	// Rasmlarni guruhlaymiz
	const images = files.filter(f => {
		const mime = f.mimetype || ''
		const url = f.url || ''
		return mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
	})
	const otherFiles = files.filter(f => {
		const mime = f.mimetype || ''
		const url = f.url || ''
		return (
			!mime.startsWith('image/') && !/\.(jpg|jpeg|png|gif|webp)$/i.test(url)
		)
	})

	return (
		<>
			{/* Rasmlar — birgalikda grid */}
			{images.length > 0 && (
				<div
					style={{
						marginBottom:
							msg.text || otherFiles.length || videos.length || audio.length
								? 6
								: 0,
					}}
				>
					<ImageBubble files={images} isMine={isMine} />
				</div>
			)}

			{/* Videolar */}
			{videos.map((v, i) => (
				<div
					key={i}
					style={{ marginBottom: msg.text || i < videos.length - 1 ? 6 : 0 }}
				>
					<VideoBubble file={v} isMine={isMine} />
				</div>
			))}

			{/* Audio / ovozli xabar */}
			{audio.map((a, i) => (
				<div key={i} style={{ marginBottom: msg.text ? 6 : 0 }}>
					<AudioBubble file={a} isMine={isMine} />
				</div>
			))}

			{/* Boshqa fayllar */}
			{otherFiles.map((f, i) => (
				<div
					key={i}
					style={{
						marginBottom: msg.text || i < otherFiles.length - 1 ? 6 : 0,
					}}
				>
					<FileBubble file={f} isMine={isMine} />
				</div>
			))}
		</>
	)
}

/*
── MainPanel.jsx ichida ishlatish ────────────────────────────────────────────

import { MsgMedia } from './MediaViewer'

// MsgBubble ichida:
{(msg.files?.length || msg.video?.length || msg.audio) && (
  <MsgMedia msg={msg} isMine={isMine}/>
)}

── global CSS ga qo'shing ────────────────────────────────────────────────────

@keyframes tgFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
*/
