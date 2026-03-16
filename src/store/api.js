import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Define a service using a base URL and expected endpoints
export const api = createApi({
	reducerPath: 'api',
	tagTypes: ['Messages', 'Chats'],
	baseQuery: fetchBaseQuery({
		baseUrl:
			import.meta.env.VITE_API_URL || 'https://back-chat-97sy.onrender.com/api',
		prepareHeaders: headers => {
			const token = localStorage.getItem('token')
			if (token) {
				headers.set('Authorization', `Bearer ${token}`)
			}
			return headers
		},
	}), // Adjust base URL as needed
	endpoints: builder => ({
		// Auth endpoints
		login: builder.mutation({
			query: credentials => ({
				url: '/auth/login',
				method: 'POST',
				body: credentials,
			}),
		}),
		register: builder.mutation({
			query: userData => ({
				url: '/auth/register',
				method: 'POST',
				body: userData,
			}),
		}),
		logout: builder.mutation({
			query: () => ({
				url: '/auth/logout',
				method: 'POST',
			}),
		}),
		getMe: builder.query({
			query: () => '/users/profile',
		}),
		// User endpoints
		getUsers: builder.query({
			query: (search = '') => `/users?search=${search}`,
		}),
		getUser: builder.query({
			query: id => `/users/${id}`,
		}),

		// Chat endpoints
		getChats: builder.query({
			// type: 'all' | 'private' | 'group'
			query: (type = 'all') => `/conversations?type=${type}`,
			// Tab almashganda eski data ko'rinib tursin, yangi kelguncha
			keepUnusedDataFor: 60,
			providesTags: (result, error, type = 'all') => {
				const baseTags = [
					{ type: 'Chats', id: 'LIST' },
					{ type: 'Chats', id: `LIST-${type}` },
				]
				if (!Array.isArray(result)) return baseTags
				return [
					...baseTags,
					...result
						.map(chat => chat?._id)
						.filter(Boolean)
						.map(id => ({ type: 'Chats', id })),
				]
			},
		}),
		getMessages: builder.query({
			query: id => `/messages/${id}`,
			transformResponse: response => {
				if (Array.isArray(response)) return response
				if (Array.isArray(response?.messages)) return response.messages
				if (Array.isArray(response?.data)) return response.data
				return []
			},
			providesTags: (result, error, id) => [
				{ type: 'Messages', id },
				{ type: 'Messages', id: 'LIST' },
			],
		}),
		getConversations: builder.query({
			query: id => `/conversations/${id}`,
		}),
		sendMessage: builder.mutation({
			// FormData to'g'ridan-to'g'ri body ga beriladi
			// Content-Type headerini o'rnatmang — browser o'zi boundary bilan qo'yadi
			query: formData => ({
				url: '/messages',
				method: 'POST',
				body: formData,
			}),
			// Yuborilgandan keyin shu conversation xabarlarini qayta fetch qiladi
			invalidatesTags: (result, error, arg) => {
				const conversationId =
					arg?.get?.('conversationId') || arg?.get?.('chatId') || result?._id

				return conversationId
					? [
							{ type: 'Messages', id: conversationId },
							{ type: 'Messages', id: 'LIST' },
						]
					: [{ type: 'Messages', id: 'LIST' }]
			},
		}),
		updateMessage: builder.mutation({
			query: ({ messageId, ...body }) => ({
				url: `/messages/${messageId}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: (result, error, arg) => {
				const conversationId =
					arg?.conversationId ||
					result?.conversationId ||
					result?.conversation?._id

				return conversationId
					? [
							{ type: 'Messages', id: conversationId },
							{ type: 'Messages', id: 'LIST' },
						]
					: [{ type: 'Messages', id: 'LIST' }]
			},
		}),
		deleteMessage: builder.mutation({
			query: ({ messageId }) => ({
				url: `/messages/${messageId}`,
				method: 'DELETE',
			}),
			invalidatesTags: (result, error, arg) => {
				const conversationId = arg?.conversationId || result?.conversationId
				return conversationId
					? [
							{ type: 'Messages', id: conversationId },
							{ type: 'Messages', id: 'LIST' },
						]
					: [{ type: 'Messages', id: 'LIST' }]
			},
		}),
		markMessageRead: builder.mutation({
			query: messageId => ({
				url: `/messages/${messageId}/read`,
				method: 'PUT',
			}),
			invalidatesTags: [{ type: 'Messages', id: 'LIST' }],
		}),
		markConversationRead: builder.mutation({
			query: conversationId => ({
				url: `/messages/conversations/${conversationId}/read`,
				method: 'PUT',
			}),
			invalidatesTags: (result, error, conversationId) => {
				const id = conversationId || result?.conversationId
				const tags = [
					{ type: 'Chats', id: 'LIST' },
					{ type: 'Chats', id: 'LIST-all' },
					{ type: 'Chats', id: 'LIST-private' },
					{ type: 'Chats', id: 'LIST-group' },
					{ type: 'Messages', id: 'LIST' },
				]
				if (id) tags.push({ type: 'Messages', id })
				return tags
			},
		}),
		createChat: builder.mutation({
			query: chatData => ({
				url: '/chats',
				method: 'POST',
				body: chatData,
			}),
			invalidatesTags: [
				{ type: 'Chats', id: 'LIST' },
				{ type: 'Chats', id: 'LIST-all' },
				{ type: 'Chats', id: 'LIST-private' },
			],
		}),
		createGroup: builder.mutation({
			query: chatData => ({
				url: '/groups',
				method: 'POST',
				body: chatData,
			}),
			invalidatesTags: [
				{ type: 'Chats', id: 'LIST' },
				{ type: 'Chats', id: 'LIST-all' },
				{ type: 'Chats', id: 'LIST-group' },
			],
		}),
		addMembers: builder.mutation({
			query: ({ chatData, id }) => ({
				url: `/groups/${id}/members`,
				method: 'POST',
				body: chatData,
			}),
			invalidatesTags: [
				{ type: 'Chats', id: 'LIST' },
				{ type: 'Chats', id: 'LIST-all' },
				{ type: 'Chats', id: 'LIST-group' },
			],
		}),
	}),
})

// Export hooks for usage in functional components
export const {
	useAddMembersMutation,
	useCreateGroupMutation,
	useGetConversationsQuery,
	useGetMeQuery,
	useLoginMutation,
	useRegisterMutation,
	useLogoutMutation,
	useGetUsersQuery,
	useGetUserQuery,
	useGetMessagesQuery,
	useSendMessageMutation,
	useUpdateMessageMutation,
	useDeleteMessageMutation,
	useMarkMessageReadMutation,
	useMarkConversationReadMutation,
	useGetChatsQuery,
	useCreateChatMutation,
} = api
