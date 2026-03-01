# ML Production Deployment

## Overview

This document describes the production deployment infrastructure for ML models in CITARION:

1. **Model Serialization** - Save, load, and version models
2. **A/B Testing Framework** - Statistical comparison of model variants
3. **Performance Monitoring** - Real-time monitoring with alerts

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ML INFRASTRUCTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MODEL SERIALIZATION                             │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │   Save    │   │   Load    │   │  Version  │   │  Validate │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  │                                                                     │   │
│  │  Features:                                                          │   │
│  │  - JSON and binary formats                                          │   │
│  │  - Checksum verification                                            │   │
│  │  - Model versioning                                                 │   │
│  │  - Auto-cleanup of old versions                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      A/B TESTING FRAMEWORK                           │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │  Create   │   │  Assign   │   │  Track    │   │  Analyze  │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  │                                                                     │   │
│  │  Features:                                                          │   │
│  │  - Traffic splitting                                                │   │
│  │  - Statistical significance testing                                 │   │
│  │  - Auto-stopping on degradation                                     │   │
│  │  - Winner determination                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PERFORMANCE MONITORING                            │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │  Record   │   │  Alerts   │   │  Reports  │   │   Drift   │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  │                                                                     │   │
│  │  Features:                                                          │   │
│  │  - Real-time metrics tracking                                       │   │
│  │  - Configurable alert thresholds                                    │   │
│  │  - Performance reports                                              │   │
│  │  - Drift detection                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1. Model Serialization

### Usage

```typescript
import { 
  getModelSerializer, 
  saveModel, 
  loadModel,
  getActiveModel 
} from '@/lib/ml/production'

// Save a model
const metadata = saveModel(
  { weights: { layer1: [...], layer2: [...] } },
  'lawrence-classifier-v2',
  { accuracy: 0.72, winRate: 0.65 },
  { hiddenSize: 128, sequenceLength: 60 }
)

// Load a model by name
const model = loadModel('lawrence-classifier-v2')

// Load active production model
const activeModel = getActiveModel()

// Set model as active
const serializer = getModelSerializer()
serializer.setActive(metadata.id)

// List all models
const models = serializer.listModels()

// Get model versions
const versions = serializer.getVersions(metadata.id)

// Validate model integrity
const validation = serializer.validate(metadata.id)
```

### Model Metadata

```typescript
interface ModelMetadata {
  id: string
  name: string
  version: string
  createdAt: Date
  updatedAt: Date
  checksum: string
  size: number
  format: 'json' | 'binary' | 'onnx' | 'tensorflow'
  metrics: ModelMetrics
  config: Record<string, unknown>
  tags: string[]
  isActive: boolean
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ml/models | List all models |
| POST | /api/ml/models | Save new model |
| PUT | /api/ml/models | Activate/validate model |
| DELETE | /api/ml/models | Delete model |

## 2. A/B Testing Framework

### Usage

```typescript
import { getABTestingManager } from '@/lib/ml/production'

const manager = getABTestingManager()

// Create experiment
const experiment = manager.createExperiment(
  'LSTM vs Lawrence Classifier',
  'Compare LSTM model against current Lawrence classifier',
  'lawrence-classifier-v2',    // Control model
  'lstm-model-v1',             // Treatment model
  {
    maxDuration: 168,           // 1 week
    minSampleSize: 1000,
    primaryMetric: 'win_rate',
    autoStopOnDegradation: true,
    degradationThreshold: 0.1
  }
)

// Start experiment
manager.startExperiment(experiment.id)

// Get variant assignment
const variant = manager.getVariant(
  experiment.id,
  userId,
  { symbol: 'BTCUSDT', botType: 'KRON' }
)

// Record predictions and trades
manager.recordPrediction(experiment.id, variant.id, {
  symbol: 'BTCUSDT',
  direction: 'LONG',
  confidence: 0.75
})

manager.recordTrade(experiment.id, variant.id, {
  id: 'trade-123',
  symbol: 'BTCUSDT',
  side: 'BUY',
  pnl: 150
})

