// src/components/common/notifications/NotificationService.js
import { notification } from 'antd';
import { getGlobalConfig, NOTIFICATION_CONFIG } from './notification.config';
import { getDefaultIcon, validateConfig, generateKey } from './notification.helper';

class NotificationService {
  static instance = null;

  constructor() {
    this.config = getGlobalConfig();
    this.loadingKeys = new Map();
  }

  static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Update global config
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  // Core show method
  show(userConfig, type = null) {
    // Merge with defaults
    const typeConfig = type ? NOTIFICATION_CONFIG[type] || {} : {};
    const finalConfig = {
      ...NOTIFICATION_CONFIG.default,
      ...this.config,
      ...typeConfig,
      ...userConfig,
    };

    // Validate config
    const validation = validateConfig(finalConfig);
    if (!validation.isValid) {
      console.error('Invalid notification config:', validation.errors);
      return null;
    }

    const {
      message,
      description,
      duration,
      placement,
      icon,
      btn,
      key = generateKey(),
      onClose,
      pauseOnHover,
      style,
      className,
      role = 'status',
    } = finalConfig;

    const notificationIcon = icon || (type ? getDefaultIcon(type) : null);

    notification.open({
      message,
      description,
      duration,
      placement,
      icon: notificationIcon,
      btn,
      key,
      onClose,
      pauseOnHover,
      style,
      className,
      role,
    });

    return key;
  }

  // Success notification
  success(config) {
    return this.show(config, 'success');
  }

  // Error notification
  error(config) {
    return this.show(config, 'error');
  }

  // Info notification
  info(config) {
    return this.show(config, 'info');
  }

  // Warning notification
  warning(config) {
    return this.show(config, 'warning');
  }

  // Loading notification
  loading(config) {
    const key = generateKey();
    const loadingConfig = {
      ...config,
      duration: 0,
      key,
    };
    this.show(loadingConfig, 'loading');
    this.loadingKeys.set(key, { config, timestamp: Date.now() });
    return key;
  }

  // Update loading to result
  updateLoading(key, config, type) {
    if (this.loadingKeys.has(key)) {
      this.destroy(key);
      this.loadingKeys.delete(key);
      return this[type](config);
    }
    return null;
  }

  // Custom notification
  custom(config) {
    return this.show(config);
  }

  // Destroy specific notification
  destroy(key) {
    if (key) {
      notification.destroy(key);
      this.loadingKeys.delete(key);
    }
  }

  // Clear all notifications
  clearAll() {
    notification.destroy();
    this.loadingKeys.clear();
  }

  // Set global Ant Design config
  setGlobalConfig(config) {
    notification.config(config);
    this.updateConfig(config);
  }
}

// Export singleton instance
const notificationService = NotificationService.getInstance();
export default notificationService;