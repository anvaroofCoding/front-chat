import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@/components/ui/resizable'
import MainPages from '@/elements/MainPages'
import Menu from '@/elements/menu'

export default function Telegram_Sidebar() {
	return (
		<ResizablePanelGroup direction='horizontal' className='h-screen w-full'>
			<ResizablePanel
				id='sidebar-panel'
				order={1}
				defaultSize={400}
				minSize={200}
				maxSize={400}
				className='h-screen'
			>
				<div className='h-full border-r'>
					<Menu />
				</div>
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel
				id='content-panel'
				order={2}
				defaultSize={72}
				minSize={55}
				className='h-screen'
			>
				<div className='h-full'>
					<MainPages />
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	)
}
