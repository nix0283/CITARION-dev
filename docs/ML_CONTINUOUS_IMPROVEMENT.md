# ML Continuous Improvement

## Overview

This document describes the continuous improvement infrastructure for ML models:

1. **Hyperparameter Optimization** - Automated tuning with multiple strategies
2. **Feature Store** - Centralized feature management
3. **Model Versioning** - Semantic versioning with rollback capability

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTINUOUS IMPROVEMENT PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  HYPERPARAMETER OPTIMIZATION                         │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │   Grid    │   │  Random   │   │ Bayesian  │   │  Genetic  │    │   │
│  │  │  Search   │   │  Search   │   │   Opt.    │   │  Algo.    │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  │                                                                     │   │
│  │  Features:                                                          │   │
│  │  - Multiple search strategies                                       │   │
│  │  - Early stopping with pruning                                      │   │
│  │  - Parallel trial execution                                         │   │
│  │  - Parameter importance analysis                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        FEATURE STORE                                  │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │  Register │   │  Compute  │   │   Cache   │   │  Track    │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  │                                                                     │   │
│  │  Features:                                                          │   │
│  │  - Built-in technical indicators                                    │   │
│  │  - Custom feature registration                                      │   │
│  │  - Feature caching                                                  │   │
│  │  - Statistics and lineage tracking                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MODEL VERSIONING                                  │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │  Semantic │   │Checkpoint │   │  Rollback │   │  Compare  │    │   │
│  │  │ Versioning│   │   Auto    │   │  1-Click  │   │ Versions  │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  │                                                                     │   │
│  │  Features:                                                          │   │
│  │  - Semantic versioning (major.minor.patch)                          │   │
│  │  - Automatic checkpointing                                          │   │
│  │  - One-click rollback with validation                               │   │
│  │  - Version comparison and recommendations                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1. Hyperparameter Optimization

### Usage

```typescript
import { 
  HyperparameterOptimizer,
  optimizeHyperparameters 
} from '@/lib/ml/continuous'

// Define search space
const space = {
  learningRate: { type: 'float', min: 0.0001, max: 0.1, log: true },
  hiddenSize: { type: 'int', min: 32, max: 256 },
  numLayers: { type: 'int', min: 1, max: 4 },
  dropout: { type: 'float', min: 0, max: 0.5 },
  optimizer: { type: 'categorical', choices: ['adam', 'sgd', 'rmsprop'] }
}

// Quick optimization
const results = await optimizeHyperparameters(
  space,
  async (params) => {
    // Train model with params
    const model = createModel(params)
    const metrics = await trainAndEvaluate(model)
    return metrics
  },
  {
    strategy: 'bayesian',
    maxTrials: 50,
    objective: 'maximize',
    metric: 'accuracy',
    earlyStopping: true,
    patience: 10
  }
)

console.log(results.bestHyperparameters)
// { learningRate: 0.003, hiddenSize: 128, numLayers: 2, ... }

// Manual optimization control
const optimizer = new HyperparameterOptimizer(space, config)

for (let i = 0; i < 100 && !optimizer.shouldStop(); i++) {
  const trial = optimizer.getNextTrial()
  optimizer.startTrial(trial.id)
  
  // Report intermediate results for pruning
  for (const step of [1, 2, 3, 4, 5]) {
    const intermediateValue = await evaluatePartial(trial.hyperparameters, step)
    optimizer.reportIntermediateResult(trial.id, step, intermediateValue)
    
    // Check if trial was pruned
    const current = optimizer.trials.get(trial.id)
    if (current?.status === 'pruned') break
  }
  
  // Complete trial
  const metrics = await fullEvaluation(trial.hyperparameters)
  optimizer.completeTrial(trial.id, metrics)
}
```

### Search Strategies

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| Grid | Small search spaces | Exhaustive | Slow for many params |
| Random | Large search spaces | Efficient exploration | No learning |
| Bayesian | Expensive evaluations | Smart exploration | Complex setup |
| Genetic | Complex landscapes | Global optimization | More parameters |

### Optimization Result

```typescript
interface OptimizationResult {
  bestTrial: Trial
  bestHyperparameters: Record<string, number | string>
  bestObjectiveValue: number
  allTrials: Trial[]
  
  // Statistics
  totalTrials: number
  completedTrials: number
  prunedTrials: number
  
  // Analysis
  parameterImportance: Record<string, number>
  convergenceData: Array<{ trial: number; best: number; mean: number }>
  
  // Recommendations
  recommendations: string[]
}
```

## 2. Feature Store

### Usage

```typescript
import { getFeatureStore } from '@/lib/ml/continuous'

const store = getFeatureStore()

// Register custom feature
store.registerFeature({
  name: 'custom_momentum',
  version: '1.0',
  description: 'Custom momentum indicator',
  type: 'numeric',
  dependencies: ['close', 'volume'],
  computeFunction: 'computeCustomMomentum',
  computationConfig: {
    windowSize: 14,
    normalize: true
  },
  tags: ['custom', 'momentum']
})

// Compute single feature
const feature = await store.computeFeature('rsi_14', {
  close: [100, 101, 102, ...],
  volume: [1000, 1100, 1050, ...]
})

// Compute multiple features
const featureSet = await store.computeFeatures(
  ['rsi_14', 'macd', 'bb_position', 'volume_ratio'],
  marketData
)

// Get statistics
const stats = store.getStatistics('rsi_14')
// { mean: 52.3, std: 15.2, min: 23.1, max: 87.5, ... }

// Get lineage
const lineage = store.getLineage('rsi_14')
// { sources: ['close'], transformations: [...], ... }
```

