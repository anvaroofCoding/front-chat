import { ensureSocketAuth, socket } from '@/elements/socket'
import { api } from './api'
import { realtimeActions } from './realtimeSlice'

const CHAT_QUERY_ARGS = ['all', 'private', 'group']

function normalizeId(id) {
	if (!id) return ''
	if (typeof id === 'string') {
		const value = id.trim()
		if (!value) return ''
		if (value === 'undefined' || value === 'null') return ''
		return value
	}
	if (typeof id === 'number') return String(id)
	if (typeof id === 'object') return id._id || id.id || id.userId || ''
	return ''
}

function getMessageId(message) {
	return message?._id || message?.id || message?.messageId || ''
}

function getMessageConversationId(message) {
	return normalizeId(
		// Backend turli nomlar bilan jo'natishi mumkin,
		// hammasini birma-bir tekshiramiz
		message?.conversationId ||
			message?.conversation?._id ||
			message?.conversation ||
			message?.chatId ||
			message?.roomId ||
			message?.room?._id ||
			message?.room,
	)
}

function getMessageSenderId(message) {
	return normalizeId(message?.sender?._id || message?.sender || message?.userId)
}

function getMessageDedupKey(message) {
	const messageId = getMessageId(message)
	if (messageId) return `id:${messageId}`

	const conversationId = getMessageConversationId(message)
	const senderId = getMessageSenderId(message)
	const createdAt = message?.createdAt || message?.timestamp || ''
	const text = message?.text || ''
	const fileCount = Array.isArray(message?.files) ? message.files.length : 0
	const videoCount = Array.isArray(message?.video) ? message.video.length : 0

	if (
		!conversationId &&
		!senderId &&
		!createdAt &&
		!text &&
		!fileCount &&
		!videoCount
	) {
		return ''
	}

	return [
		'fallback',
		conversationId,
		senderId,
		createdAt,
		text,
		fileCount,
		videoCount,
	].join(':')
}

function upsertMessageList(draft, message) {
	if (!Array.isArray(draft) || !message) return
	const messageId = getMessageId(message)
	if (!messageId) return

	const index = draft.findIndex(item => getMessageId(item) === messageId)
	if (index >= 0) {
		draft[index] = { ...draft[index], ...message }
	} else {
		draft.push(message)
	}

	draft.sort(
		(a, b) =>
			new Date(a?.createdAt || 0).getTime() -
			new Date(b?.createdAt || 0).getTime(),
	)
}

function markMessageReadInList(draft, messageId) {
	if (!Array.isArray(draft) || !messageId) return
	const index = draft.findIndex(item => getMessageId(item) === messageId)
	if (index < 0) return
	draft[index].is_read = true
	draft[index].read = true
}

function markConversationReadByIdsInList(draft, messageIds) {
	if (!Array.isArray(draft) || !Array.isArray(messageIds) || !messageIds.length)
		return
	const idSet = new Set(messageIds)
	for (const item of draft) {
		const id = getMessageId(item)
		if (!idSet.has(id)) continue
		item.is_read = true
		item.read = true
	}
}

function markOutgoingMessagesReadInList(draft, myUserId) {
	if (!Array.isArray(draft) || !myUserId) return
	for (const item of draft) {
		const senderId = getMessageSenderId(item)
		if (!senderId || senderId !== myUserId) continue
		item.is_read = true
		item.read = true
	}
}

function markAllMessagesReadInList(draft) {
	if (!Array.isArray(draft)) return
	for (const item of draft) {
		item.is_read = true
		item.read = true
	}
}

function updateConversationList(draft, message, conversationId) {
	if (!Array.isArray(draft) || !conversationId || !message) return

	const index = draft.findIndex(
		conversation => normalizeId(conversation?._id) === conversationId,
	)
	if (index < 0) return

	// Directly mutate Immer draft item (spreading a proxy is unreliable)
	draft[index].lastMessage = message
	draft[index].lastMessageAt = message?.createdAt || draft[index].lastMessageAt
	draft[index].updatedAt = message?.createdAt || draft[index].updatedAt

	// Move to front if not already there
	if (index > 0) {
		const [item] = draft.splice(index, 1)
		draft.unshift(item)
	}
}

function getActiveConversationId(state) {
	return normalizeId(state?.realtime?.activeConversationId)
}

function unwrapSocketPayload(raw) {
	if (!raw) return null
	if (Array.isArray(raw)) return raw[0] || null
	return raw.payload || raw.data || raw.body || raw.detail || raw
}

