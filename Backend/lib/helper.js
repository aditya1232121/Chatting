// Backend/lib/helper.js
import { userSocketIDs } from "./activeSockets.js";

/**
 * Get the other member (for 1:1 chat)
 * members: array of user docs or ids
 * userId: string or ObjectId
 */
export const getOtherMember = (members, userId) =>
  members.find((member) => {
    const id = member?._id ? member._id.toString() : member.toString();
    return id !== userId.toString();
  });

/**
 * Given an array of user ids (strings or ObjectIds), return corresponding socket ids
 */
export const getSockets = (users = []) => {
  const sockets = users
    .map((user) => {
      if (!user) return null;
      const id = user.toString();
      return userSocketIDs.get(id) || null;
    })
    .filter(Boolean);
  return sockets;
};

/**
 * Convert uploaded file.buffer to base64 dataUri for Cloudinary
 */
export const getBase64 = (file) => {
  if (!file || !file.buffer) throw new Error("Invalid file buffer");
  const mimeType = file.mimetype || "application/octet-stream";
  return `data:${mimeType};base64,${file.buffer.toString("base64")}`;
};
