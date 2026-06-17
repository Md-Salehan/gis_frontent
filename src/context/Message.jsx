import { message } from "antd";
import { createContext, useState, useContext, useCallback } from "react";
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  InfoCircleOutlined, 
  WarningOutlined,
  LoadingOutlined
} from '@ant-design/icons';

export const MessageContext = createContext();


export function MessageProvider({ children }) {
  const [messageApi, contextHolder] = message.useMessage();

  // Success message
  const success = useCallback((content, duration = 3, onClose = null) => {
    messageApi.open({
      type: 'success',
      content,
      duration,
      icon: <CheckCircleOutlined />,
      onClose
    });
  }, [messageApi]);

  // Error message
  const error = useCallback((content, duration = 5, onClose = null) => {
    messageApi.open({
      type: 'error',
      content,
      duration,
      icon: <CloseCircleOutlined />,
      onClose
    });
  }, [messageApi]);

  // Warning message
  const warning = useCallback((content, duration = 4, onClose = null) => {
    messageApi.open({
      type: 'warning',
      content,
      duration,
      icon: <WarningOutlined />,
      onClose
    });
  }, [messageApi]);

  // Info message
  const info = useCallback((content, duration = 3, onClose = null) => {
    messageApi.open({
      type: 'info',
      content,
      duration,
      icon: <InfoCircleOutlined />,
      onClose
    });
  }, [messageApi]);

  // Loading message (returns hide function)
  const loading = useCallback((content = 'Loading...', duration = 0) => {
    return messageApi.open({
      type: 'loading',
      content,
      duration,
      icon: <LoadingOutlined />
    });
  }, [messageApi]);

  // Custom message
  const custom = useCallback((config) => {
    const { content, duration = 3, icon, type = 'info', onClose } = config;
    messageApi.open({
      type,
      content,
      duration,
      icon,
      onClose
    });
  }, [messageApi]);

  // Destroy all messages
  const destroy = useCallback(() => {
    messageApi.destroy();
  }, [messageApi]);

  const value = {
    success,
    error,
    warning,
    info,
    loading,
    custom,
    destroy,
    rawApi: messageApi
  };

  

  return (
    <MessageContext.Provider value={{  ...value }}>
      {contextHolder}
      {children}
    </MessageContext.Provider>
  );
}
