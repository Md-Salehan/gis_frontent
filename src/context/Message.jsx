import { message } from "antd";
import { createContext, useState } from "react";

export const MessageContext = createContext();

export function MessageProvider({ children }) {
  const [messageApi, contextHolder] = message.useMessage();

  

  return (
    <MessageContext.Provider value={{  messageApi }}>
      {contextHolder}
      {children}
    </MessageContext.Provider>
  );
}
