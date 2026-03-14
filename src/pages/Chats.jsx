export default function Chats() {
	return (
		<div className='space-y-4'>
			<div className='rounded-xl bg-white p-6 shadow-sm'>
				<h2 className='text-xl font-semibold text-slate-900'>Chats</h2>
				<p className='mt-2 text-sm text-slate-600'>
					This is a placeholder for the chats view. Add your chat UI here.
				</p>
			</div>
			<div className='rounded-xl bg-white p-6 shadow-sm'>
				<p className='text-sm text-slate-600'>
					Tip: Use the API slice to fetch chat threads and render messages here.
				</p>
			</div>
		</div>
	)
}
