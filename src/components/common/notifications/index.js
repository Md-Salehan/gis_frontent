// src/components/common/notifications/index.js
// Main entry point - exports everything

// Provider (REQUIRED)
export { default as NotificationProvider } from './NotificationProvider';

// Hook (RECOMMENDED)
export { default as useNotification } from './useNotification';

// Components
export { default as InlineNotification } from './InlineNotification';

// Service (for advanced use cases)
export { default as notificationService } from './NotificationService';

// Config utilities
export { setGlobalConfig, getGlobalConfig, NOTIFICATION_CONFIG } from './notification.config';

// Helpers
export { formatMessage, generateKey } from './notification.helper';