// Frontend/src/redux/api/api.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { server } from "../../constants/config";

const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: `${server}/api/v1/`,
    credentials: "include", // ✅ always include cookies
  }),
  tagTypes: ["Chat", "User", "Message"],

  endpoints: (builder) => ({
    // 🧑‍💻 AUTH & USER
    register: builder.mutation({
      query: (formData) => ({
        url: "user/new",
        method: "POST",
        body: formData,
      }),
    }),

    login: builder.mutation({
      query: (data) => ({
        url: "user/login",
        method: "POST",
        body: data,
      }),
    }),

    myProfile: builder.query({
      query: () => "user/me",
      providesTags: ["User"],
    }),

    logout: builder.query({
      query: () => "user/logout",
      providesTags: ["User"],
    }),

    searchUser: builder.query({
      query: (name) => `user/search?name=${name}`,
      providesTags: ["User"],
    }),

    sendFriendRequest: builder.mutation({
      query: (data) => ({
        url: "user/sendrequest",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    acceptFriendRequest: builder.mutation({
      query: (data) => ({
        url: "user/acceptrequest",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Chat"],
    }),

    getNotifications: builder.query({
      query: () => "user/notifications",
      providesTags: ["User"],
    }),

    getMyFriends: builder.query({
      query: () => "user/friends",
      providesTags: ["User"],
    }),

    // 💬 CHATS
    myChats: builder.query({
      query: () => "chat/my",
      providesTags: ["Chat"],
    }),

    myGroups: builder.query({
      query: () => "chat/my/groups",
      providesTags: ["Chat"],
    }),

    chatDetails: builder.query({
      query: ({ chatId, populate = false }) => {
        let url = `chat/${chatId}`;
        if (populate) url += "?populate=true";
        return { url };
      },
      providesTags: ["Chat"],
    }),

    newGroup: builder.mutation({
      query: ({ name, members }) => ({
        url: "chat/new",
        method: "POST",
        body: { name, members },
      }),
      invalidatesTags: ["Chat"],
    }),

    addGroupMembers: builder.mutation({
      query: ({ chatId, members }) => ({
        url: "chat/addmembers",
        method: "PUT",
        body: { chatId, members },
      }),
      invalidatesTags: ["Chat"],
    }),

    removeGroupMember: builder.mutation({
      query: ({ chatId, userId }) => ({
        url: "chat/removemember",
        method: "PUT",
        body: { chatId, userId },
      }),
      invalidatesTags: ["Chat"],
    }),

    deleteChat: builder.mutation({
      query: (chatId) => ({
        url: `chat/${chatId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Chat"],
    }),

    leaveGroup: builder.mutation({
      query: (chatId) => ({
        url: `chat/leave/${chatId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Chat"],
    }),

    availableFriends: builder.query({
      query: (chatId) => {
        let url = `user/friends`;
        if (chatId) url += `?chatId=${chatId}`;
        return { url };
      },
      providesTags: ["Chat"],
    }),

    // 📨 MESSAGES
    getMessages: builder.query({
      query: ({ chatId, page }) => `chat/message/${chatId}?page=${page}`,
      providesTags: ["Message"],
    }),

    sendAttachments: builder.mutation({
      query: (data) => ({
        url: "chat/message",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Message"],
    }),
  }),
});

export default api;

// ✅ Export all hooks
export const {
  // Auth & User
  useRegisterMutation,
  useLoginMutation,
  useMyProfileQuery,
  useLogoutQuery,
  useSearchUserQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useGetNotificationsQuery,
  useGetMyFriendsQuery,

  // Chat
  useMyChatsQuery,
  useMyGroupsQuery,
  useChatDetailsQuery,
  useNewGroupMutation,
  useAddGroupMembersMutation,
  useRemoveGroupMemberMutation,
  useDeleteChatMutation,
  useLeaveGroupMutation,
  useAvailableFriendsQuery,

  // Messages
  useGetMessagesQuery,
  useSendAttachmentsMutation, // ✅ now exists again
} = api;
