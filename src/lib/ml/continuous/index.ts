/**
 * ML Continuous Improvement Module
 * 
 * Export all continuous improvement components:
 * - Hyperparameter Optimization
 * - Feature Store
 * - Model Versioning
 */

// Hyperparameter Optimization
export {
  HyperparameterOptimizer,
  optimizeHyperparameters,
  type HyperparameterSpace,
  type HyperparameterRange,
  type OptimizationConfig,
  type Trial,
  type OptimizationResult
} from './hyperparameter-optimizer'

// Feature Store
export {
  FeatureStore,
  getFeatureStore,
  type FeatureDefinition,
  type FeatureValue,
  type FeatureSet,
  type FeatureLineage,
  type FeatureStatistics
} from './feature-store'

// Model Versioning
export {
  ModelVersionManager,
  getModelVersionManager,
  type ModelVersion,
  type ModelVersionMetrics,
  type ModelChange,
  type RollbackPlan,
  type ModelComparison,
  type Checkpoint
} from './model-versioning'
