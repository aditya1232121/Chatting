// Backend/app.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";

import { NEW_MESSAGE, START_TYPING, STOP_TYPING, ALERT } from "./constants/events.js";
import { userSocketIDs } from "./lib/activeSockets.js";
import { connectDB } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";
import { envMode } from "./config/constants.js";

import userRoute from "./routes/user.js";
import chatRoute from "./routes/chat.js";

dotenv.config();

// ✅ Connect MongoDB
connectDB(process.env.MONGO_URI);

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log("✅ Cloudinary connected:", process.env.CLOUDINARY_CLOUD_NAME);

const app = express();

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173"], // frontend URL
    credentials: true, // allow cookies
  })
);

// ✅ API Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);

// ✅ Error Middleware
app.use(errorMiddleware);

// ✅ HTTP + WebSocket Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);

// ✅ SOCKET.IO LOGIC
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("register", (userId) => {
    if (!userId) return;
    userSocketIDs.set(userId.toString(), socket.id);
    console.log(`🟢 Registered user ${userId} → socket ${socket.id}`);
  });

  socket.on(NEW_MESSAGE, ({ chatId, members, message }) => {
    console.log("💬 NEW_MESSAGE:", chatId, message?.content);

    members?.forEach((userId) => {
      const sid = userSocketIDs.get(userId.toString());
      if (sid) {
        io.to(sid).emit(NEW_MESSAGE, { chatId, message });
      } else {
        console.warn(`⚠️ No socket found for user ${userId}`);
      }
    });
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    members?.forEach((userId) => {
      const sid = userSocketIDs.get(userId.toString());
      if (sid) io.to(sid).emit(START_TYPING, { chatId });
    });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    members?.forEach((userId) => {
      const sid = userSocketIDs.get(userId.toString());
      if (sid) io.to(sid).emit(STOP_TYPING, { chatId });
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);
    for (const [userId, sid] of userSocketIDs.entries()) {
      if (sid === socket.id) {
        userSocketIDs.delete(userId);
        console.log(`🗑️ Removed user ${userId}`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server running in ${envMode.toUpperCase()} mode on port ${PORT}`)
);
