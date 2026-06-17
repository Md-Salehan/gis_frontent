// Notification.jsx
import { notification } from "antd";
import { createContext, useContext, useCallback } from "react";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  LoadingOutlined
} from '@ant-design/icons';

export const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notificationApi, contextHolder] = notification.useNotification();

  // Success notification
  const success = useCallback((config) => {
    const { message, description, duration = 4.5, placement = 'topRight', onClose } = config;
    notificationApi.success({
      message,
      description,
      duration,
      placement,
      icon: <CheckCircleOutlined />,
      onClose
    });
  }, [notificationApi]);

  // Error notification
  const error = useCallback((config) => {
    const { message, description, duration = 4.5, placement = 'topRight', onClose } = config;
    notificationApi.error({
      message,
      description,
      duration,
      placement,
      icon: <CloseCircleOutlined />,
      onClose
    });
  }, [notificationApi]);

  // Warning notification
  const warning = useCallback((config) => {
    const { message, description, duration = 4.5, placement = 'topRight', onClose } = config;
    notificationApi.warning({
      message,
      description,
      duration,
      placement,
      icon: <WarningOutlined />,
      onClose
    });
  }, [notificationApi]);

  // Info notification
  const info = useCallback((config) => {
    const { message, description, duration = 4.5, placement = 'topRight', onClose } = config;
    notificationApi.info({
      message,
      description,
      duration,
      placement,
      icon: <InfoCircleOutlined />,
      onClose
    });
  }, [notificationApi]);

  // Open notification (generic)
  const open = useCallback((config) => {
    const { 
      message, 
      description, 
      duration = 4.5, 
      placement = 'topRight', 
      icon, 
      type = 'info',
      onClose,
      btn,
      key,
      style,
      className,
      onClick,
      pauseOnHover = true
    } = config;
    
    notificationApi.open({
      message,
      description,
      duration,
      placement,
      icon,
      type,
      onClose,
      btn,
      key,
      style,
      className,
      onClick,
      pauseOnHover
    });
  }, [notificationApi]);

  // Loading notification
  const loading = useCallback((config) => {
    const { message, description, duration = 0, placement = 'topRight' } = config;
    return notificationApi.open({
      message,
      description,
      duration,
      placement,
      icon: <LoadingOutlined />,
      type: 'info'
    });
  }, [notificationApi]);

  // Destroy notification
  const destroy = useCallback((key) => {
    if (key) {
      notificationApi.destroy(key);
    } else {
      notificationApi.destroy();
    }
  }, [notificationApi]);

  // Warning notification (alias for compatibility)
  const warn = useCallback((config) => {
    return warning(config);
  }, [warning]);

  const value = {
    success,
    error,
    warning,
    warn,
    info,
    open,
    loading,
    destroy,
    rawApi: notificationApi
  };

  return (
    <NotificationContext.Provider value={value}>
      {contextHolder}
      {children}
    </NotificationContext.Provider>
  );
}