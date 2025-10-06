import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { CssBaseline } from "@mui/material";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";
import store from "./redux/store.js";

// ✅ Import the new SocketProvider
import { SocketProvider } from "./context/SocketProvider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <SocketProvider> {/* 👈 Wrap your app with SocketProvider */}
        <HelmetProvider>
          <CssBaseline />
          <div onContextMenu={(e) => e.preventDefault()}>
            <App />
          </div>
        </HelmetProvider>
      </SocketProvider>
    </Provider>
  </React.StrictMode>
);
