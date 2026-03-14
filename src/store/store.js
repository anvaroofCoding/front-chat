import { configureStore } from '@reduxjs/toolkit'
import { api } from './api'
import { realtimeMiddleware } from './realtimeMiddleware'
import { realtimeReducer } from './realtimeSlice'

export const store = configureStore({
	reducer: {
		[api.reducerPath]: api.reducer,
		realtime: realtimeReducer,
	},
	middleware: getDefaultMiddleware =>
		getDefaultMiddleware().concat(api.middleware, realtimeMiddleware),
})
