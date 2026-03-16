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
import { UserPlus } from 'lucide-react'
import { useState } from 'react'

export default function CreateChat() {
	const [open, setOpen] = useState(false)

	const handleSubmit = e => {
		e.preventDefault()
		const data = new FormData(e.currentTarget)
		console.log({ username: String(data.get('username') ?? '') })
		setOpen(false)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant='default' className='w-full justify-between'>
					Yangi chat
					<UserPlus className='size-3.5' />
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-sm'>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Yangi chat boshlash</DialogTitle>
						<DialogDescription>
							Foydalanuvchi nomini kiriting.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup className='my-4'>
						<Field>
							<Label htmlFor='chat-user'>Foydalanuvchi</Label>
							<Input id='chat-user' name='username' placeholder='@username' />
						</Field>
					</FieldGroup>
					<DialogFooter>
						<DialogClose asChild>
							<Button type='button' variant='outline'>
								Bekor
							</Button>
						</DialogClose>
						<Button type='submit'>Boshlash</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
