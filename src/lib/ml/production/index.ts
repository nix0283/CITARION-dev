/**
 * ML Production Module - Main Entry Point
 * 
 * Export all production deployment components:
 * - Model Serialization
 * - A/B Testing
 * - Performance Monitoring
 */

// Model Serialization
export {
  ModelSerializer,
  getModelSerializer,
  saveModel,
  loadModel,
  getActiveModel,
  type ModelMetadata,
  type ModelFormat,
  type ModelMetrics,
  type SerializedModel,
  type ModelVersion,
  type ModelRegistry
} from './model-serialization'

// A/B Testing
export {
  ABTestingManager,
  getABTestingManager,
  type ABExperiment,
  type ExperimentStatus,
  type ExperimentVariant,
  type ExperimentTargeting,
  type ExperimentConfig,
  type PrimaryMetric,
  type SecondaryMetric,
  type ExperimentResults,
  type VariantMetrics,
  type StatisticalTestResult,
  type ExperimentConclusion,
  type ExperimentEvent
} from './ab-testing'

// Performance Monitoring
export {
  PerformanceMonitor,
  getPerformanceMonitor,
  type ModelPerformanceMetrics,
  type PerformanceAlert,
  type AlertType,
  type AlertSeverity,
  type AlertThreshold,
  type PerformanceReport,
  type TrendAnalysis,
  type PerformanceBreakdown
} from './performance-monitor'
