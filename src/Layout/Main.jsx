import React from "react";
import { Outlet } from "react-router-dom";
import { MessageProvider } from "../context";

function Main() {
  
  return (
    <MessageProvider>

      {<Outlet />}
    </MessageProvider>
  );
}

export default Main;
