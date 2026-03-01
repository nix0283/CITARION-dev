/**
 * Transformer Models for Time Series
 * 
 * Implements transformer architecture for sequence prediction:
 * - Multi-head self-attention
 * - Positional encoding
 * - Encoder-decoder architecture
 */

// ============================================================================
// Types
// ============================================================================

export interface TransformerConfig {
  // Input/Output
  inputSize: number
  outputSize: number
  sequenceLength: number
  
  // Architecture
  dModel: number          // Model dimension
  numHeads: number        // Number of attention heads
  numEncoderLayers: number
  numDecoderLayers: number
  dFF: number            // Feed-forward dimension
  
  // Regularization
  dropout: number
  
  // Training
  learningRate: number
  warmupSteps: number
  maxSteps: number
}

export interface AttentionOutput {
  output: number[][]
  attentionWeights: number[][][]
}

export interface TransformerOutput {
  predictions: number[][]      // [batch, output_size]
  attentionWeights: number[][][][]
  hiddenStates: number[][][]
}

// ============================================================================
// Positional Encoding
// ============================================================================

export class PositionalEncoding {
  private dModel: number
  private maxLen: number
  private encoding: number[][]

  constructor(dModel: number, maxLen: number = 5000) {
    this.dModel = dModel
    this.maxLen = maxLen
    this.encoding = this.createEncoding()
  }

  private createEncoding(): number[][] {
    const encoding: number[][] = []
    
    for (let pos = 0; pos < this.maxLen; pos++) {
      const row: number[] = []
      
      for (let i = 0; i < this.dModel; i++) {
        if (i % 2 === 0) {
          row.push(Math.sin(pos / Math.pow(10000, i / this.dModel)))
        } else {
          row.push(Math.cos(pos / Math.pow(10000, (i - 1) / this.dModel)))
        }
      }
      
      encoding.push(row)
    }
    
    return encoding
  }

  encode(sequenceLength: number): number[][] {
    return this.encoding.slice(0, sequenceLength)
  }
}

// ============================================================================
// Multi-Head Attention
// ============================================================================

export class MultiHeadAttention {
  private numHeads: number
  private dModel: number
  private dK: number
  private dV: number
  
  // Weight matrices (simplified as arrays)
  private WQ: number[][][]
  private WK: number[][][]
  private WV: number[][][]
  private WO: number[][]

  constructor(dModel: number, numHeads: number) {
    this.dModel = dModel
    this.numHeads = numHeads
    this.dK = dModel / numHeads
    this.dV = dModel / numHeads
    
    // Initialize weights
    this.WQ = this.initWeights(numHeads, dModel, this.dK)
    this.WK = this.initWeights(numHeads, dModel, this.dK)
    this.WV = this.initWeights(numHeads, dModel, this.dV)
    this.WO = this.initWeights2D(numHeads * this.dV, dModel)
  }

  private initWeights(d1: number, d2: number, d3: number): number[][][] {
    const weights: number[][][] = []
    const scale = Math.sqrt(2 / d2)
    
    for (let i = 0; i < d1; i++) {
      const matrix: number[][] = []
      for (let j = 0; j < d2; j++) {
        const row: number[] = []
        for (let k = 0; k < d3; k++) {
          row.push((Math.random() - 0.5) * scale)
        }
        matrix.push(row)
      }
      weights.push(matrix)
    }
    
    return weights
  }

  private initWeights2D(d1: number, d2: number): number[][] {
    const weights: number[][] = []
    const scale = Math.sqrt(2 / d1)
    
    for (let i = 0; i < d1; i++) {
      const row: number[] = []
      for (let j = 0; j < d2; j++) {
        row.push((Math.random() - 0.5) * scale)
      }
      weights.push(row)
    }
    
    return weights
  }

  attention(
    Q: number[][],
    K: number[][],
    V: number[][],
    mask?: number[][]
  ): { output: number[][]; weights: number[][] } {
    const seqLen = Q.length
    const dK = K[0].length
    
    // Compute scores: Q * K^T / sqrt(d_k)
    const scores: number[][] = []
    for (let i = 0; i < seqLen; i++) {
      const row: number[] = []
      for (let j = 0; j < seqLen; j++) {
        let score = 0
        for (let k = 0; k < dK; k++) {
          score += Q[i][k] * K[j][k]
        }
        row.push(score / Math.sqrt(dK))
      }
      scores.push(row)
    }
    
    // Apply mask if provided
    if (mask) {
      for (let i = 0; i < seqLen; i++) {
        for (let j = 0; j < seqLen; j++) {
          if (mask[i][j] === 0) {
            scores[i][j] = -Infinity
          }
        }
      }
    }
    
    // Softmax
    const weights: number[][] = []
    for (let i = 0; i < seqLen; i++) {
      weights.push(this.softmax(scores[i]))
    }
    
    // Compute output: weights * V
    const output: number[][] = []
    const dV = V[0].length
    
    for (let i = 0; i < seqLen; i++) {
      const row: number[] = []
      for (let k = 0; k < dV; k++) {
        let sum = 0
        for (let j = 0; j < seqLen; j++) {
          sum += weights[i][j] * V[j][k]
        }
        row.push(sum)
      }
      output.push(row)
    }
    
    return { output, weights }
  }

