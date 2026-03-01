# ML Advanced Features

## Overview

This document describes advanced ML capabilities:

1. **Transformer Models** - Attention-based sequence prediction
2. **Graph Neural Networks** - Market relationship analysis
3. **Federated Learning** - Privacy-preserving distributed training

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ADVANCED ML FEATURES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     TRANSFORMER MODELS                               │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │  Multi-   │   │Positional │   │  Encoder  │   │   Time    │    │   │
│  │  │Head Attn  │   │ Encoding  │   │  Layers   │   │  Series   │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  │                                                                     │   │
│  │  Features:                                                          │   │
│  │  - Self-attention for long-range dependencies                       │   │
│  │  - Positional encoding for sequence order                           │   │
│  │  - Multi-head attention for different patterns                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   GRAPH NEURAL NETWORKS                              │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │  Graph    │   │  Graph    │   │  Market   │   │ Influence │    │   │
│  │  │  Conv     │   │ Attention │   │  Builder  │   │ Analysis  │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  │                                                                     │   │
│  │  Features:                                                          │   │
│  │  - Asset correlation graph construction                             │   │
│  │  - Market factor relationships                                      │   │
│  │  - Signal propagation analysis                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   FEDERATED LEARNING                                 │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │ Coordinator│   │  Secure   │   │Diff. Priv.│   │  FedAvg   │    │   │
│  │  │            │   │Aggregation│   │           │   │ FedProx   │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  │                                                                     │   │
│  │  Features:                                                          │   │
│  │  - Distributed model training                                       │   │
│  │  - Differential privacy                                             │   │
│  │  - Secure aggregation                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1. Transformer Models

### Usage

```typescript
import { 
  createTimeSeriesTransformer,
  TimeSeriesTransformer 
} from '@/lib/ml/advanced'

// Create transformer
const transformer = createTimeSeriesTransformer({
  inputSize: 46,        // Feature dimension
  outputSize: 3,        // LONG, SHORT, NEUTRAL
  sequenceLength: 60,   // 60 candles
  dModel: 128,          // Model dimension
  numHeads: 8,          // Attention heads
  numEncoderLayers: 4,  // Encoder depth
  dFF: 512,             // Feed-forward size
  dropout: 0.1
})

// Predict
const sequence = [[...], [...], ...] // 60 x 46 features
const prediction = transformer.predict(sequence)

console.log(prediction.direction)  // 'LONG' | 'SHORT' | 'NEUTRAL'
console.log(prediction.confidence) // 0.85

// Train
const samples = [
  { input: [...], label: 0 }, // 0 = LONG, 1 = SHORT, 2 = NEUTRAL
  { input: [...], label: 1 },
  // ...
]

const { loss, accuracy } = transformer.train(samples, 10)
```

### Architecture Components

| Component | Purpose |
|-----------|---------|
| Positional Encoding | Encode sequence position |
| Multi-Head Attention | Learn different patterns |
| Feed-Forward Network | Non-linear transformation |
| Layer Normalization | Stabilize training |

### Configuration

```typescript
interface TransformerConfig {
  inputSize: number       // Input feature dimension
  outputSize: number      // Output classes
  sequenceLength: number  // Input sequence length
  dModel: number          // Model dimension
  numHeads: number        // Attention heads
  numEncoderLayers: number
  dFF: number            // Feed-forward dimension
  dropout: number
  learningRate: number
}
```

## 2. Graph Neural Networks

### Usage

```typescript
import { 
  createMarketGNN,
  createMarketGraphBuilder 
} from '@/lib/ml/advanced'

// Build market graph
const graphBuilder = createMarketGraphBuilder()

const assets = [
  { symbol: 'BTCUSDT', prices: [42000, 42100, ...] },
  { symbol: 'ETHUSDT', prices: [2200, 2210, ...] },
  // ...
]

const graph = graphBuilder.buildCorrelationGraph(assets, 0.5)

// Add factors
graphBuilder.addFactors(graph, [
  { name: 'fear_greed_index', type: 'sentiment', values: [...] },
  { name: 'btc_dominance', type: 'market', values: [...] }
])

// Create GNN
const gnn = createMarketGNN({
  nodeFeatureSize: 5,
  hiddenSize: 64,
  numLayers: 3,
  numHeads: 4,
  outputSize: 3
})

// Analyze market
const analysis = gnn.analyzeMarket(graph)

console.log(analysis.marketDirection)  // 'BULLISH' | 'BEARISH' | 'NEUTRAL'
console.log(analysis.confidence)       // 0.72
console.log(analysis.assetPredictions) // { BTCUSDT: { direction: 'LONG', confidence: 0.8 }, ... }
console.log(analysis.influentialAssets) // ['BTCUSDT', 'ETHUSDT', ...]
```

### Graph Construction

```typescript
interface MarketGraph {
  nodes: Map<string, GraphNode>  // Assets, factors, signals
  edges: GraphEdge[]             // Correlations, causality
  adjacencyMatrix: number[][]    // Graph structure
}
```

