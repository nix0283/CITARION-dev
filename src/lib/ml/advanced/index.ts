/**
 * ML Advanced Features Module
 * 
 * Export all advanced ML components:
 * - Transformer Models
 * - Graph Neural Networks
 * - Federated Learning
 */

// Transformer Models
export {
  TimeSeriesTransformer,
  createTimeSeriesTransformer,
  MultiHeadAttention,
  PositionalEncoding,
  TransformerEncoderLayer,
  type TransformerConfig,
  type TransformerOutput,
  type AttentionOutput
} from './transformer'

// Graph Neural Networks
export {
  GraphNeuralNetwork,
  createMarketGNN,
  MarketGraphBuilder,
  createMarketGraphBuilder,
  GraphConvLayer,
  GraphAttentionLayer,
  type GraphConfig,
  type MarketGraph,
  type GraphNode,
  type GraphEdge,
  type GNNOutput
} from './graph-neural-network'

// Federated Learning
export {
  FederatedCoordinator,
  FederatedClient,
  createFederatedCoordinator,
  createFederatedClient,
  type FederatedConfig,
  type ClientInfo,
  type ModelUpdate,
  type AggregationResult,
  type FederatedState
} from './federated-learning'