export const realtimeMiddleware = store => {
	let listenersBound = false
	let joinedConversationId = ''
	let lastJoinPayload = null
	let lastChatsRefetchAt = 0
	// All conversation rooms joined (for list-level real-time)
	const joinedRooms = new Set()
	const processedMessageKeys = new Map()
	const typingCleanupTimers = new Map()

	const rememberProcessedMessage = dedupKey => {
		if (!dedupKey) return false

		const now = Date.now()
		const prevTs = processedMessageKeys.get(dedupKey)
		if (prevTs && now - prevTs < 120_000) {
			return true
		}

		processedMessageKeys.set(dedupKey, now)

		if (processedMessageKeys.size > 500) {
			for (const [key, ts] of processedMessageKeys) {
				if (now - ts >= 120_000 || processedMessageKeys.size > 300) {
					processedMessageKeys.delete(key)
				}
				if (processedMessageKeys.size <= 300) break
			}
		}

		return false
	}

	const getTypingTimerKey = (conversationId, userId) =>
		`${conversationId}:${userId}`

	const clearTypingTimer = (conversationId, userId) => {
		const timerKey = getTypingTimerKey(conversationId, userId)
		const timer = typingCleanupTimers.get(timerKey)
		if (timer) {
			clearTimeout(timer)
			typingCleanupTimers.delete(timerKey)
		}
	}

	const scheduleTypingCleanup = (conversationId, userId) => {
		clearTypingTimer(conversationId, userId)
		const timerKey = getTypingTimerKey(conversationId, userId)
		const timeout = setTimeout(() => {
			store.dispatch(
				realtimeActions.userStoppedTyping({ conversationId, userId }),
			)
			typingCleanupTimers.delete(timerKey)
		}, 3500)
		typingCleanupTimers.set(timerKey, timeout)
	}

	const clearAllTypingTimers = () => {
		for (const timeout of typingCleanupTimers.values()) {
			clearTimeout(timeout)
		}
		typingCleanupTimers.clear()
	}

	const getMeFromStore = () => {
		const meState = api.endpoints.getMe.select()(store.getState())
		return meState?.data
	}

	const buildPayload = (convId, me) => ({
		conversationId: convId,
		chatId: convId,
		userId: normalizeId(me?._id || localStorage.getItem('userId')),
		firstname: me?.firstname,
		lastname: me?.lastname,
		avatar: me?.avatar,
	})

	const refetchChatLists = (force = false) => {
		const now = Date.now()
		if (!force && now - lastChatsRefetchAt < 1500) return
		lastChatsRefetchAt = now

		for (const queryArg of CHAT_QUERY_ARGS) {
			store.dispatch(
				api.endpoints.getChats.initiate(queryArg, {
					forceRefetch: true,
					subscribe: false,
				}),
			)
		}
	}

	const refetchMessages = conversationId => {
		const convId = normalizeId(conversationId)
		if (!convId) return
		store.dispatch(
			api.endpoints.getMessages.initiate(convId, {
				forceRefetch: true,
				subscribe: false,
			}),
		)
	}

	// Join every conversation room so list events arrive for all chats.
	// No socket.connected guard — Socket.IO buffers emits until connected.
	const joinAllRooms = conversations => {
		const me = getMeFromStore()
		for (const conv of conversations) {
			const convId = normalizeId(conv._id)
			if (!convId || joinedRooms.has(convId)) continue
			socket.emit('join_conversation', buildPayload(convId, me))
			joinedRooms.add(convId)
		}
	}

	// Re-join all known rooms after socket (re)connects
	const rejoinAllRooms = () => {
		// Clear so join dedup doesn't block re-joins after reconnect
		const prevRooms = [...joinedRooms]
		joinedRooms.clear()
		const me = getMeFromStore()
		for (const convId of prevRooms) {
			socket.emit('join_conversation', buildPayload(convId, me))
			joinedRooms.add(convId)
		}
		// Also join any chats loaded into cache that we haven't joined yet
		for (const queryArg of CHAT_QUERY_ARGS) {
			const chatsState = api.endpoints.getChats.select(queryArg)(
				store.getState(),
			)
			if (Array.isArray(chatsState?.data)) {
				joinAllRooms(chatsState.data)
			}
		}
	}

	const leaveConversation = () => {
		if (!joinedConversationId || !lastJoinPayload) return
		socket.emit('leave_conversation', lastJoinPayload)
		joinedConversationId = ''
		lastJoinPayload = null
	}

	const joinConversation = conversationId => {
		const normalizedConversationId = normalizeId(conversationId)
		if (!normalizedConversationId) return
		if (joinedConversationId === normalizedConversationId && lastJoinPayload)
			return

		const me = getMeFromStore()
		const payload = buildPayload(normalizedConversationId, me)

		socket.emit('join_conversation', payload)
		joinedConversationId = normalizedConversationId
		lastJoinPayload = payload
		joinedRooms.add(normalizedConversationId)
	}

	const syncCachesFromIncomingMessage = message => {
		if (!message) return
		const conversationId = getMessageConversationId(message)
		if (!conversationId) return

		store.dispatch(
			api.util.updateQueryData('getMessages', conversationId, draft => {
				upsertMessageList(draft, message)
			}),
		)

		for (const queryArg of CHAT_QUERY_ARGS) {
			store.dispatch(
				api.util.updateQueryData('getChats', queryArg, draft => {
					updateConversationList(draft, message, conversationId)
				}),
			)
		}
	}

	const bindSocketListeners = () => {
		if (listenersBound) return
		listenersBound = true

		const onConnect = () => {
			store.dispatch(realtimeActions.socketConnected())
			// Re-join all rooms on reconnect so list events keep flowing
			rejoinAllRooms()
			refetchChatLists(true)
			const activeConversationId = getActiveConversationId(store.getState())
			if (activeConversationId) {
				joinConversation(activeConversationId)
			}
		}

		const onDisconnect = () => {
			store.dispatch(realtimeActions.socketDisconnected())
		}

		const onIncomingMessage = payload => {
			const message = payload?.message || payload
			const dedupKey = getMessageDedupKey(message)
			if (rememberProcessedMessage(dedupKey)) return

			const conversationId = getMessageConversationId(message)
			const me = getMeFromStore()
			const myUserId = normalizeId(me?._id || localStorage.getItem('userId'))
			const senderId = getMessageSenderId(message)

			if (conversationId && senderId && senderId !== myUserId) {
				clearTypingTimer(conversationId, senderId)
				store.dispatch(
					realtimeActions.userStoppedTyping({
						conversationId,
						userId: senderId,
					}),
				)
			}
			syncCachesFromIncomingMessage(message)
			refetchChatLists()
		}

		const onTyping = payload => {
			const data = unwrapSocketPayload(payload)
			if (!data) return
			const conversationId =
				getMessageConversationId(data) ||
				normalizeId(
					data.conversationId ||
						data.chatId ||
						data.roomId ||
						data.room?._id ||
						data.conversation?._id ||
						data.conversation,
				)
			const userId = normalizeId(
				data.userId ||
					data.senderId ||
					data.memberId ||
					data.sender?._id ||
					data.sender?.id ||
					data.user?.userId ||
					data.user?._id ||
					data.user?.id,
			)
			if (!conversationId || !userId) return

			const me = getMeFromStore()
			const myUserId = normalizeId(me?._id || localStorage.getItem('userId'))
			if (myUserId && userId === myUserId) return

			const name =
				[data.firstname, data.lastname].filter(Boolean).join(' ') ||
				data.fullname ||
				data.name ||
				[data.user?.firstname, data.user?.lastname].filter(Boolean).join(' ') ||
				data.user?.fullname ||
				data.user?.name ||
				[data.sender?.firstname, data.sender?.lastname, data.lastname]
					.filter(Boolean)
					.join(' ') ||
				'Kimdir'

			if (data.isTyping === false) {
				clearTypingTimer(conversationId, userId)
				store.dispatch(
					realtimeActions.userStoppedTyping({ conversationId, userId }),
				)
			} else {
				scheduleTypingCleanup(conversationId, userId)
				store.dispatch(
					realtimeActions.userTyping({ conversationId, userId, name }),
				)
			}
		}

		const onTypingStart = payload => {
			const data = unwrapSocketPayload(payload) || {}
			onTyping({ ...data, isTyping: true })
		}

		const onTypingStop = payload => {
			const data = unwrapSocketPayload(payload) || {}
			onTyping({ ...data, isTyping: false })
		}

		const onMessageRead = payload => {
			const conversationId = normalizeId(
				payload?.conversationId ||
					payload?.conversation?._id ||
					payload?.conversation ||
					payload?.chatId,
			)
			const messageId = normalizeId(
				payload?.messageId ||
					payload?._id ||
					payload?.message?._id ||
					payload?.message?.id,
			)
			const activeConversationId = getActiveConversationId(store.getState())
			const fallbackConversationId = conversationId || activeConversationId

			if (fallbackConversationId && messageId) {
				store.dispatch(
					api.util.updateQueryData(
						'getMessages',
						fallbackConversationId,
						draft => {
							markMessageReadInList(draft, messageId)
						},
					),
				)
			}

			if (fallbackConversationId) {
				refetchMessages(fallbackConversationId)
			}
			refetchChatLists()
		}

		const onConversationRead = payload => {
			const conversationId = normalizeId(
				payload?.conversationId ||
					payload?.conversation?._id ||
					payload?.conversation ||
					payload?.chatId,
			)
			const messageIds = Array.isArray(payload?.messageIds)
				? payload.messageIds.map(normalizeId).filter(Boolean)
				: []
			if (!conversationId) return

			const me = getMeFromStore()
			const myUserId = normalizeId(me?._id || localStorage.getItem('userId'))
			const readerId = normalizeId(
				payload?.readerId || payload?.userId || payload?.readBy,
			)

			store.dispatch(
				api.util.updateQueryData('getMessages', conversationId, draft => {
					if (messageIds.length) {
						markConversationReadByIdsInList(draft, messageIds)
						return
					}
					if (readerId && myUserId && readerId !== myUserId) {
						markOutgoingMessagesReadInList(draft, myUserId)
						return
					}
					markAllMessagesReadInList(draft)
				}),
			)
			refetchMessages(conversationId)
			refetchChatLists()
		}

		socket.on('connect', onConnect)
		socket.on('disconnect', onDisconnect)
		socket.on('message:new', onIncomingMessage)
		socket.on('receive_message', onIncomingMessage)
		socket.on('message:read', onMessageRead)
		socket.on('conversation:read', onConversationRead)
		socket.on('typing', onTyping)
		socket.on('typing:start', onTypingStart)
		socket.on('typing:stop', onTypingStop)
		socket.on('typing_start', onTypingStart)
		socket.on('typing_stop', onTypingStop)
		socket.on('typingStart', onTypingStart)
		socket.on('typingStop', onTypingStop)
	}

	return next => action => {
		const result = next(action)

		if (realtimeActions.realtimeInit.match(action)) {
			ensureSocketAuth()
			bindSocketListeners()
			store.dispatch(
				socket.connected
					? realtimeActions.socketConnected()
					: realtimeActions.socketDisconnected(),
			)
			refetchChatLists(true)
			// If getChats already resolved before init, join those rooms now
			for (const queryArg of CHAT_QUERY_ARGS) {
				const chatsState = api.endpoints.getChats.select(queryArg)(
					store.getState(),
				)
				if (Array.isArray(chatsState?.data)) {
					joinAllRooms(chatsState.data)
				}
			}
			const activeConversationId = getActiveConversationId(store.getState())
			if (activeConversationId) {
				joinConversation(activeConversationId)
			}
		}

		// Every time getChats resolves, join any new conversation rooms
		if (api.endpoints.getChats.matchFulfilled(action)) {
			ensureSocketAuth()
			bindSocketListeners()
			store.dispatch(
				socket.connected
					? realtimeActions.socketConnected()
					: realtimeActions.socketDisconnected(),
			)
			if (Array.isArray(action.payload)) {
				joinAllRooms(action.payload)
			}
		}

		if (realtimeActions.setActiveConversation.match(action)) {
			ensureSocketAuth()
			bindSocketListeners()
			store.dispatch(
				socket.connected
					? realtimeActions.socketConnected()
					: realtimeActions.socketDisconnected(),
			)
			const conversationId = normalizeId(action.payload)
			if (conversationId) {
				joinConversation(conversationId)
			} else {
				leaveConversation()
			}
		}

		if (realtimeActions.clearActiveConversation.match(action)) {
			leaveConversation()
		}

		if (realtimeActions.realtimeShutdown.match(action)) {
			leaveConversation()
			clearAllTypingTimers()
			socket.disconnect()
			store.dispatch(realtimeActions.socketDisconnected())
		}

		if (realtimeActions.sendTyping.match(action)) {
			const { conversationId, isTyping } = action.payload || {}
			const convId = normalizeId(conversationId)
			if (!convId) return result

			ensureSocketAuth()
			bindSocketListeners()

			const me = getMeFromStore()
			const payload = buildPayload(convId, me)

			socket.emit('typing', {
				...payload,
				isTyping: !!isTyping,
			})
			socket.emit(isTyping ? 'typing_start' : 'typing_stop', payload)
		}

		return result
	}
}
