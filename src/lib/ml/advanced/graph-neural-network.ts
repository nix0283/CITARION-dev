/**
 * Graph Neural Networks for Market Analysis
 * 
 * Implements GNN for analyzing relationships between:
 * - Assets (cryptocurrencies, stocks)
 * - Market factors
 * - Trading signals
 */

// ============================================================================
// Types
// ============================================================================

export interface GraphConfig {
  // Node features
  nodeFeatureSize: number
  
  // Graph structure
  hiddenSize: number
  numLayers: number
  numHeads: number
  
  // Output
  outputSize: number
  
  // Training
  dropout: number
  learningRate: number
}

export interface GraphNode {
  id: string
  type: 'asset' | 'factor' | 'signal'
  features: number[]
  embedding?: number[]
}

export interface GraphEdge {
  source: string
  target: string
  type: 'correlation' | 'causality' | 'similarity'
  weight: number
  features?: number[]
}

export interface MarketGraph {
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
  adjacencyMatrix: number[][]
}

export interface GNNOutput {
  nodeEmbeddings: Map<string, number[]>
  graphEmbedding: number[]
  predictions: {
    node: Record<string, number[]>
    graph: number[]
  }
  attentionWeights?: number[][][]
}

// ============================================================================
// Graph Convolution Layer
// ============================================================================

export class GraphConvLayer {
  private inFeatures: number
  private outFeatures: number
  private weight: number[][]
  private bias: number[]

  constructor(inFeatures: number, outFeatures: number) {
    this.inFeatures = inFeatures
    this.outFeatures = outFeatures
    
    // Initialize weights
    const scale = Math.sqrt(2 / inFeatures)
    this.weight = []
    for (let i = 0; i < inFeatures; i++) {
      const row: number[] = []
      for (let j = 0; j < outFeatures; j++) {
        row.push((Math.random() - 0.5) * scale)
      }
      this.weight.push(row)
    }
    
    this.bias = new Array(outFeatures).fill(0)
  }

  forward(
    nodeFeatures: number[][],
    adjacencyMatrix: number[][]
  ): number[][] {
    const numNodes = nodeFeatures.length
    
    // Normalize adjacency matrix (D^(-1/2) * A * D^(-1/2))
    const normalizedAdj = this.normalizeAdjacency(adjacencyMatrix)
    
    // Aggregate neighbor features: A_norm * X
    const aggregated: number[][] = []
    for (let i = 0; i < numNodes; i++) {
      const row: number[] = new Array(this.inFeatures).fill(0)
      for (let j = 0; j < numNodes; j++) {
        for (let k = 0; k < this.inFeatures; k++) {
          row[k] += normalizedAdj[i][j] * nodeFeatures[j][k]
        }
      }
      aggregated.push(row)
    }
    
    // Linear transformation: (A_norm * X) * W + b
    const output = this.matmul(aggregated, this.weight)
      .map(row => row.map((v, i) => v + this.bias[i]))
    
    // ReLU activation
    return output.map(row => row.map(v => Math.max(0, v)))
  }

  private normalizeAdjacency(adj: number[][]): number[][] {
    const n = adj.length
    
    // Add self-loops
    const adjWithSelf = adj.map((row, i) => {
      const newRow = [...row]
      newRow[i] += 1
      return newRow
    })
    
    // Compute degree matrix
    const degree = adjWithSelf.map(row => 
      row.reduce((a, b) => a + b, 0)
    )
    
    // D^(-1/2)
    const degInvSqrt = degree.map(d => d > 0 ? 1 / Math.sqrt(d) : 0)
    
    // Normalize
    const normalized: number[][] = []
    for (let i = 0; i < n; i++) {
      const row: number[] = []
      for (let j = 0; j < n; j++) {
        row.push(degInvSqrt[i] * adjWithSelf[i][j] * degInvSqrt[j])
      }
      normalized.push(row)
    }
    
    return normalized
  }

  private matmul(a: number[][], b: number[][]): number[][] {
    const result: number[][] = []
    const cols = b[0].length
    
    for (let i = 0; i < a.length; i++) {
      const row: number[] = []
      for (let j = 0; j < cols; j++) {
        let sum = 0
        for (let k = 0; k < a[0].length; k++) {
          sum += a[i][k] * b[k][j]
        }
        row.push(sum)
      }
      result.push(row)
    }
    
    return result
  }
}

// ============================================================================
// Graph Attention Layer
// ============================================================================

export class GraphAttentionLayer {
  private inFeatures: number
  private outFeatures: number
  private numHeads: number
  private W: number[][]
  private a: number[]

