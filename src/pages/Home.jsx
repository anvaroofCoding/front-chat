import { Link, Outlet } from 'react-router-dom'

export default function Home() {
	return (
		<div className='min-h-screen bg-slate-50 text-slate-900'>
			<header className='bg-white shadow-sm'>
				<div className='container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-4'>
					<h1 className='text-xl font-semibold'>Chat App</h1>
					<nav className='flex flex-wrap items-center gap-2'>
						<Link
							to='/'
							className='rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'
						>
							Dashboard
						</Link>
						<Link
							to='/chats'
							className='rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'
						>
							Chats
						</Link>
						<Link
							to='/login'
							className='rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'
						>
							Login
						</Link>
						<Link
							to='/register'
							className='rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'
						>
							Register
						</Link>
					</nav>
				</div>
			</header>

			<main className='container mx-auto px-4 py-8'>
				<Outlet />
			</main>
		</div>
	)
}
