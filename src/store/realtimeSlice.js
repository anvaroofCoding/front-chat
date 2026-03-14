import { createSlice } from '@reduxjs/toolkit'

const initialState = {
	isConnected: false,
	activeConversationId: '',
	lastMessageAt: null,
	unreadCounts: {},
	// { [conversationId]: { [userId]: { name, lastAt } } }
	typingByConversation: {},
}

const realtimeSlice = createSlice({
	name: 'realtime',
	initialState,
	reducers: {
		realtimeInit(state) {
			return state
		},
		realtimeShutdown(state) {
			state.isConnected = false
			state.activeConversationId = ''
			state.unreadCounts = {}
			state.typingByConversation = {}
		},
		setActiveConversation(state, action) {
			const conversationId = action.payload || ''
			state.activeConversationId = conversationId
			if (conversationId) {
				state.unreadCounts[conversationId] = 0
			}
		},
		clearActiveConversation(state) {
			state.activeConversationId = ''
		},
		socketConnected(state) {
			state.isConnected = true
		},
		socketDisconnected(state) {
			state.isConnected = false
		},
		messageReceived(state, action) {
			state.lastMessageAt = Date.now()
			const conversationId = action.payload?.conversationId || ''
			if (!conversationId) return
			if (state.activeConversationId === conversationId) {
				state.unreadCounts[conversationId] = 0
				return
			}
			state.unreadCounts[conversationId] =
				(state.unreadCounts[conversationId] || 0) + 1
		},
		resetConversationUnread(state, action) {
			const conversationId = action.payload || ''
			if (!conversationId) return
			state.unreadCounts[conversationId] = 0
		},
		userTyping(state, action) {
			const { conversationId, userId, name } = action.payload || {}
			if (!conversationId || !userId) return
			if (!state.typingByConversation[conversationId]) {
				state.typingByConversation[conversationId] = {}
			}
			state.typingByConversation[conversationId][userId] = {
				name: name || 'Kimdir',
				lastAt: Date.now(),
			}
		},
		userStoppedTyping(state, action) {
			const { conversationId, userId } = action.payload || {}
			if (!conversationId || !userId) return
			const convMap = state.typingByConversation[conversationId]
			if (!convMap) return
			delete convMap[userId]
			if (Object.keys(convMap).length === 0) {
				delete state.typingByConversation[conversationId]
			}
		},
		sendTyping() {
			// handled by middleware (no direct state change)
		},
	},
})

export const realtimeActions = realtimeSlice.actions
export const realtimeReducer = realtimeSlice.reducer