  constructor(inFeatures: number, outFeatures: number, numHeads: number = 8) {
    this.inFeatures = inFeatures
    this.outFeatures = outFeatures
    this.numHeads = numHeads
    
    // Initialize weights
    const scale = Math.sqrt(2 / inFeatures)
    this.W = []
    for (let i = 0; i < inFeatures; i++) {
      const row: number[] = []
      for (let j = 0; j < outFeatures * numHeads; j++) {
        row.push((Math.random() - 0.5) * scale)
      }
      this.W.push(row)
    }
    
    // Attention parameters
    this.a = new Array(2 * outFeatures).fill(0).map(() => (Math.random() - 0.5) * scale)
  }

  forward(
    nodeFeatures: number[][],
    adjacencyMatrix: number[][]
  ): { output: number[][]; attention: number[][][] } {
    const numNodes = nodeFeatures.length
    
    // Linear transformation
    const transformed = this.matmul(nodeFeatures, this.W)
    
    // Split into heads
    const headOutputs: number[][][] = []
    const attentionWeights: number[][][] = []
    
    for (let h = 0; h < this.numHeads; h++) {
      const start = h * this.outFeatures
      const headFeatures = transformed.map(row => row.slice(start, start + this.outFeatures))
      
      // Compute attention scores
      const attention = this.computeAttention(headFeatures, adjacencyMatrix)
      attentionWeights.push(attention)
      
      // Apply attention
      const headOutput = this.applyAttention(headFeatures, attention)
      headOutputs.push(headOutput)
    }
    
    // Concatenate heads
    const output: number[][] = []
    for (let i = 0; i < numNodes; i++) {
      const row: number[] = []
      for (const head of headOutputs) {
        row.push(...head[i])
      }
      output.push(row)
    }
    
    return { output, attention: attentionWeights }
  }

  private computeAttention(features: number[][], adj: number[][]): number[][] {
    const n = features.length
    const attention: number[][] = []
    
    for (let i = 0; i < n; i++) {
      const row: number[] = []
      
      for (let j = 0; j < n; j++) {
        if (adj[i][j] > 0 || i === j) {
          // Compute attention score
          let score = 0
          for (let k = 0; k < this.outFeatures; k++) {
            score += this.a[k] * features[i][k]
            score += this.a[this.outFeatures + k] * features[j][k]
          }
          score = this.leakyRelu(score)
          row.push(score)
        } else {
          row.push(-Infinity)
        }
      }
      
      // Softmax over neighbors
      const maxVal = Math.max(...row.filter(v => v > -Infinity))
      const exp = row.map(v => v > -Infinity ? Math.exp(v - maxVal) : 0)
      const sum = exp.reduce((a, b) => a + b, 0)
      
      attention.push(exp.map(v => sum > 0 ? v / sum : 0))
    }
    
    return attention
  }

  private applyAttention(features: number[][], attention: number[][]): number[][] {
    const n = features.length
    const output: number[][] = []
    
    for (let i = 0; i < n; i++) {
      const row: number[] = new Array(this.outFeatures).fill(0)
      
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < this.outFeatures; k++) {
          row[k] += attention[i][j] * features[j][k]
        }
      }
      
      // ELU activation
      output.push(row.map(v => v > 0 ? v : Math.exp(v) - 1))
    }
    
    return output
  }

  private leakyRelu(x: number, alpha: number = 0.2): number {
    return x > 0 ? x : alpha * x
  }

  private matmul(a: number[][], b: number[][]): number[][] {
    const result: number[][] = []
    const cols = b[0].length
    
    for (let i = 0; i < a.length; i++) {
      const row: number[] = []
      for (let j = 0; j < cols; j++) {
        let sum = 0
        for (let k = 0; k < a[0].length; k++) {
          sum += a[i][k] * b[k][j]
        }
        row.push(sum)
      }
      result.push(row)
    }
    
    return result
  }
}

// ============================================================================
// Market Graph Builder
// ============================================================================