### Node Types

| Type | Description | Features |
|------|-------------|----------|
| asset | Trading pairs | Returns, volatility, momentum, position |
| factor | Market factors | Normalized factor values |
| signal | Trading signals | Direction, confidence |

### Edge Types

| Type | Description |
|------|-------------|
| correlation | Price correlation |
| causality | Causal relationship |
| similarity | Feature similarity |

## 3. Federated Learning

### Usage

```typescript
import { 
  createFederatedCoordinator,
  createFederatedClient 
} from '@/lib/ml/advanced'

// Create coordinator
const coordinator = createFederatedCoordinator({
  modelId: 'signal-classifier',
  minClients: 3,
  maxClients: 100,
  localEpochs: 5,
  aggregationStrategy: 'fedavg',
  differentialPrivacy: true,
  noiseScale: 0.1,
  secureAggregation: true,
  maxRounds: 100
})

// Register clients
coordinator.registerClient('client-1', 'public-key-1')
coordinator.registerClient('client-2', 'public-key-2')
coordinator.registerClient('client-3', 'public-key-3')

// Start training round
const roundInfo = coordinator.startRound()
// { round: 1, globalWeights: {...}, localEpochs: 5, learningRate: 0.01 }

// Client-side training
const client = createFederatedClient('client-1', coordinator)
client.setLocalData(localTrainingData)

const update = client.trainLocal(
  roundInfo.globalWeights,
  roundInfo.localEpochs,
  roundInfo.learningRate
)

// Send update to coordinator
coordinator.receiveUpdate(update)

// Get results
const state = coordinator.getState()
console.log(state.bestAccuracy)      // 0.75
console.log(state.currentRound)       // 10
```

### Aggregation Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| FedAvg | Weighted average | General purpose |
| FedProx | Proximal term | Heterogeneous data |
| FedAdam | Adaptive learning | Non-convex objectives |

### Privacy Features

```typescript
interface PrivacyConfig {
  differentialPrivacy: boolean
  noiseScale: number        // Gaussian noise std
  clippingNorm: number      // Gradient clipping
  secureAggregation: boolean // Encrypted updates
}
```

### Training Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     FEDERATED TRAINING FLOW                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Coordinator                    Clients                          │
│  ───────────                    ───────                          │
│                                                                  │
│  1. Initialize global model                                      │
│       │                                                          │
│  2. Start round ──────────────► 3. Download global weights       │
│       │                              │                           │
│       │                          4. Train locally                │
│       │                              │                           │
│       │                          5. Apply DP                     │
│       │                              │                           │
│       │                          6. Encrypt update               │
│       │                              │                           │
│       ◄─────────────────────── 7. Send encrypted update          │
│       │                                                          │
│  8. Aggregate updates                                            │
│       │                                                          │
│  9. Update global model                                          │
│       │                                                          │
│  10. Check convergence ──────► 11. Repeat or stop                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Files Created

| File | Description | Lines |
|------|-------------|-------|
| `/src/lib/ml/advanced/transformer.ts` | Transformer models | ~650 |
| `/src/lib/ml/advanced/graph-neural-network.ts` | GNN for markets | ~600 |
| `/src/lib/ml/advanced/federated-learning.ts` | Federated learning | ~550 |
| `/src/lib/ml/advanced/index.ts` | Module exports | ~40 |

## Integration Example

```typescript
// Complete advanced ML pipeline
import { createTimeSeriesTransformer } from '@/lib/ml/advanced/transformer'
import { createMarketGNN, createMarketGraphBuilder } from '@/lib/ml/advanced/graph-neural-network'
import { createFederatedCoordinator } from '@/lib/ml/advanced/federated-learning'

async function advancedAnalysis(marketData: MarketData) {
  // 1. Build market graph
  const graphBuilder = createMarketGraphBuilder()
  const graph = graphBuilder.buildCorrelationGraph(marketData.assets)
  
  // 2. GNN analysis
  const gnn = createMarketGNN()
  const marketAnalysis = gnn.analyzeMarket(graph)
  
  // 3. Transformer prediction for specific asset
  const transformer = createTimeSeriesTransformer()
  const sequence = extractSequence(marketData, 'BTCUSDT')
  const prediction = transformer.predict(sequence)
  
  // 4. Combine signals
  return {
    marketDirection: marketAnalysis.marketDirection,
    marketConfidence: marketAnalysis.confidence,
    assetPrediction: prediction.direction,
    assetConfidence: prediction.confidence,
    influentialAssets: marketAnalysis.influentialAssets,
    recommendation: generateRecommendation(marketAnalysis, prediction)
  }
}
```

## Next Steps

1. **Integration**:
   - Full system integration with existing bots
   - CornixBot-like signal bot implementation
   - Binance-like UI styling

2. **Production Deployment**:
   - Model serving infrastructure
   - Real-time inference optimization
   - Monitoring and alerting
