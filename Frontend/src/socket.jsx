import { createContext, useMemo, useContext, useEffect } from "react";
import io from "socket.io-client";
import { server } from "./constants/config";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";

// ✅ import from your real reducers (not slices)
import { incrementNotification } from "./redux/reducers/chat";
import { userExists } from "./redux/reducers/auth"; // optional if you want to refresh user state

const SocketContext = createContext();

export const getSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // ✅ Initialize socket connection once
  const socket = useMemo(() => io(server, { withCredentials: true }), []);

  useEffect(() => {
    if (user?._id) {
      // ✅ Register user with backend
      socket.emit("register", user._id);
      console.log("🔗 Registered socket for user:", user._id);
    }

    // ✅ Friend Request Event
    socket.on("NEW_REQUEST", (data) => {
      console.log("📩 New Friend Request Received:", data);
      toast.info(data?.message || "You received a new friend request!");
      // You can trigger a Redux refresh or API call here
    });

    // ✅ Chat Updates Event (when someone accepts or sends a message)
    socket.on("REFETCH_CHATS", () => {
      console.log("🔄 Chats need to be updated...");
      dispatch(incrementNotification()); // just an example; update your badge count
    });

    // ✅ Optional: New message notification event
    socket.on("NEW_MESSAGE_ALERT", (data) => {
      console.log("💬 New Message Alert:", data);
      dispatch(incrementNotification());
      toast.success("New message received!");
    });

    // Cleanup listeners on unmount or user logout
    return () => {
      socket.off("NEW_REQUEST");
      socket.off("REFETCH_CHATS");
      socket.off("NEW_MESSAGE_ALERT");
    };
  }, [user, socket, dispatch]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