// End experiment and get results
const conclusion = manager.endExperiment(experiment.id)
console.log(conclusion.winner) // 'control' | 'treatment' | 'inconclusive'
```

### Statistical Tests

| Test | Use Case | Metrics |
|------|----------|---------|
| Chi-Square | Categorical outcomes | Win rate, Accuracy |
| T-Test | Continuous values | PnL, Returns |
| Bootstrap | Non-parametric | Any metric |
| Mann-Whitney | Ordinal data | Rankings |

### Experiment Conclusion

```typescript
interface ExperimentConclusion {
  winner: 'control' | 'treatment' | 'inconclusive'
  confidence: number      // 0-1
  recommendation: string
  effectSize: number      // Relative lift
  expectedLift: number
  projectedAnnualImpact?: number
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ml/experiments | List experiments |
| POST | /api/ml/experiments | Create/control experiment |
| PUT | /api/ml/experiments | Get experiment details |

## 3. Performance Monitoring

### Usage

```typescript
import { getPerformanceMonitor } from '@/lib/ml/production'

const monitor = getPerformanceMonitor()

// Record prediction
monitor.recordPrediction('model-id', 'v1.0.0', {
  correct: true,
  confidence: 0.82,
  latencyMs: 5.3
})

// Record trade
monitor.recordTrade('model-id', 'v1.0.0', {
  outcome: 'win',
  pnl: 250,
  confidence: 0.82
})

// Record drift
monitor.recordDrift('model-id', 'v1.0.0', {
  featureDrift: 0.15,
  predictionDrift: 0.08,
  performanceDrift: 0.05
})

// Get latest metrics
const metrics = monitor.getLatestMetrics('model-id')

// Get alerts
const alerts = monitor.getActiveAlerts()

// Generate report
const report = monitor.generateReport('model-id', 'daily')
```

### Metrics Tracked

```typescript
interface ModelPerformanceMetrics {
  // Prediction metrics
  accuracy: number
  predictionsTotal: number
  predictionsCorrect: number
  
  // Trading metrics
  winRate: number
  tradesTotal: number
  tradesWin: number
  
  // Financial metrics
  totalPnL: number
  avgTradePnL: number
  profitFactor: number
  sharpeRatio: number
  maxDrawdown: number
  
  // Latency metrics
  avgLatencyMs: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  
  // Confidence metrics
  avgConfidence: number
  highConfidenceAccuracy: number
  
  // Drift indicators
  featureDriftScore: number
  predictionDriftScore: number
  performanceDriftScore: number
}
```

### Alert Types

| Type | Trigger | Severity |
|------|---------|----------|
| accuracy_drop | Accuracy < threshold | Warning/Critical |
| win_rate_drop | Win rate < threshold | Warning |
| high_latency | P99 latency > threshold | Warning |
| prediction_drift | Drift score > threshold | Warning |
| feature_drift | Drift score > threshold | Warning |
| drawdown_exceeded | Drawdown > threshold | Critical |

### Default Thresholds

```typescript
const defaultThresholds = [
  { type: 'accuracy_drop', metric: 'accuracy', value: 0.5, severity: 'warning' },
  { type: 'accuracy_drop', metric: 'accuracy', value: 0.4, severity: 'critical' },
  { type: 'win_rate_drop', metric: 'winRate', value: 0.4, severity: 'warning' },
  { type: 'high_latency', metric: 'p99LatencyMs', value: 1000, severity: 'warning' },
  { type: 'prediction_drift', metric: 'predictionDriftScore', value: 0.3, severity: 'warning' },
  { type: 'drawdown_exceeded', metric: 'maxDrawdown', value: 0.2, severity: 'critical' }
]
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ml/monitoring?action=metrics | Get model metrics |
| GET | /api/ml/monitoring?action=alerts | Get active alerts |
| GET | /api/ml/monitoring?action=report | Get performance report |
| POST | /api/ml/monitoring | Record metrics/acknowledge alerts |

## 4. Production Dashboard

The production dashboard provides real-time visualization of all metrics:

- **Overview Tab**: Quick stats, model performance summary
- **Models Tab**: Detailed metrics for each deployed model
- **A/B Tests Tab**: Running experiments and their results
- **Alerts Tab**: Active alerts with acknowledgment

## Files Created

| File | Description | Lines |
|------|-------------|-------|
| `/src/lib/ml/production/model-serialization.ts` | Model save/load/version | ~450 |
| `/src/lib/ml/production/ab-testing.ts` | A/B testing framework | ~550 |
| `/src/lib/ml/production/performance-monitor.ts` | Performance monitoring | ~500 |
| `/src/lib/ml/production/index.ts` | Module exports | ~50 |
| `/src/app/api/ml/models/route.ts` | Models API | ~130 |
| `/src/app/api/ml/experiments/route.ts` | Experiments API | ~150 |
| `/src/app/api/ml/monitoring/route.ts` | Monitoring API | ~130 |
| `/src/components/ml/production-dashboard.tsx` | UI Dashboard | ~420 |

## Next Steps

1. **Continuous Improvement**:
   - Automated hyperparameter tuning
   - Feature store integration
   - Model versioning and rollback

2. **Advanced Features**:
   - Transformer models
   - Graph neural networks
   - Federated learning
