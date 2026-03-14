import { toast } from 'sonner'
import { useGetUsersQuery, useLogoutMutation } from '../store/api'

export default function Dashboard() {
	const { data: users, isLoading, error } = useGetUsersQuery()
	const [logout, { isLoading: isLoggingOut }] = useLogoutMutation()

	const testToast = () => {
		toast.success('Bu test toast! Muvaffaqiyatli ishlayapti.')
	}

	return (
		<div className='space-y-6'>
			<div className='flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white px-6 py-5 shadow-sm'>
				<div>
					<h2 className='text-xl font-semibold text-slate-900'>Users</h2>
					<p className='text-sm text-slate-600'>
						All registered users from the API.
					</p>
				</div>
				<div className='flex gap-2'>
					<button
						onClick={testToast}
						className='rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500'
					>
						Test Toast
					</button>
					<button
						onClick={() => logout()}
						disabled={isLoggingOut}
						className='rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'
					>
						Logout
					</button>
				</div>
			</div>

			{isLoading && (
				<div className='rounded-xl bg-white p-6 shadow-sm'>Loading users…</div>
			)}
			{error && (
				<div className='rounded-xl bg-white p-6 text-red-600 shadow-sm'>
					Error loading users
				</div>
			)}

			{users && (
				<div className='rounded-xl bg-white p-6 shadow-sm'>
					<ul className='space-y-2'>
						{users.map(user => (
							<li
								key={user.id}
								className='rounded border border-slate-200 bg-slate-50 px-4 py-3'
							>
								{user.name}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}
