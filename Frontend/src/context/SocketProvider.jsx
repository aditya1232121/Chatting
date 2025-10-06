import React, { createContext, useMemo, useContext, useEffect } from "react";
import io from "socket.io-client";
import { server } from "../constants/config";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { incrementNotification } from "../redux/reducers/chat";

const SocketContext = createContext();
export const getSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const socket = useMemo(
    () =>
      io(server, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
      }),
    []
  );

  useEffect(() => {
    if (user?._id) {
      socket.emit("register", user._id);
      console.log("🔗 Registered socket for user:", user._id);
    }

    socket.on("connect", () => {
      console.log("🟢 Socket connected:", socket.id);
      if (user?._id) socket.emit("register", user._id);
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket disconnected:", reason);
    });

    socket.on("NEW_MESSAGE", (data) => {
      console.log("💬 New message received:", data);
      toast.success("New message received!");
      dispatch(incrementNotification());
    });

    socket.on("REFETCH_CHATS", () => {
      console.log("🔄 Refreshing chats...");
      dispatch(incrementNotification());
    });

    return () => {
      socket.off("NEW_MESSAGE");
      socket.off("REFETCH_CHATS");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [user, socket, dispatch]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
