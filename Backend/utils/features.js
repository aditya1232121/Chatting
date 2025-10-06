// Backend/utils/features.js
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { getBase64, getSockets } from "../lib/helper.js";

// ✅ Cookie options
const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
  sameSite: "lax", // for localhost
  httpOnly: true,
  secure: false, // false for localhost, true in production
};

// ✅ Connect MongoDB
const connectDB = (uri) => {
  mongoose
    .connect(uri, { dbName: "Chattu" })
    .then((data) => console.log(`✅ Connected to DB: ${data.connection.host}`))
    .catch((err) => console.error("❌ MongoDB Error:", err));
};

// ✅ Send cookie + JWT token
const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });

  return res
    .status(code)
    .cookie("chattu-token", token, cookieOptions)
    .json({
      success: true,
      user,
      message,
    });
};

// ✅ Emit event via Socket.IO
const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const sockets = getSockets(users || []);
  if (!sockets.length) return;
  sockets.forEach((s) => io.to(s).emit(event, data));
};

// ✅ Upload files to Cloudinary
const uploadFilesToCloudinary = async (files = []) => {
  try {
    const uploads = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const fileData = getBase64(file);
          cloudinary.uploader.upload(
            fileData,
            {
              resource_type: "auto",
              public_id: uuid(),
              folder: "ChattuApp",
            },
            (error, result) => {
              if (error) {
                console.error("❌ Cloudinary Upload Error:", error.message);
                reject(error);
              } else {
                resolve({
                  public_id: result.public_id,
                  url: result.secure_url,
                });
              }
            }
          );
        })
    );
    return await Promise.all(uploads);
  } catch (err) {
    console.error("❌ Cloudinary Upload Failure:", err.message);
    throw new Error("Error uploading files to Cloudinary");
  }
};

// ✅ Delete files from Cloudinary
const deleteFilesFromCloudinary = async (public_ids = []) => {
  try {
    if (!public_ids.length) return;
    const chunkSize = 100;
    for (let i = 0; i < public_ids.length; i += chunkSize) {
      const chunk = public_ids.slice(i, i + chunkSize);
      await cloudinary.api.delete_resources(chunk);
    }
    console.log(`🗑️ Deleted ${public_ids.length} files from Cloudinary`);
  } catch (err) {
    console.error("❌ Error deleting files:", err.message);
    throw new Error("Error deleting files from Cloudinary");
  }
};

export {
  connectDB,
  sendToken,
  cookieOptions,
  emitEvent,
  uploadFilesToCloudinary,
  deleteFilesFromCloudinary, // ✅ Added back
};
