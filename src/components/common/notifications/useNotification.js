// src/components/common/notifications/useNotification.js
import { useCallback, useRef } from 'react';
import notificationService from './NotificationService';

export const useNotification = () => {
  const service = notificationService;
  const loadingRefs = useRef(new Map());

  const success = useCallback((config) => {
    return service.success(config);
  }, []);

  const error = useCallback((config) => {
    return service.error(config);
  }, []);

  const info = useCallback((config) => {
    return service.info(config);
  }, []);

  const warning = useCallback((config) => {
    return service.warning(config);
  }, []);

  const loading = useCallback((config) => {
    const key = service.loading(config);
    loadingRefs.current.set(key, true);
    return key;
  }, []);

  const updateLoading = useCallback((key, config, type) => {
    if (loadingRefs.current.has(key)) {
      const result = service.updateLoading(key, config, type);
      loadingRefs.current.delete(key);
      return result;
    }
    return null;
  }, []);

  const custom = useCallback((config) => {
    return service.custom(config);
  }, []);

  const destroy = useCallback((key) => {
    if (key) {
      service.destroy(key);
      loadingRefs.current.delete(key);
    }
  }, []);

  const clearAll = useCallback(() => {
    service.clearAll();
    loadingRefs.current.clear();
  }, []);

  // Helper for async operations
  const withLoading = useCallback(async (asyncFn, loadingConfig, successConfig, errorConfig) => {
    const loadingKey = loading(loadingConfig);
    
    try {
      const result = await asyncFn();
      updateLoading(loadingKey, successConfig, 'success');
      return result;
    } catch (err) {
      updateLoading(loadingKey, errorConfig, 'error');
      throw err;
    }
  }, [loading, updateLoading]);

  return {
    success,
    error,
    info,
    warning,
    loading,
    updateLoading,
    custom,
    destroy,
    clearAll,
    withLoading,
  };
};

export default useNotification;