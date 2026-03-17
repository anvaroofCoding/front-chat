import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateGroupMutation } from '@/store/api'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'

export default function CreateGroup({ onSuccess }) {
	const [open, setOpen] = useState(false)
	const [createGroup, { isLoading }] = useCreateGroupMutation()

	const handleSubmit = async e => {
		e.preventDefault()
		const data = new FormData(e.currentTarget)
		const name = String(data.get('name') ?? '')
		const description = String(data.get('description') ?? '').slice(0, 100)
		try {
			await createGroup({
				name,
				description,
			}).unwrap()
			e.currentTarget.reset()
			setOpen(false)
			onSuccess?.()
		} catch (error) {
			console.error('Failed to create group:', error)
		} finally {
			setOpen(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant='default' className='w-full justify-between'>
					Yangi guruh
					<UserPlus className='size-3.5' />
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-sm'>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Yangi guruh yaratish</DialogTitle>
						<DialogDescription>
							Guruh ma&apos;lumotlarini kiriting.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup className='my-4'>
						<Field>
							<Label htmlFor='group-name'>Nomi</Label>
							<Input
								id='group-name'
								name='name'
								placeholder='Guruh nomi yozing...'
							/>
						</Field>
						<Field>
							<Label htmlFor='group-desc'>Tavsif</Label>
							<Textarea
								id='group-desc'
								name='description'
								maxLength={100}
								placeholder='Guruh haqida...'
							/>
						</Field>
					</FieldGroup>
					<DialogFooter>
						<DialogClose asChild>
							<Button type='button' variant='outline'>
								Bekor
							</Button>
						</DialogClose>
						<Button type='submit' disabled={isLoading}>
							{isLoading ? 'Saqlanmoqda...' : 'Saqlash'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
