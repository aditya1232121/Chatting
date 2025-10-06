// Backend/controllers/chat.js
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { User } from "../models/user.js";
import { Message } from "../models/message.js";

/* ---------------------- CREATE NEW GROUP CHAT ---------------------- */
const newGroupChat = TryCatch(async (req, res, next) => {
  const { name, members } = req.body;
  const allMembers = [...members, req.user];

  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    message: "Group Created",
  });
});

/* ---------------------- GET MY CHATS ---------------------- */
const getMyChats = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );

  const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
    const otherMember = getOtherMember(members, req.user);
    const safeAvatar = (m) => m?.avatar?.url || "https://via.placeholder.com/150";

    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map((m) => safeAvatar(m))
        : [safeAvatar(otherMember)],
      name: groupChat ? name : otherMember?.name || "Unknown",
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user.toString()) prev.push(curr._id);
        return prev;
      }, []),
    };
  });

  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

/* ---------------------- GET MY GROUPS ---------------------- */
const getMyGroups = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "name avatar");

  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map((m) => m?.avatar?.url || "https://via.placeholder.com/150"),
  }));

  return res.status(200).json({
    success: true,
    groups,
  });
});

/* ---------------------- ADD MEMBERS ---------------------- */
const addMembers = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("You are not allowed to add members", 403));

  const newMembersDocs = await Promise.all(members.map((id) => User.findById(id, "name")));
  const newMemberIds = newMembersDocs
    .filter((u) => !chat.members.includes(u._id.toString()))
    .map((u) => u._id);

  chat.members.push(...newMemberIds);
  if (chat.members.length > 100)
    return next(new ErrorHandler("Group members limit reached (100)", 400));
  await chat.save();

  const newNames = newMembersDocs.map((u) => u.name).join(", ");
  emitEvent(req, ALERT, chat.members, `${newNames} added to ${chat.name}`);
  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({ success: true, message: "Members added successfully" });
});

/* ---------------------- REMOVE MEMBER ---------------------- */
const removeMember = TryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;
  const [chat, userToRemove] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("You are not allowed to remove members", 403));

  chat.members = chat.members.filter((m) => m.toString() !== userId.toString());
  await chat.save();

  emitEvent(req, ALERT, chat.members, {
    chatId,
    message: `${userToRemove.name} has been removed from ${chat.name}`,
  });
  emitEvent(req, REFETCH_CHATS, chat.members);

  res.status(200).json({ success: true, message: "Member removed successfully" });
});

/* ---------------------- LEAVE GROUP ---------------------- */
const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  const remainingMembers = chat.members.filter(
    (m) => m.toString() !== req.user.toString()
  );

  if (remainingMembers.length < 3)
    return next(new ErrorHandler("Group must have at least 3 members", 400));

  if (chat.creator.toString() === req.user.toString()) {
    const newCreator =
      remainingMembers[Math.floor(Math.random() * remainingMembers.length)];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;
  const [user] = await Promise.all([User.findById(req.user, "name"), chat.save()]);

  emitEvent(req, ALERT, chat.members, {
    chatId,
    message: `${user.name} has left the group`,
  });

  res.status(200).json({ success: true, message: "Left group successfully" });
});

/* ---------------------- SEND ATTACHMENTS ---------------------- */
const sendAttachments = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;
  const files = req.files || [];

  if (files.length < 1)
    return next(new ErrorHandler("Please upload at least one file", 400));
  if (files.length > 5)
    return next(new ErrorHandler("Files can't be more than 5", 400));

  const [chat, sender] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name avatar"),
  ]);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const attachments = await uploadFilesToCloudinary(files);
  const messageForDB = {
    content: "",
    attachments,
    sender: sender._id,
    chat: chatId,
  };

  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar?.url || "https://via.placeholder.com/150",
    },
    createdAt: new Date(),
  };

  const message = await Message.create(messageForDB);

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  res.status(200).json({ success: true, message: messageForRealTime });
});

/* ---------------------- SEND TEXT MESSAGE ---------------------- */
const sendTextMessage = TryCatch(async (req, res, next) => {
  const { chatId, content } = req.body;

  if (!content?.trim()) return next(new ErrorHandler("Message cannot be empty", 400));

  const [chat, sender] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name avatar"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const messageForDB = {
    content,
    sender: sender._id,
    chat: chatId,
  };

  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar?.url || "https://via.placeholder.com/150",
    },
    createdAt: new Date(),
  };

  const message = await Message.create(messageForDB);

  emitEvent(req, NEW_MESSAGE, chat.members, { message: messageForRealTime, chatId });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  res.status(200).json({
    success: true,
    message: messageForRealTime,
  });
});

/* ---------------------- GET CHAT DETAILS ---------------------- */
const getChatDetails = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const populate = req.query.populate === "true";

  const chatQuery = populate
    ? Chat.findById(chatId).populate("members", "name avatar").lean()
    : Chat.findById(chatId);

  const chat = await chatQuery;
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (populate) {
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar?.url || "https://via.placeholder.com/150",
    }));
  }

  res.status(200).json({ success: true, chat });
});

/* ---------------------- RENAME GROUP ---------------------- */
const renameGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("Only creator can rename group", 403));

  chat.name = name;
  await chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);
  res.status(200).json({ success: true, message: "Group renamed successfully" });
});

/* ---------------------- DELETE CHAT ---------------------- */
const deleteChat = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const members = chat.members;
  if (chat.groupChat && chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("Only creator can delete group", 403));

  const messages = await Message.find({
    chat: chatId,
    "attachments.0": { $exists: true },
  });

  const publicIds = messages.flatMap((msg) => msg.attachments.map((a) => a.public_id));

  await Promise.all([
    deleteFilesFromCloudinary(publicIds),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);
  res.status(200).json({ success: true, message: "Chat deleted successfully" });
});

/* ---------------------- GET MESSAGES ---------------------- */
const getMessages = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const limit = 20;
  const skip = (page - 1) * limit;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.members.includes(req.user.toString()))
    return next(new ErrorHandler("Not authorized for this chat", 403));

  const [messages, total] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name avatar")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const safeMessages = messages.map((msg) => ({
    ...msg,
    sender: {
      _id: msg.sender?._id || "unknown",
      name: msg.sender?.name || "Unknown",
      avatar: msg.sender?.avatar?.url || "https://via.placeholder.com/150",
    },
  }));

  res.status(200).json({
    success: true,
    messages: safeMessages.reverse(),
    totalPages: Math.ceil(total / limit) || 0,
  });
});

/* ---------------------- EXPORT ALL ---------------------- */
export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendAttachments,
  sendTextMessage,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
};
