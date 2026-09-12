// constants.js
export const JOIN_TYPES = {
  LEFT: 'left',
  INNER: 'inner',
};

export const JOIN_TYPE_LABELS = {
  [JOIN_TYPES.LEFT]: 'Left Join',
  [JOIN_TYPES.INNER]: 'Inner Join',
};

export const MATCH_STRATEGIES = {
  FIRST: 'first',
  ALL: 'all',
  AGGREGATE: 'aggregate',
};

export const MATCH_STRATEGY_LABELS = {
  [MATCH_STRATEGIES.FIRST]: 'First Match',
  [MATCH_STRATEGIES.ALL]: 'All Matches',
  [MATCH_STRATEGIES.AGGREGATE]: 'Aggregate',
};

export const AGGREGATION_TYPES = {
  COUNT: 'count',
  SUM: 'sum',
  AVG: 'average',
  MIN: 'min',
  MAX: 'max',
  CONCAT: 'concatenate',
};

export const AGGREGATION_LABELS = {
  [AGGREGATION_TYPES.COUNT]: 'Count',
  [AGGREGATION_TYPES.SUM]: 'Sum',
  [AGGREGATION_TYPES.AVG]: 'Average',
  [AGGREGATION_TYPES.MIN]: 'Minimum',
  [AGGREGATION_TYPES.MAX]: 'Maximum',
  [AGGREGATION_TYPES.CONCAT]: 'Concatenate',
};

export const COLLISION_STRATEGIES = {
  PREFIX: 'prefix',
  SUFFIX: 'suffix',
  NONE: 'none',
};

export const COLLISION_STRATEGY_LABELS = {
  [COLLISION_STRATEGIES.PREFIX]: 'Prefix',
  [COLLISION_STRATEGIES.SUFFIX]: 'Suffix',
  [COLLISION_STRATEGIES.NONE]: 'None (Overwrite)',
};

export const DEFAULT_CHUNK_SIZE = 1000;
export const PROGRESS_UPDATE_INTERVAL = 250; 
export const CACHE_MAX_ENTRIES = 5;
export const CACHE_MAX_MEMORY_MB = 100;

export const JOIN_STATUS = {
  IDLE: 'idle',
  VALIDATING: 'validating',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ERROR: 'error',
};