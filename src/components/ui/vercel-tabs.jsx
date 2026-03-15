import { cn } from '@/lib/utils'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

const Tabs = React.forwardRef(
	({ className, tabs = [], activeTab, onTabChange, ...props }, ref) => {
		const [hoveredIndex, setHoveredIndex] = useState(null)
		const [activeIndex, setActiveIndex] = useState(0)

		const tabRefs = useRef([])

		const [hoverStyle, setHoverStyle] = useState({})
		const [activeStyle, setActiveStyle] = useState({
			left: '0px',
			width: '0px',
		})

		useEffect(() => {
			if (!Array.isArray(tabs) || tabs.length === 0) {
				setActiveIndex(0)
				return
			}

			if (activeTab) {
				const idx = tabs.findIndex(tab => tab.id === activeTab)
				if (idx >= 0) {
					setActiveIndex(idx)
					return
				}
			}

			if (activeIndex >= tabs.length) {
				setActiveIndex(0)
			}
		}, [activeTab, tabs, activeIndex])

		useEffect(() => {
			if (hoveredIndex !== null) {
				const hoveredElement = tabRefs.current[hoveredIndex]

				if (hoveredElement) {
					const { offsetLeft, offsetWidth } = hoveredElement

					setHoverStyle({
						left: `${offsetLeft}px`,
						width: `${offsetWidth}px`,
					})
				}
			}
		}, [hoveredIndex])

		useEffect(() => {
			const activeElement = tabRefs.current[activeIndex]

			if (activeElement) {
				const { offsetLeft, offsetWidth } = activeElement

				setActiveStyle({
					left: `${offsetLeft}px`,
					width: `${offsetWidth}px`,
				})
			}
		}, [activeIndex])

		useEffect(() => {
			requestAnimationFrame(() => {
				const firstElement = tabRefs.current[0]

				if (firstElement) {
					const { offsetLeft, offsetWidth } = firstElement

					setActiveStyle({
						left: `${offsetLeft}px`,
						width: `${offsetWidth}px`,
					})
				}
			})
		}, [])

		return (
			<div ref={ref} className={cn('relative', className)} {...props}>
				<div className='relative'>
					{/* Hover Highlight */}
					<div
						className='absolute h-[30px] transition-all duration-300 ease-out bg-[#0e0f1114] dark:bg-[#ffffff1a] rounded-[6px]'
						style={{
							...hoverStyle,
							opacity: hoveredIndex !== null ? 1 : 0,
						}}
					/>

					{/* Active Indicator */}
					<div
						className='absolute bottom-[-6px] h-[2px] bg-[#0e0f11] dark:bg-white transition-all duration-300 ease-out'
						style={activeStyle}
					/>

					{/* Tabs */}
					<div className='relative flex space-x-[6px] items-center'>
						{tabs.map((tab, index) => (
							<div
								key={tab.id}
								ref={el => (tabRefs.current[index] = el)}
								className={cn(
									'px-3 py-2 cursor-pointer transition-colors duration-300 h-[30px]',
									index === activeIndex
										? 'text-[#0e0e10] dark:text-white'
										: 'text-[#0e0f1199] dark:text-[#ffffff99]',
								)}
								onMouseEnter={() => setHoveredIndex(index)}
								onMouseLeave={() => setHoveredIndex(null)}
								onClick={() => {
									setActiveIndex(index)
									onTabChange?.(tab.id)
								}}
							>
								<div className='text-sm font-medium leading-5 whitespace-nowrap flex items-center gap-2 h-full'>
									{/* Icon */}
									{tab.icon && (
										<span className='flex items-center justify-center'>
											{tab.icon}
										</span>
									)}

									{/* Label */}
									<span>{tab.label}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		)
	},
)

Tabs.displayName = 'Tabs'

export { Tabs }
