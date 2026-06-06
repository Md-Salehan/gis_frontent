// src/components/common/notifications/NotificationProvider.jsx
import React from 'react';
import { notification } from 'antd';
import notificationService from './NotificationService';

export const NotificationProvider = ({ children }) => {
  const [api, contextHolder] = notification.useNotification();
  
  // Store API reference for debugging
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__notificationAPI = api;
    }
    
    // Log to confirm provider is mounted
    console.log("✅ NotificationProvider mounted, contextHolder ready");
  }, [api]);
  
  // Optional: Set global config on mount
  React.useEffect(() => {
    notificationService.setGlobalConfig({
      maxCount: 5,
      duration: 4.5,
    });
  }, []);
  
  // IMPORTANT: Return JSX, not createElement
  return (
    <>
      {contextHolder}
      {children}
    </>
  );
};

export default NotificationProvider;