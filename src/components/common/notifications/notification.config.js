// src/components/common/notifications/notification.config.js

export const NOTIFICATION_CONFIG = {
  default: {
    duration: 4.5,
    placement: 'topRight',
    pauseOnHover: true,
    maxCount: 3,
  },
  success: {
    duration: 3,
    placement: 'topRight',
  },
  error: {
    duration: 5,
    placement: 'topRight',
  },
  warning: {
    duration: 4.5,
    placement: 'topRight',
  },
  info: {
    duration: 4,
    placement: 'topRight',
  },
  loading: {
    duration: 0,
    placement: 'topRight',
  },
};

// Environment-specific overrides
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV;
  
  if (env === 'development') {
    return {
      duration: 2, // Shorter for development
    };
  }
  
  if (env === 'production') {
    return {
      duration: 4.5,
    };
  }
  
  return {};
};

// Global config state
let globalConfig = { ...NOTIFICATION_CONFIG.default };

export const setGlobalConfig = (config) => {
  globalConfig = { ...globalConfig, ...config };
};

export const getGlobalConfig = () => globalConfig;