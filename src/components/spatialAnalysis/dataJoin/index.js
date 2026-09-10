export { default as DataJoinPanel } from './components/DataJoinPanel';
export { default as FieldSelector } from './components/FieldSelector';
export { default as JoinConfigSection } from './components/JoinConfigSection';
export { default as JoinProgress } from './components/JoinProgress';
export { default as JoinResults } from './components/JoinResults';
export { default as LayerSelector } from './components/LayerSelector';

export { useDataJoin } from './hooks/useDataJoin';
export { useDataJoinValidation } from './hooks/useDataJoinValidation';

export { DataJoinService, getDataJoinService } from './services/dataJoinService';
export { getJoinCache, setJoinCache, invalidateJoinCache } from './services/joinCacheService';

export { buildLookupIndex } from './algorithms/attributeIndex';
export { performAttributeJoin } from './algorithms/attributeJoin';
export { aggregateFeatures, aggregateValues } from './algorithms/aggregation';

export { processInChunks } from './utils/chunkProcessor';
export { normalizeKey, getNormalizedKey, getCompositeKey } from './utils/valueNormalizer';
export { getFieldNames, getFieldTypes, areFieldsCompatible } from './utils/fieldUtils';
export { extractKey, createKeyExtractor } from './utils/keyUtils';

export * from './constants';