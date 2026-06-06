import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { persistor, store } from "./store/index.js";
import { PersistGate } from "redux-persist/integration/react";
import NotificationProvider from "./components/common/notifications/NotificationProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NotificationProvider>
          <BrowserRouter basename="/gis">
            <App />
          </BrowserRouter>
        </NotificationProvider>
      </PersistGate>
    </Provider>
  </StrictMode>,
);