export class MarketGraphBuilder {
  /**
   * Build correlation graph from price data
   */
  buildCorrelationGraph(
    assets: { symbol: string; prices: number[] }[],
    threshold: number = 0.5
  ): MarketGraph {
    const nodes = new Map<string, GraphNode>()
    const edges: GraphEdge[] = []
    
    // Create nodes
    for (const asset of assets) {
      const features = this.extractFeatures(asset.prices)
      nodes.set(asset.symbol, {
        id: asset.symbol,
        type: 'asset',
        features
      })
    }
    
    // Compute correlation matrix
    const symbols = assets.map(a => a.symbol)
    const n = symbols.length
    const adjacencyMatrix: number[][] = []
    
    for (let i = 0; i < n; i++) {
      const row: number[] = []
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row.push(1)
        } else {
          const corr = this.computeCorrelation(
            assets[i].prices,
            assets[j].prices
          )
          
          if (Math.abs(corr) >= threshold) {
            edges.push({
              source: symbols[i],
              target: symbols[j],
              type: 'correlation',
              weight: Math.abs(corr)
            })
            row.push(Math.abs(corr))
          } else {
            row.push(0)
          }
        }
      }
      adjacencyMatrix.push(row)
    }
    
    return { nodes, edges, adjacencyMatrix }
  }

  /**
   * Add market factors to graph
   */
  addFactors(
    graph: MarketGraph,
    factors: { name: string; type: string; values: number[] }[]
  ): void {
    for (const factor of factors) {
      graph.nodes.set(factor.name, {
        id: factor.name,
        type: 'factor',
        features: this.normalize(factor.values)
      })
    }
  }

  /**
   * Add trading signals to graph
   */
  addSignals(
    graph: MarketGraph,
    signals: { id: string; symbol: string; direction: number; confidence: number }[]
  ): void {
    for (const signal of signals) {
      graph.nodes.set(signal.id, {
        id: signal.id,
        type: 'signal',
        features: [signal.direction, signal.confidence]
      })
      
      // Connect signal to asset
      graph.edges.push({
        source: signal.id,
        target: signal.symbol,
        type: 'causality',
        weight: signal.confidence
      })
    }
  }

  private extractFeatures(prices: number[]): number[] {
    const returns: number[] = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const std = Math.sqrt(
      returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
    )
    
    const momentum = returns.slice(-10).reduce((a, b) => a + b, 0)
    const volatility = std
    
    // Price position (current relative to range)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const position = (prices[prices.length - 1] - min) / (max - min)
    
    return [mean, volatility, momentum, position, std]
  }

  private computeCorrelation(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length)
    if (n < 2) return 0
    
    const meanA = a.reduce((s, v) => s + v, 0) / a.length
    const meanB = b.reduce((s, v) => s + v, 0) / b.length
    
    let cov = 0
    let varA = 0
    let varB = 0
    
    for (let i = 0; i < n; i++) {
      const da = a[i] - meanA
      const db = b[i] - meanB
      cov += da * db
      varA += da * da
      varB += db * db
    }
    
    return cov / Math.sqrt(varA * varB)
  }

  private normalize(values: number[]): number[] {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const std = Math.sqrt(
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    )
    
    return values.map(v => std > 0 ? (v - mean) / std : 0)
  }
}

// ============================================================================
// Graph Neural Network
// ============================================================================

export class GraphNeuralNetwork {
  private config: GraphConfig
  private convLayers: (GraphConvLayer | GraphAttentionLayer)[]
  private readout: number[][]

  constructor(config: Partial<GraphConfig> = {}) {
    this.config = {
      nodeFeatureSize: 5,
      hiddenSize: 64,
      numLayers: 3,
      numHeads: 4,
      outputSize: 3,
      dropout: 0.1,
      learningRate: 0.001,
      ...config
    }

    // Build layers
    this.convLayers = []
    
    let inSize = this.config.nodeFeatureSize
    for (let i = 0; i < this.config.numLayers; i++) {
      if (i % 2 === 0) {
        this.convLayers.push(new GraphAttentionLayer(
          inSize,
          this.config.hiddenSize,
          this.config.numHeads
        ))
      } else {
        this.convLayers.push(new GraphConvLayer(
          inSize,
          this.config.hiddenSize
        ))
      }
      inSize = this.config.hiddenSize
    }

    // Readout layer for graph-level prediction
    const scale = Math.sqrt(2 / this.config.hiddenSize)
    this.readout = []
    for (let i = 0; i < this.config.hiddenSize; i++) {
      const row: number[] = []
      for (let j = 0; j < this.config.outputSize; j++) {
        row.push((Math.random() - 0.5) * scale)
      }
      this.readout.push(row)
    }
  }