### Built-in Features

| Feature | Description | Dependencies |
|---------|-------------|--------------|
| price_return | Price return over window | close |
| price_volatility | Standard deviation of returns | close |
| price_momentum | Price momentum indicator | close |
| volume_ratio | Volume vs average | volume |
| rsi_14 | Relative Strength Index | close |
| macd | MACD indicator | close |
| bb_position | Bollinger Band position | close |
| hour_of_day | Cyclical hour encoding | timestamp |
| day_of_week | Cyclical day encoding | timestamp |

### Feature Definition

```typescript
interface FeatureDefinition {
  name: string
  version: string
  description: string
  type: 'numeric' | 'categorical' | 'binary' | 'embedding'
  
  // Dependencies
  dependencies: string[]
  computeFunction: string
  
  // Configuration
  computationConfig?: {
    windowSize?: number
    aggregation?: 'mean' | 'sum' | 'min' | 'max' | 'std' | 'last'
    normalize?: boolean
    fillMissing?: 'zero' | 'mean' | 'forward' | 'backward'
  }
  
  // Metadata
  tags: string[]
  deprecated?: boolean
}
```

## 3. Model Versioning

### Usage

```typescript
import { getModelVersionManager } from '@/lib/ml/continuous'

const manager = getModelVersionManager()

// Create new version
const version = manager.createVersion(
  'lawrence-classifier',
  { weights: modelWeights, config: modelConfig },
  {
    changeType: 'retrain',
    description: 'Retrained with Q1 2024 data',
    createdBy: 'ml-pipeline',
    metrics: { accuracy: 0.72, winRate: 0.65 },
    parentVersion: '1.2.3'
  }
)
// Creates version 1.3.0

// Get version history
const history = manager.getVersionHistory('lawrence-classifier')
// [{ version: '1.3.0', ... }, { version: '1.2.3', ... }, ...]

// Set active version
manager.setActiveVersion('lawrence-classifier', '1.2.3')

// Compare versions
const comparison = manager.compareVersions('lawrence-classifier', '1.3.0', '1.2.3')
// {
//   metricsDiff: { accuracy: { v1: 0.70, v2: 0.72, diff: 0.02 }, ... },
//   recommendation: { action: 'upgrade', confidence: 0.85, reasoning: '...' }
// }

// Create rollback plan
const plan = manager.createRollbackPlan(
  'lawrence-classifier',
  '1.2.3',
  'Performance degradation in production'
)

// Execute rollback
const result = await manager.executeRollback('lawrence-classifier', '1.2.3')
// { success: true, message: 'Rolled back to version 1.2.3' }
```

### Semantic Versioning Rules

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| architecture | Major | 1.0.0 → 2.0.0 |
| hyperparameter | Minor | 1.0.0 → 1.1.0 |
| retrain | Minor | 1.0.0 → 1.1.0 |
| bugfix | Patch | 1.0.0 → 1.0.1 |
| data | Patch | 1.0.0 → 1.0.1 |

### Rollback Plan

```typescript
interface RollbackPlan {
  fromVersion: string
  toVersion: string
  reason: string
  status: 'pending' | 'executed' | 'failed' | 'cancelled'
  
  // Validation
  validationChecks: ValidationCheck[]
  
  // Impact assessment
  expectedImpact: {
    accuracyChange: number
    riskLevel: 'low' | 'medium' | 'high'
  }
}
```

## Files Created

| File | Description | Lines |
|------|-------------|-------|
| `/src/lib/ml/continuous/hyperparameter-optimizer.ts` | Hyperparameter tuning | ~650 |
| `/src/lib/ml/continuous/feature-store.ts` | Feature management | ~550 |
| `/src/lib/ml/continuous/model-versioning.ts` | Version control | ~500 |
| `/src/lib/ml/continuous/index.ts` | Module exports | ~40 |

## Integration with Production

```typescript
// Complete improvement workflow
import { 
  optimizeHyperparameters,
  getFeatureStore,
  getModelVersionManager 
} from '@/lib/ml/continuous'
import { getModelSerializer, getPerformanceMonitor } from '@/lib/ml/production'

async function improveModel(modelName: string) {
  // 1. Get current performance
  const monitor = getPerformanceMonitor()
  const metrics = monitor.getLatestMetrics(modelName)
  
  // 2. Define search space
  const space = { /* ... */ }
  
  // 3. Optimize
  const results = await optimizeHyperparameters(space, evaluate, {
    strategy: 'bayesian',
    maxTrials: 50,
    earlyStopping: true
  })
  
  // 4. Create new version if improved
  if (results.bestObjectiveValue > metrics.accuracy) {
    const versionManager = getModelVersionManager()
    const version = versionManager.createVersion(
      modelName,
      { weights: results.bestTrial.hyperparameters },
      {
        changeType: 'hyperparameter',
        description: 'Optimized hyperparameters',
        metrics: results.bestTrial.metrics,
        createdBy: 'auto-improver'
      }
    )
    
    // 5. Deploy to production
    const serializer = getModelSerializer()
    serializer.setActive(version.modelId)
  }
}
```

## Next Steps

1. **Advanced Features**:
   - Transformer models for longer sequences
   - Graph neural networks for market relationships
   - Federated learning for privacy

2. **Integration**:
   - Full system integration
   - CornixBot-like signal bot
   - Binance-like UI styling
