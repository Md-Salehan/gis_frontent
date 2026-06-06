// src/components/common/notifications/notification.helper.js
import React from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  BellOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

// Get icon based on notification type
export const getDefaultIcon = (type) => {
  const icons = {
    success: React.createElement(CheckCircleOutlined, { style: { color: '#52c41a' } }),
    error: React.createElement(CloseCircleOutlined, { style: { color: '#ff4d4f' } }),
    info: React.createElement(InfoCircleOutlined, { style: { color: '#1890ff' } }),
    warning: React.createElement(WarningOutlined, { style: { color: '#faad14' } }),
    loading: React.createElement(LoadingOutlined, { style: { color: '#1677ff' } }),
  };
  return icons[type] || React.createElement(BellOutlined);
};

// Format message with variables
export const formatMessage = (message, params = {}) => {
  if (typeof message !== 'string') return message;
  return message.replace(/\{(\w+)\}/g, (match, key) => params[key] || match);
};

// Validate notification config
export const validateConfig = (config) => {
  const errors = [];
  
  if (!config.message) {
    errors.push('Message is required');
  }
  
  if (config.duration !== undefined && (config.duration < 0 || config.duration > 60)) {
    errors.push('Duration must be between 0 and 60 seconds');
  }
  
  const validPlacements = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
  if (config.placement && !validPlacements.includes(config.placement)) {
    errors.push(`Placement must be one of: ${validPlacements.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Generate unique key
export const generateKey = () => {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};