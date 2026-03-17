import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	useAddMembersMutation,
	useEditGroupMutation,
	useGetConversationsQuery,
	useGetUsersQuery,
} from '@/store/api'
import {
	Check,
	CircleAlert,
	Eraser,
	MoreVertical,
	PencilLine,
	Save,
	Search,
	Trash2,
	UserPlus,
	Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

const baseItemClass =
	'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-accent'

function formatDate(value) {
	if (!value) return '—'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return '—'
	return date.toLocaleString('uz', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

const AVATAR_COLORS = [
	{ bg: 'bg-violet-100', text: 'text-violet-700' },
	{ bg: 'bg-teal-100', text: 'text-teal-700' },
	{ bg: 'bg-orange-100', text: 'text-orange-700' },
	{ bg: 'bg-blue-100', text: 'text-blue-700' },
	{ bg: 'bg-green-100', text: 'text-green-700' },
]

function getAvatarColor(id = '') {
	return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length]
}

function getUserInitials(user) {
	const f = (user?.firstname || '').charAt(0).toUpperCase()
	const l = (user?.lastname || '').charAt(0).toUpperCase()
	return f + l || (user?.email || '?').charAt(0).toUpperCase()
}

function getInitials(name = '') {
	const parts = String(name).trim().split(/\s+/).filter(Boolean)
	if (!parts.length) return 'G'
	if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
	return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function resolveAssetUrl(raw = '') {
	if (!raw) return ''
	if (/^https?:\/\//i.test(raw)) return raw
	const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
	const base = apiBase.replace(/\/api\/?$/, '')
	return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`
}

function resolveGroupAvatar(groupData) {
	const raw = groupData?.avatar || groupData?.image || ''
	return resolveAssetUrl(raw)
}

function resolveUserAvatar(user) {
	const raw = user?.avatar || user?.profileImage || user?.image || ''
	return resolveAssetUrl(raw)
}

const MoreVenticalInformation = ({
	isGroup,
	onEditGroup,
	onViewMembers,
	onDeleteGroup,
	onClearHistory,
}) => {
	const [editGroup, setEditGroup] = useState(false)
	const [about, setAbout] = useState(false)
	const [members, setMembers] = useState(false)
	const [selectedMemberIds, setSelectedMemberIds] = useState([])
	const [editName, setEditName] = useState('')
	const [editDescription, setEditDescription] = useState('')
	const [editAvatar, setEditAvatar] = useState(null)
	const { chatId } = useParams()
	const { data: conversation } = useGetConversationsQuery(chatId)
	const [query, setQuery] = useState('')
	const [addMembers, { isLoading: isAddingMembers }] = useAddMembersMutation()
	const [editGroups, { isLoading: isEditingGroup }] = useEditGroupMutation()
	const ownerIdLocale = localStorage.getItem('userId') || ''

	const groupData = conversation?.groupId || {}
	const groupName = groupData?.name || conversation?.name || 'Guruh'
	const groupDescription = groupData?.description || 'Tavsif kiritilmagan'
	const groupOwnerId = groupData?.owner || '—'
	const membersCount = Array.isArray(conversation?.members)
		? conversation.members.length
		: 0
	const createdAt = groupData?.createdAt || conversation?.createdAt
	const groupAvatar = resolveGroupAvatar(groupData)

	const {
		data: users,
		isLoading: isUsersLoading,
		isError: isUsersError,
		refetch: refetchUsers,
	} = useGetUsersQuery()

	const usersRaw = users?.users || users?.data || users
	const usersList = useMemo(
		() => (Array.isArray(usersRaw) ? usersRaw : []),
		[usersRaw],
	)
	const existingMemberIds = new Set(
		(Array.isArray(conversation?.members) ? conversation.members : [])
			.map(member => (typeof member === 'string' ? member : member?._id))
			.filter(Boolean),
	)

	const handleSaveMembers = async () => {
		const payload = { userId: selectedMemberIds }
		try {
			for (const userId of selectedMemberIds) {
				const payload = { userId }
				await addMembers({ chatData: payload, id: groupData._id }).unwrap()
			}
			setMembers(false)
			setSelectedMemberIds([])
			setQuery('')
			toast.success('A&apos;zolar guruhga qo&apos;shildi')
		} catch (error) {
			console.log(error)
		}
	}

	const filtered = useMemo(() => {
		const q = query.toLowerCase()
		return usersList.filter(u => {
			const name = `${u?.firstname || ''} ${u?.lastname || ''}`.toLowerCase()
			return (
				name.includes(q) ||
				(u?.email || '').toLowerCase().includes(q) ||
				(u?.job || '').toLowerCase().includes(q)
			)
		})
	}, [usersList, query])

	function handleToggle(id) {
		setSelectedMemberIds(prev =>
			prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
		)
	}

	function handleCancel() {
		setMembers(false)
		setSelectedMemberIds([])
		setQuery('')
	}

	const handleEditSubmit = async () => {
		try {
			await editGroups({ chatData: { name: editName, description: editDescription, avatar: editAvatar }, id: groupData._id }).unwrap()
			toast.success('Guruh muvaffaqiyatli tahrirlandi')
			setEditGroup(false)
		} catch (error) {
			console.log(error)
		}
	}

	const handleEditDialogOpen = (open) => {
		if (open) {
			setEditName(groupName)
			setEditDescription(groupDescription)
			setEditAvatar(null)
		}
		setEditGroup(open)
	}


	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant='ghost'
						size='icon'
						className='size-9 rounded-xl text-muted-foreground hover:text-foreground'
					>
						<MoreVertical className='size-4' />
					</Button>
				</PopoverTrigger>
				<PopoverContent align='end' className='w-60 p-1.5'>
					<button
						type='button'
						className={baseItemClass}
						onClick={() => {
							setAbout(true)
						}}
					>
						<CircleAlert className='size-4 text-muted-foreground' />
						<span>Guruh haqida</span>
					</button>

					{groupOwnerId._id === ownerIdLocale ? (
						<button
							type='button'
							className={baseItemClass}
							onClick={() => {
								setMembers(true)
							}}
						>
							<UserPlus className='size-4 text-muted-foreground' />
							<span>Guruhga odam qo&apos;shish</span>
						</button>
					) : null}



					{groupOwnerId._id === ownerIdLocale ? (
						<button type='button' className={baseItemClass} onClick={() => handleEditDialogOpen(true)}>
							<PencilLine className='size-4 text-muted-foreground' />
							<span>Guruhni tahrirlash</span>
						</button>
					) : null}

					<button
						type='button'
						className={baseItemClass}
						onClick={onViewMembers}
					>
						<Users className='size-4 text-muted-foreground' />
						<span>A&apos;zolarni ko&apos;rish</span>
					</button>

					<div className='my-1 h-px bg-border/70' />

					<button
						type='button'
						className={`${baseItemClass} text-amber-600 dark:text-amber-400`}
						onClick={onClearHistory}
					>
						<Eraser className='size-4' />
						<span>Clear history</span>
					</button>

					<button
						type='button'
						className={`${baseItemClass} text-destructive`}
						onClick={onDeleteGroup}
					>
						<Trash2 className='size-4' />
						<span>{isGroup ? "Guruhni o'chirish" : "Chatni o'chirish"}</span>
					</button>
				</PopoverContent>
			</Popover>

			{/* Haqida */}
			<Dialog open={about} onOpenChange={setAbout}>
				<DialogContent className='sm:max-w-md' showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Guruh haqida</DialogTitle>
						<DialogDescription>
							Guruh bo&apos;yicha asosiy ma&apos;lumotlar.
						</DialogDescription>
					</DialogHeader>

					{!isGroup ? (
						<div className='rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
							Bu chat guruh emas.
						</div>
					) : (
						<div className='space-y-4'>
							<div className='flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3'>
								<Avatar className='size-12'>
									<AvatarImage src={groupAvatar} alt={groupName} />
									<AvatarFallback>{getInitials(groupName)}</AvatarFallback>
								</Avatar>
								<div className='min-w-0'>
									<p className='truncate text-sm font-semibold'>{groupName}</p>
									<p className='truncate text-xs text-muted-foreground'>
										{groupDescription}
									</p>
								</div>
							</div>

							<div className='space-y-2 text-sm'>
								<div className='flex items-center justify-between gap-3'>
									<span className='text-muted-foreground'>
										A&apos;zolar soni
									</span>
									<span className='font-medium'>{membersCount}ta</span>
								</div>
								<div className='flex items-center justify-between gap-3'>
									<span className='text-muted-foreground'>Yaratuvchi</span>
									<span className='max-w-[60%] truncate font-mono text-xs'>
										{groupOwnerId?.email}
									</span>
								</div>
								<div className='flex items-center justify-between gap-3'>
									<span className='text-muted-foreground'>
										Yaratilgan vaqti
									</span>
									<span className='font-medium'>{formatDate(createdAt)}</span>
								</div>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* A'zolar */}
			<Dialog open={members} onOpenChange={setMembers}>
				<DialogContent className='sm:max-w-md' showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Guruhga odam qo&apos;shish</DialogTitle>
						<DialogDescription>
							A&apos;zolar ro&apos;yxatidan tanlang va saqlang.
						</DialogDescription>
					</DialogHeader>

					{!isGroup ? (
						<div className='rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
							Bu chat guruh emas.
						</div>
					) : isUsersLoading ? (
						<div className='rounded-lg border border-border/70 bg-muted/40 px-3 py-4 text-center text-sm text-muted-foreground'>
							Yuklanmoqda...
						</div>
					) : isUsersError ? (
						<div className='space-y-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-3 text-sm text-muted-foreground'>
							<p>Foydalanuvchilarni yuklashda xatolik.</p>
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={refetchUsers}
							>
								Qayta urinish
							</Button>
						</div>
					) : (
						<div className='space-y-3'>
							{/* Group info + badge */}
							<div className='flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5'>
								<Avatar className='h-9 w-9 shrink-0'>
									<AvatarImage src={groupAvatar} alt={groupName} />
									<AvatarFallback className='bg-violet-100 text-sm font-semibold text-violet-700'>
										{getInitials(groupName)}
									</AvatarFallback>
								</Avatar>
								<div className='min-w-0 flex-1'>
									<p className='truncate text-sm font-semibold'>{groupName}</p>
									<p className='text-xs text-muted-foreground'>
										Joriy a&apos;zolar: {membersCount} ta
									</p>
								</div>
								{selectedMemberIds.length > 0 && (
									<span className='shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'>
										{selectedMemberIds.length} tanlandi
									</span>
								)}
							</div>

							{/* Search */}
							<div className='relative'>
								<Search className='absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
								<Input
									value={query}
									onChange={e => setQuery(e.target.value)}
									placeholder='Qidirish...'
									className='pl-8 text-sm'
								/>
							</div>

							{/* User list */}
							<div className='max-h-64 space-y-1 overflow-y-auto pr-0.5'>
								{filtered.length === 0 ? (
									<p className='py-6 text-center text-sm text-muted-foreground'>
										Foydalanuvchi topilmadi
									</p>
								) : (
									filtered.map(user => {
										const userId = user?._id
										const fullName =
											`${user?.firstname || ''} ${user?.lastname || ''}`.trim()
										const displayName = fullName || user?.email || 'User'
										const subLabel = user?.job || user?.email || ''
										const selected = selectedMemberIds.includes(userId)
										const alreadyInGroup = existingMemberIds.has(userId)
										const { bg, text } = getAvatarColor(userId)
										const initials = getUserInitials(user)
										const userAvatar = resolveUserAvatar(user)

										return (
											<button
												key={userId}
												type='button'
												onClick={() => handleToggle(userId)}
												disabled={alreadyInGroup}
												className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${alreadyInGroup
													? 'cursor-not-allowed border-border/40 bg-muted/30 opacity-60'
													: selected
														? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
														: 'border-border/50 bg-background hover:bg-accent/40'
													}`}
											>
												{/* Avatar */}
												<div className='relative shrink-0'>
													<Avatar className='h-9 w-9'>
														<AvatarImage src={userAvatar} alt={displayName} />
														<AvatarFallback
															className={`${bg} ${text} text-xs font-semibold`}
														>
															{initials}
														</AvatarFallback>
													</Avatar>
													<span
														className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${user?.isOnline
															? 'bg-emerald-500'
															: 'bg-muted-foreground/40'
															}`}
													/>
												</div>

												{/* Name + job */}
												<div className='min-w-0 flex-1'>
													<p className='truncate text-sm font-medium text-foreground'>
														{displayName}
													</p>
													<p className='truncate text-xs text-muted-foreground'>
														{subLabel}
													</p>
												</div>

												{/* Status */}
												<div className='shrink-0'>
													{alreadyInGroup ? (
														<span className='rounded-full border border-border/50 bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground'>
															A&apos;zo
														</span>
													) : selected ? (
														<div className='flex h-5 w-5 items-center justify-center rounded-full bg-primary'>
															<Check className='size-3 text-primary-foreground' />
														</div>
													) : (
														<div className='h-5 w-5 rounded-full border border-border/60' />
													)}
												</div>
											</button>
										)
									})
								)}
							</div>

							{/* Footer */}
							<div className='flex items-center justify-between gap-2 border-t border-border/60 pt-2'>
								<p className='text-xs text-muted-foreground'>
									Tanlandi: {selectedMemberIds.length} ta
								</p>
								<div className='flex items-center gap-2'>
									<Button
										type='button'
										variant='outline'
										size='sm'
										onClick={handleCancel}
										className={'rounded-lg'}
									>
										Bekor qilish
									</Button>
									<Button
										type='button'
										size='sm'
										onClick={handleSaveMembers}
										disabled={!selectedMemberIds.length}
										className={'rounded-lg'}
									>
										<Save className='mr-1.5 size-3.5' />
										Saqlash
									</Button>
								</div>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>


			{/* tahrirlash */}
			<Dialog open={editGroup} onOpenChange={handleEditDialogOpen}>
				<DialogContent className='sm:max-w-md' showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Guruhni tahrirlash</DialogTitle>
						<DialogDescription>
							Guruh ma&apos;lumotlarini yangilang.
						</DialogDescription>
					</DialogHeader>

					{!isGroup ? (
						<div className='rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
							Bu chat guruh emas.
						</div>
					) : (
						<div className='space-y-4'>
							{/* Name input */}
							<div className='space-y-2'>
								<label className='text-sm font-medium text-foreground'>
									Nomi
								</label>
								<Input
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									placeholder='Guruh nomini kiriting...'
									className='w-full'
								/>
							</div>

							{/* Description input */}
							<div className='space-y-2'>
								<label className='text-sm font-medium text-foreground'>
									Tavsif
								</label>
								<textarea
									value={editDescription}
									onChange={(e) => setEditDescription(e.target.value)}
									placeholder='Guruh tavsifini kiriting...'
									className='w-full min-h-[80px] rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none'
								/>
							</div>

							{/* Avatar input */}
							<div className='space-y-2'>
								<label className='text-sm font-medium text-foreground'>
									Avatar
								</label>
								<Input
									type='file'
									accept='image/*'
									onChange={(e) => setEditAvatar(e.target.files[0])}
									className='w-full'
								/>
								{editAvatar && (
									<p className='text-xs text-muted-foreground'>
										Tanlangan fayl: {editAvatar.name}
									</p>
								)}
							</div>

							{/* Action buttons */}
							<div className='flex items-center justify-end gap-2 pt-2 border-t border-border/60'>
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={() => setEditGroup(false)}
									className='rounded-lg'
								>
									Bekor qilish
								</Button>
								<Button
									type='button'
									size='sm'
									onClick={handleEditSubmit}
									className='rounded-lg'
								>
									<Save className='mr-1.5 size-3.5' />
									Saqlash
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	)
}

export default MoreVenticalInformation
