import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { realtimeActions } from './realtimeSlice'
import { store } from './store'

export function StoreProvider({ children }) {
	useEffect(() => {
		store.dispatch(realtimeActions.realtimeInit())
		return () => {
			store.dispatch(realtimeActions.realtimeShutdown())
		}
	}, [])

	return <Provider store={store}>{children}</Provider>
}