  /**
   * Forward pass
   */
  forward(graph: MarketGraph): GNNOutput {
    // Get node features as matrix
    const nodeIds = Array.from(graph.nodes.keys())
    let nodeFeatures: number[][] = nodeIds.map(id => 
      graph.nodes.get(id)!.features
    )
    
    // Apply convolution layers
    const attentionWeights: number[][][] = []
    
    for (const layer of this.convLayers) {
      if (layer instanceof GraphAttentionLayer) {
        const result = layer.forward(nodeFeatures, graph.adjacencyMatrix)
        nodeFeatures = result.output
        attentionWeights.push(...result.attention)
      } else {
        nodeFeatures = layer.forward(nodeFeatures, graph.adjacencyMatrix)
      }
    }
    
    // Create node embeddings
    const nodeEmbeddings = new Map<string, number[]>()
    for (let i = 0; i < nodeIds.length; i++) {
      nodeEmbeddings.set(nodeIds[i], nodeFeatures[i])
      graph.nodes.get(nodeIds[i])!.embedding = nodeFeatures[i]
    }
    
    // Graph-level readout (mean pooling)
    const graphEmbedding: number[] = new Array(this.config.hiddenSize).fill(0)
    for (const features of nodeFeatures) {
      for (let i = 0; i < features.length; i++) {
        graphEmbedding[i] += features[i]
      }
    }
    for (let i = 0; i < graphEmbedding.length; i++) {
      graphEmbedding[i] /= nodeFeatures.length
    }
    
    // Predictions
    const graphPred = this.matmul([graphEmbedding], this.readout)[0]
    const expPred = graphPred.map(p => Math.exp(p - Math.max(...graphPred)))
    const sum = expPred.reduce((a, b) => a + b, 0)
    const graphProbs = expPred.map(p => p / sum)
    
    // Node-level predictions
    const nodePred: Record<string, number[]> = {}
    for (const [id, embedding] of nodeEmbeddings) {
      const pred = this.matmul([embedding], this.readout)[0]
      const exp = pred.map(p => Math.exp(p - Math.max(...pred)))
      const s = exp.reduce((a, b) => a + b, 0)
      nodePred[id] = exp.map(p => p / s)
    }
    
    return {
      nodeEmbeddings,
      graphEmbedding,
      predictions: {
        node: nodePred,
        graph: graphProbs
      },
      attentionWeights
    }
  }

  /**
   * Analyze market state
   */
  analyzeMarket(graph: MarketGraph): {
    marketDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    confidence: number
    assetPredictions: Record<string, { direction: string; confidence: number }>
    influentialAssets: string[]
  } {
    const result = this.forward(graph)
    
    // Graph-level prediction
    const graphPred = result.predictions.graph
    const maxIdx = graphPred.indexOf(Math.max(...graphPred))
    const directions = ['BULLISH', 'BEARISH', 'NEUTRAL'] as const
    
    // Asset-level predictions
    const assetPredictions: Record<string, { direction: string; confidence: number }> = {}
    for (const [id, probs] of Object.entries(result.predictions.node)) {
      if (graph.nodes.get(id)?.type === 'asset') {
        const maxIdx = probs.indexOf(Math.max(...probs))
        assetPredictions[id] = {
          direction: directions[maxIdx],
          confidence: probs[maxIdx]
        }
      }
    }
    
    // Find most influential assets (highest attention)
    const influentialAssets = this.findInfluentialAssets(result.nodeEmbeddings, graph.edges)
    
    return {
      marketDirection: directions[maxIdx],
      confidence: graphPred[maxIdx],
      assetPredictions,
      influentialAssets
    }
  }

  private findInfluentialAssets(
    embeddings: Map<string, number[]>,
    edges: GraphEdge[]
  ): string[] {
    // Count edge weights per asset
    const influence: Record<string, number> = {}
    
    for (const edge of edges) {
      influence[edge.source] = (influence[edge.source] || 0) + edge.weight
      influence[edge.target] = (influence[edge.target] || 0) + edge.weight
    }
    
    // Sort by influence
    return Object.entries(influence)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)
  }

  private matmul(a: number[][], b: number[][]): number[][] {
    const result: number[][] = []
    const cols = b[0].length
    
    for (let i = 0; i < a.length; i++) {
      const row: number[] = []
      for (let j = 0; j < cols; j++) {
        let sum = 0
        for (let k = 0; k < a[0].length; k++) {
          sum += a[i][k] * b[k][j]
        }
        row.push(sum)
      }
      result.push(row)
    }
    
    return result
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMarketGNN(
  config: Partial<GraphConfig> = {}
): GraphNeuralNetwork {
  return new GraphNeuralNetwork(config)
}

export function createMarketGraphBuilder(): MarketGraphBuilder {
  return new MarketGraphBuilder()
}