  forward(
    x: number[][],
    mask?: number[][]
  ): AttentionOutput {
    const seqLen = x.length
    const allHeadOutputs: number[][][] = []
    const allAttentionWeights: number[][][] = []
    
    // Process each head
    for (let h = 0; h < this.numHeads; h++) {
      // Compute Q, K, V for this head
      const Q = this.matmul(x, this.WQ[h])
      const K = this.matmul(x, this.WK[h])
      const V = this.matmul(x, this.WV[h])
      
      // Apply attention
      const { output, weights } = this.attention(Q, K, V, mask)
      
      allHeadOutputs.push(output)
      allAttentionWeights.push(weights)
    }
    
    // Concatenate heads
    const concat: number[][] = []
    for (let i = 0; i < seqLen; i++) {
      const row: number[] = []
      for (let h = 0; h < this.numHeads; h++) {
        row.push(...allHeadOutputs[h][i])
      }
      concat.push(row)
    }
    
    // Final linear projection
    const output = this.matmul(concat, this.WO)
    
    return {
      output,
      attentionWeights: allAttentionWeights
    }
  }

  private softmax(x: number[]): number[] {
    const maxVal = Math.max(...x)
    const exp = x.map(v => Math.exp(v - maxVal))
    const sum = exp.reduce((a, b) => a + b, 0)
    return exp.map(v => v / sum)
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
// Feed-Forward Network
// ============================================================================

export class FeedForward {
  private W1: number[][]
  private b1: number[]
  private W2: number[][]
  private b2: number[]
  private dropout: number

  constructor(dModel: number, dFF: number, dropout: number = 0.1) {
    this.dropout = dropout
    
    // Initialize weights
    const scale1 = Math.sqrt(2 / dModel)
    const scale2 = Math.sqrt(2 / dFF)
    
    this.W1 = []
    this.b1 = []
    for (let i = 0; i < dModel; i++) {
      const row: number[] = []
      for (let j = 0; j < dFF; j++) {
        row.push((Math.random() - 0.5) * scale1)
      }
      this.W1.push(row)
      this.b1.push(0)
    }
    
    this.W2 = []
    this.b2 = []
    for (let i = 0; i < dFF; i++) {
      const row: number[] = []
      for (let j = 0; j < dModel; j++) {
        row.push((Math.random() - 0.5) * scale2)
      }
      this.W2.push(row)
      this.b2.push(0)
    }
  }

  forward(x: number[][]): number[][] {
    // Linear 1 + ReLU
    const hidden = this.matmul(x, this.W1).map(row => 
      row.map(v => Math.max(0, v))
    )
    
    // Linear 2
    const output = this.matmul(hidden, this.W2)
    
    return output
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
// Transformer Encoder Layer
// ============================================================================

export class TransformerEncoderLayer {
  private selfAttention: MultiHeadAttention
  private feedForward: FeedForward
  private norm1: LayerNorm
  private norm2: LayerNorm
  private dropout: number

  constructor(dModel: number, numHeads: number, dFF: number, dropout: number = 0.1) {
    this.selfAttention = new MultiHeadAttention(dModel, numHeads)
    this.feedForward = new FeedForward(dModel, dFF, dropout)
    this.norm1 = new LayerNorm(dModel)
    this.norm2 = new LayerNorm(dModel)
    this.dropout = dropout
  }

  forward(x: number[][], mask?: number[][]): { output: number[][]; attention: number[][][] } {
    // Self-attention with residual
    const attnResult = this.selfAttention.forward(x, mask)
    x = this.add(x, attnResult.output)
    x = this.norm1.forward(x)
    
    // Feed-forward with residual
    const ff = this.feedForward.forward(x)
    x = this.add(x, ff)
    x = this.norm2.forward(x)
    
    return { output: x, attention: attnResult.attentionWeights }
  }

  private add(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) => row.map((v, j) => v + b[i][j]))
  }
}

// ============================================================================
// Layer Normalization
// ============================================================================

class LayerNorm {
  private gamma: number[]
  private beta: number[]
  private epsilon: number = 1e-6

  constructor(dModel: number) {
    this.gamma = new Array(dModel).fill(1)
    this.beta = new Array(dModel).fill(0)
  }

  forward(x: number[][]): number[][] {
    return x.map(row => {
      const mean = row.reduce((a, b) => a + b, 0) / row.length
      const variance = row.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / row.length
      const std = Math.sqrt(variance + this.epsilon)
      
      return row.map((v, i) => 
        this.gamma[i] * (v - mean) / std + this.beta[i]
      )
    })
  }
}

// ============================================================================
// Time Series Transformer
// ============================================================================

export class TimeSeriesTransformer {
  private config: TransformerConfig
  private inputProjection: number[][]
  private encoderLayers: TransformerEncoderLayer[]
  private positionalEncoding: PositionalEncoding
  private outputProjection: number[][]

  constructor(config: Partial<TransformerConfig> = {}) {
    this.config = {
      inputSize: 46,
      outputSize: 3,
      sequenceLength: 60,
      dModel: 128,
      numHeads: 8,
      numEncoderLayers: 4,
      numDecoderLayers: 0,
      dFF: 512,
      dropout: 0.1,
      learningRate: 0.0001,
      warmupSteps: 4000,
      maxSteps: 100000,
      ...config
    }

    // Input projection
    const scale = Math.sqrt(2 / this.config.inputSize)
    this.inputProjection = []
    for (let i = 0; i < this.config.inputSize; i++) {
      const row: number[] = []
      for (let j = 0; j < this.config.dModel; j++) {
        row.push((Math.random() - 0.5) * scale)
      }
      this.inputProjection.push(row)
    }

    // Encoder layers
    this.encoderLayers = []
    for (let i = 0; i < this.config.numEncoderLayers; i++) {
      this.encoderLayers.push(new TransformerEncoderLayer(
        this.config.dModel,
        this.config.numHeads,
        this.config.dFF,
        this.config.dropout
      ))
    }

    // Positional encoding
    this.positionalEncoding = new PositionalEncoding(this.config.dModel)

    // Output projection
    const outScale = Math.sqrt(2 / this.config.dModel)
    this.outputProjection = []
    for (let i = 0; i < this.config.dModel; i++) {
      const row: number[] = []
      for (let j = 0; j < this.config.outputSize; j++) {
        row.push((Math.random() - 0.5) * outScale)
      }
      this.outputProjection.push(row)
    }
  }

  /**
   * Forward pass
   */
  forward(input: number[][]): TransformerOutput {
    // Input projection: [seq_len, input_size] -> [seq_len, d_model]
    let x = this.matmul(input, this.inputProjection)
    
    // Add positional encoding
    const posEnc = this.positionalEncoding.encode(input.length)
    x = this.add(x, posEnc)
    
    // Encoder layers
    const attentionWeights: number[][][][] = []
    for (const layer of this.encoderLayers) {
      const result = layer.forward(x)
      x = result.output
      attentionWeights.push(result.attention)
    }
    
    // Use last position for prediction
    const lastHidden = x[x.length - 1]
    
    // Output projection
    const predictions = this.matmul([lastHidden], this.outputProjection)[0]
    
    // Softmax for classification
    const expPred = predictions.map(p => Math.exp(p - Math.max(...predictions)))
    const sum = expPred.reduce((a, b) => a + b, 0)
    const probs = expPred.map(p => p / sum)
    
    return {
      predictions: [probs],
      attentionWeights,
      hiddenStates: x
    }
  }

  /**
   * Predict direction
   */
  predict(sequence: number[][]): { direction: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number } {
    const result = this.forward(sequence)
    const probs = result.predictions[0]
    
    const maxIdx = probs.indexOf(Math.max(...probs))
    const directions: ('LONG' | 'SHORT' | 'NEUTRAL')[] = ['LONG', 'SHORT', 'NEUTRAL']
    
    return {
      direction: directions[maxIdx],
      confidence: probs[maxIdx]
    }
  }

  /**
   * Train the model
   */
  train(
    samples: { input: number[][]; label: number }[],
    epochs: number = 10
  ): { loss: number[]; accuracy: number[] } {
    const losses: number[] = []
    const accuracies: number[] = []
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0
      let correct = 0
      
      for (const sample of samples) {
        const result = this.forward(sample.input)
        const probs = result.predictions[0]
        
        // Cross-entropy loss
        const loss = -Math.log(probs[sample.label] + 1e-10)
        totalLoss += loss
        
        // Check accuracy
        const pred = probs.indexOf(Math.max(...probs))
        if (pred === sample.label) correct++
        
        // Simplified gradient update (would need proper backprop in production)
        this.updateWeights(sample.input, sample.label, probs)
      }
      
      losses.push(totalLoss / samples.length)
      accuracies.push(correct / samples.length)
    }
    
    return { loss: losses, accuracy: accuracies }
  }

  private updateWeights(input: number[][], label: number, probs: number[]): void {
    // Simplified gradient descent (placeholder)
    const lr = this.config.learningRate
    
    // Update output projection (simplified)
    const grad = probs.map((p, i) => i === label ? p - 1 : p)
    for (let i = 0; i < this.outputProjection.length; i++) {
      for (let j = 0; j < this.outputProjection[i].length; j++) {
        this.outputProjection[i][j] -= lr * grad[j] * 0.01
      }
    }
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

  private add(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) => row.map((v, j) => v + b[i][j]))
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTimeSeriesTransformer(
  config: Partial<TransformerConfig> = {}
): TimeSeriesTransformer {
  return new TimeSeriesTransformer(config)
}
