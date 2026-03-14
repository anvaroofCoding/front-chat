import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Define a service using a base URL and expected endpoints
export const api = createApi({
	reducerPath: 'api',
	tagTypes: ['Messages'],
	baseQuery: fetchBaseQuery({
		baseUrl: 'http://88.88.150.150:5000/api',
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
			query: () => '/users',
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
		}),
		getMessages: builder.query({
			query: id => `/messages/${id}`,
			transformResponse: response => {
				if (Array.isArray(response)) return response
				if (Array.isArray(response?.messages)) return response.messages
				if (Array.isArray(response?.data)) return response.data
				return []
			},
			providesTags: (r, e, id) => [
				{ type: 'Messages', id },
				{ type: 'Messages', id: 'LIST' },
			],
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
		markMessageRead: builder.mutation({
			query: messageId => ({
				url: `/messages/${messageId}/read`,
				method: 'PUT',
			}),
		}),
		markConversationRead: builder.mutation({
			query: conversationId => ({
				url: `/messages/conversations/${conversationId}/read`,
				method: 'PUT',
			}),
		}),
		createChat: builder.mutation({
			query: chatData => ({
				url: '/chats',
				method: 'POST',
				body: chatData,
			}),
		}),
	}),
})

// Export hooks for usage in functional components
export const {
	useGetMeQuery,
	useLoginMutation,
	useRegisterMutation,
	useLogoutMutation,
	useGetUsersQuery,
	useGetUserQuery,
	useGetMessagesQuery,
	useSendMessageMutation,
	useMarkMessageReadMutation,
	useMarkConversationReadMutation,
	useGetChatsQuery,
	useCreateChatMutation,
} = api
