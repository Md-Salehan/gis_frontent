// src/components/common/notifications/InlineNotification.jsx
import React, { useState } from 'react';
import { Space, Button } from 'antd';
import { getDefaultIcon } from './notification.helper';

export const InlineNotification = ({ 
  type = 'info',
  message,
  description,
  closable = true,
  onClose,
  showIcon = true,
  actions = null,
  style = {},
  className = '',
}) => {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  if (!visible) return null;

  const colors = {
    success: '#f6ffed',
    error: '#fff2f0',
    info: '#e6f7ff',
    warning: '#fffbe6',
    loading: '#e6f7ff',
  };

  const borders = {
    success: '#b7eb8f',
    error: '#ffccc7',
    info: '#91d5ff',
    warning: '#ffe58f',
    loading: '#91d5ff',
  };

  const textColors = {
    success: '#389e0d',
    error: '#cf1322',
    info: '#0958d9',
    warning: '#d46b08',
    loading: '#0958d9',
  };

  return React.createElement(
    'div',
    {
      className: `inline-notification inline-notification-${type} ${className}`,
      style: {
        padding: '12px 16px',
        backgroundColor: colors[type],
        borderLeft: `4px solid ${borders[type]}`,
        borderRadius: '8px',
        marginBottom: '16px',
        position: 'relative',
        ...style,
      },
      role: 'alert',
    },
    closable && React.createElement(
      'button',
      {
        onClick: handleClose,
        style: {
          position: 'absolute',
          right: '12px',
          top: '12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          color: textColors[type],
        },
        'aria-label': 'Close',
      },
      '×'
    ),
    React.createElement(
      Space,
      { align: 'start', style: { width: '100%' } },
      showIcon && React.createElement(
        'span',
        { style: { fontSize: '20px', color: textColors[type] } },
        getDefaultIcon(type)
      ),
      React.createElement(
        'div',
        { style: { flex: 1 } },
        React.createElement(
          'div',
          { 
            style: { 
              fontWeight: 600, 
              marginBottom: description ? '4px' : '0',
              color: textColors[type],
            } 
          },
          message
        ),
        description && React.createElement(
          'div',
          { style: { fontSize: '14px', color: '#666', lineHeight: '1.5' } },
          description
        ),
        actions && React.createElement(
          'div',
          { style: { marginTop: '12px' } },
          actions
        )
      )
    )
  );
};

export default InlineNotification;