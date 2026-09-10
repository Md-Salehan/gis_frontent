import { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { message } from 'antd';
import { getDataJoinService } from '../services/dataJoinService';
import { setTempGeoJsonLayer } from '../../../../store/slices/mapSlice';
import { JOIN_STATUS } from '../constants';

export function useDataJoin(options = {}) {
  const dispatch = useDispatch();
  const service = getDataJoinService(options);

  const [status, setStatus] = useState(JOIN_STATUS.IDLE);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState(null);
  const [resultLayerId, setResultLayerId] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const processingRef = useRef(false);

  const isProcessing = status === JOIN_STATUS.PROCESSING;
  const isCompleted = status === JOIN_STATUS.COMPLETED;
  const isError = status === JOIN_STATUS.ERROR;

  const performJoin = useCallback(async (config) => {
    if (processingRef.current) {
      message.warning('Join already in progress');
      return;
    }

    // Reset state
    setStatus(JOIN_STATUS.VALIDATING);
    setProgress(0);
    setProcessed(0);
    setTotal(0);
    setStatistics(null);
    setResultLayerId(null);
    setError(null);

    processingRef.current = true;

    // Create abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setStatus(JOIN_STATUS.PROCESSING);

      // Perform join
      const result = await service.performJoin(config, {
        signal,
        onProgress: (processed, total) => {
          setProcessed(processed);
          setTotal(total);
          setProgress(total > 0 ? (processed / total) * 100 : 0);
        },
        onChunkComplete: (chunk, index, chunkStats) => {
          // Optional: Update intermediate stats
        },
      });

      if (signal.aborted) {
        throw new Error('Operation cancelled');
      }

      // Add result to map
      const layerId = `data_join_${Date.now()}`;
      const layerName = `Join: ${config.targetLayer?.label || 'Unknown'} → ${config.joinLayer?.label || 'Unknown'}`;

      // Create the result layer
      const resultLayer = {
        layerId,
        geoJsonData: result.featureCollection,
        metaData: {
          layer: {
            layer_nm: layerName,
            type: 'data_join_result',
            feature_count: result.featureCollection.features.length,
            created: new Date().toISOString(),
          },
          style: {
            geom_typ: 'G',
          },
        },
        isActive: true,
      };

      dispatch(setTempGeoJsonLayer(resultLayer));

      setResultLayerId(layerId);
      
      // Ensure statistics has all required fields
      const finalStats = {
        ...result.statistics,
        resultFeatureCount: result.featureCollection.features.length,
        duplicateKeyCount: result.statistics?.duplicateKeyCount || 0,
        invalidKeyCount: result.statistics?.invalidKeyCount || 0,
        uniqueJoinKeys: result.statistics?.uniqueJoinKeys || 0,
      };
      
      setStatistics(finalStats);
      setStatus(JOIN_STATUS.COMPLETED);
      setProgress(100);

      message.success(`Data join completed! ${result.statistics.matchedCount || 0} matches found`);

      return result;

    } catch (err) {
      if (err.message === 'Operation cancelled') {
        setStatus(JOIN_STATUS.CANCELLED);
        message.info('Join cancelled');
      } else {
        setStatus(JOIN_STATUS.ERROR);
        setError(err.message || 'An error occurred during the join operation');
        message.error(`Join failed: ${err.message || 'Unknown error'}`);
      }
      throw err;
    } finally {
      processingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [dispatch, service]);

  const cancelJoin = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    if (processingRef.current) {
      cancelJoin();
    }
    setStatus(JOIN_STATUS.IDLE);
    setProgress(0);
    setProcessed(0);
    setTotal(0);
    setStatistics(null);
    setResultLayerId(null);
    setError(null);
  }, [cancelJoin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    status,
    progress,
    processed,
    total,
    statistics,
    resultLayerId,
    error,
    isProcessing,
    isCompleted,
    isError,
    performJoin,
    cancelJoin,
    reset,
  };
}