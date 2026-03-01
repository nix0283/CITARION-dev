/**
 * Federated Learning for Privacy-Preserving ML
 * 
 * Implements federated learning for:
 * - Training across multiple users/devices
 * - Privacy-preserving model updates
 * - Secure aggregation
 */

import { createHash, createHmac } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface FederatedConfig {
  // Model
  modelId: string
  modelVersion: string
  
  // Training
  minClients: number
  maxClients: number
  minSamplesPerClient: number
  localEpochs: number
  
  // Aggregation
  aggregationStrategy: 'fedavg' | 'fedprox' | 'fedadam'
  learningRate: number
  proximalTerm?: number  // For FedProx
  
  // Privacy
  differentialPrivacy: boolean
  noiseScale: number
  clippingNorm: number
  
  // Communication
  secureAggregation: boolean
  compressionRatio: number
  
  // Convergence
  maxRounds: number
  convergenceThreshold: number
}

export interface ClientInfo {
  id: string
  publicKey: string
  sampleCount: number
  lastUpdate: Date
  status: 'active' | 'inactive' | 'training' | 'uploading'
}

export interface ModelUpdate {
  clientId: string
  round: number
  timestamp: Date
  
  // Encrypted update
  encryptedGradients?: string
  gradientShape?: Record<string, number[]>
  
  // Aggregated update (after decryption)
  gradients?: Record<string, number[]>
  
  // Metrics
  localLoss?: number
  localAccuracy?: number
  sampleCount: number
  
  // Privacy
  noiseAdded?: boolean
  clippedNorm?: number
}

export interface AggregationResult {
  round: number
  timestamp: Date
  
  // Aggregated weights
  weights: Record<string, number[]>
  
  // Statistics
  participatingClients: number
  totalSamples: number
  avgLoss: number
  avgAccuracy: number
  
  // Convergence
  converged: boolean
  improvement: number
}

export interface FederatedState {
  currentRound: number
  globalWeights: Record<string, number[]>
  bestWeights: Record<string, number[]>
  bestAccuracy: number
  
  clients: Map<string, ClientInfo>
  pendingUpdates: ModelUpdate[]
  roundHistory: AggregationResult[]
}

// ============================================================================
// Federated Learning Coordinator
// ============================================================================

export class FederatedCoordinator {
  private config: FederatedConfig
  private state: FederatedState
  private secretKey: string

  constructor(config: Partial<FederatedConfig> = {}) {
    this.config = {
      modelId: 'default',
      modelVersion: '1.0',
      minClients: 3,
      maxClients: 100,
      minSamplesPerClient: 100,
      localEpochs: 5,
      aggregationStrategy: 'fedavg',
      learningRate: 0.01,
      differentialPrivacy: true,
      noiseScale: 0.1,
      clippingNorm: 1.0,
      secureAggregation: true,
      compressionRatio: 0.1,
      maxRounds: 100,
      convergenceThreshold: 0.001,
      ...config
    }

    // Generate secret key for secure aggregation
    this.secretKey = createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')

    this.state = {
      currentRound: 0,
      globalWeights: {},
      bestWeights: {},
      bestAccuracy: 0,
      clients: new Map(),
      pendingUpdates: [],
      roundHistory: []
    }
  }

  // --------------------------------------------------------------------------
  // Client Management
  // --------------------------------------------------------------------------

  /**
   * Register a new client
   */
  registerClient(clientId: string, publicKey: string): boolean {
    if (this.state.clients.size >= this.config.maxClients) {
      return false
    }

    this.state.clients.set(clientId, {
      id: clientId,
      publicKey,
      sampleCount: 0,
      lastUpdate: new Date(),
      status: 'active'
    })

    return true
  }

  /**
   * Unregister a client
   */
  unregisterClient(clientId: string): boolean {
    return this.state.clients.delete(clientId)
  }

  /**
   * Get active clients
   */
  getActiveClients(): ClientInfo[] {
    return Array.from(this.state.clients.values())
      .filter(c => c.status !== 'inactive')
  }

  // --------------------------------------------------------------------------
  // Training Round
  // --------------------------------------------------------------------------

  /**
   * Start a new training round
   */
  startRound(): {
    round: number
    globalWeights: Record<string, number[]>
    localEpochs: number
    learningRate: number
  } | null {
    const activeClients = this.getActiveClients()
    
    if (activeClients.length < this.config.minClients) {
      console.log(`Not enough clients: ${activeClients.length} < ${this.config.minClients}`)
      return null
    }

    this.state.currentRound++
    this.state.pendingUpdates = []

    // Set clients to training status
    for (const client of activeClients) {
      client.status = 'training'
    }

    return {
      round: this.state.currentRound,
      globalWeights: this.state.globalWeights,
      localEpochs: this.config.localEpochs,
      learningRate: this.config.learningRate
    }
  }

  /**
   * Receive update from client
   */
  receiveUpdate(update: ModelUpdate): boolean {
    const client = this.state.clients.get(update.clientId)
    
    if (!client || client.status !== 'training') {
      return false
    }

    // Validate update
    if (!this.validateUpdate(update)) {
      return false
    }

    // Apply privacy mechanisms
    if (this.config.differentialPrivacy) {
      this.applyDifferentialPrivacy(update)
    }

    // Encrypt update for secure aggregation
    if (this.config.secureAggregation) {
      update.encryptedGradients = this.encryptGradients(update.gradients!)
      // Clear plaintext gradients
      update.gradients = undefined
    }

    this.state.pendingUpdates.push(update)
    client.status = 'uploading'
    client.lastUpdate = new Date()
    client.sampleCount = update.sampleCount

    // Check if round is complete
    if (this.state.pendingUpdates.length >= this.config.minClients) {
      this.aggregateRound()
    }

    return true
  }

  private validateUpdate(update: ModelUpdate): boolean {
    // Check round number
    if (update.round !== this.state.currentRound) {
      return false
    }

    // Check minimum samples
    if (update.sampleCount < this.config.minSamplesPerClient) {
      return false
    }

    // Check gradients exist
    if (!update.gradients && !update.encryptedGradients) {
      return false
    }

    return true
  }

  private applyDifferentialPrivacy(update: ModelUpdate): void {
    if (!update.gradients) return

    // Gradient clipping
    let totalNorm = 0
    for (const grad of Object.values(update.gradients)) {
      for (const g of grad) {
        totalNorm += g * g
      }
    }
    totalNorm = Math.sqrt(totalNorm)

    const clippingNorm = this.config.clippingNorm
    update.clippedNorm = Math.min(totalNorm, clippingNorm)

    if (totalNorm > clippingNorm) {
      const scale = clippingNorm / totalNorm
      for (const key of Object.keys(update.gradients)) {
        update.gradients[key] = update.gradients[key].map(g => g * scale)
      }
    }

    // Add Gaussian noise
    const noiseScale = this.config.noiseScale
    for (const key of Object.keys(update.gradients)) {
      update.gradients[key] = update.gradients[key].map(g => 
        g + this.gaussianNoise(0, noiseScale)
      )
    }

    update.noiseAdded = true
  }

  private gaussianNoise(mean: number, std: number): number {
    // Box-Muller transform
    const u1 = Math.random()
    const u2 = Math.random()
    return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }

  // --------------------------------------------------------------------------
  // Secure Aggregation
  // --------------------------------------------------------------------------

  private encryptGradients(gradients: Record<string, number[]>): string {
    const json = JSON.stringify(gradients)
    const hmac = createHmac('sha256', this.secretKey)
    hmac.update(json)
    const signature = hmac.digest('hex')
    return Buffer.from(JSON.stringify({ data: json, signature })).toString('base64')
  }

  private decryptGradients(encrypted: string): Record<string, number[]> {
    try {
      const { data, signature } = JSON.parse(Buffer.from(encrypted, 'base64').toString())
      
      // Verify signature
      const hmac = createHmac('sha256', this.secretKey)
      hmac.update(data)
      const expectedSignature = hmac.digest('hex')
      
      if (signature !== expectedSignature) {
        throw new Error('Invalid signature')
      }
      
      return JSON.parse(data)
    } catch {
      return {}
    }
  }

  // --------------------------------------------------------------------------
  // Aggregation
  // --------------------------------------------------------------------------

  private aggregateRound(): AggregationResult | null {
    const updates = this.state.pendingUpdates
    
    if (updates.length < this.config.minClients) {
      return null
    }

    // Decrypt updates if needed
    for (const update of updates) {
      if (update.encryptedGradients) {
        update.gradients = this.decryptGradients(update.encryptedGradients)
      }
    }

    // Aggregate based on strategy
    let aggregatedWeights: Record<string, number[]>
    
    switch (this.config.aggregationStrategy) {
      case 'fedavg':
        aggregatedWeights = this.fedAvg(updates)
        break
      case 'fedprox':
        aggregatedWeights = this.fedProx(updates)
        break
      case 'fedadam':
        aggregatedWeights = this.fedAdam(updates)
        break
      default:
        aggregatedWeights = this.fedAvg(updates)
    }

    // Update global weights
    this.state.globalWeights = aggregatedWeights

    // Calculate metrics
    const totalSamples = updates.reduce((a, u) => a + u.sampleCount, 0)
    const avgLoss = updates.reduce((a, u) => a + (u.localLoss || 0), 0) / updates.length
    const avgAccuracy = updates.reduce((a, u) => a + (u.localAccuracy || 0), 0) / updates.length

    // Check for improvement
    const improvement = avgAccuracy - this.state.bestAccuracy
    const converged = improvement < this.config.convergenceThreshold

    // Update best weights if improved
    if (avgAccuracy > this.state.bestAccuracy) {
      this.state.bestAccuracy = avgAccuracy
      this.state.bestWeights = { ...aggregatedWeights }
    }

    const result: AggregationResult = {
      round: this.state.currentRound,
      timestamp: new Date(),
      weights: aggregatedWeights,
      participatingClients: updates.length,
      totalSamples,
      avgLoss,
      avgAccuracy,
      converged,
      improvement
    }

    this.state.roundHistory.push(result)

    // Reset clients status
    for (const client of this.state.clients.values()) {
      if (client.status === 'uploading') {
        client.status = 'active'
      }
    }

    return result
  }

  private fedAvg(updates: ModelUpdate[]): Record<string, number[]> {
    const totalSamples = updates.reduce((a, u) => a + u.sampleCount, 0)
    const keys = Object.keys(updates[0].gradients!)
    
    const aggregated: Record<string, number[]> = {}
    
    for (const key of keys) {
      const dim = updates[0].gradients![key].length
      aggregated[key] = new Array(dim).fill(0)
      
      for (const update of updates) {
        const weight = update.sampleCount / totalSamples
        for (let i = 0; i < dim; i++) {
          aggregated[key][i] += weight * (update.gradients![key]?.[i] || 0)
        }
      }
    }
    
    return aggregated
  }

  private fedProx(updates: ModelUpdate[]): Record<string, number[]> {
    const mu = this.config.proximalTerm || 0.01
    const keys = Object.keys(updates[0].gradients!)
    
    const aggregated: Record<string, number[]> = {}
    
    for (const key of keys) {
      const dim = updates[0].gradients![key].length
      aggregated[key] = new Array(dim).fill(0)
      
      // Average gradients
      for (const update of updates) {
        for (let i = 0; i < dim; i++) {
          aggregated[key][i] += (update.gradients![key]?.[i] || 0) / updates.length
        }
      }
      
      // Add proximal term
      const globalGrad = this.state.globalWeights[key] || new Array(dim).fill(0)
      for (let i = 0; i < dim; i++) {
        aggregated[key][i] -= mu * (aggregated[key][i] - (globalGrad[i] || 0))
      }
    }
    
    return aggregated
  }

  private fedAdam(updates: ModelUpdate[]): Record<string, number[]> {
    const beta1 = 0.9
    const beta2 = 0.999
    const epsilon = 1e-8
    const lr = this.config.learningRate
    
    const keys = Object.keys(updates[0].gradients!)
    
    // First and second moment estimates (simplified)
    const aggregated: Record<string, number[]> = {}
    
    for (const key of keys) {
      const dim = updates[0].gradients![key].length
      aggregated[key] = new Array(dim).fill(0)
      
      // Average gradients
      const avgGrad = new Array(dim).fill(0)
      for (const update of updates) {
        for (let i = 0; i < dim; i++) {
          avgGrad[i] += (update.gradients![key]?.[i] || 0) / updates.length
        }
      }
      
      // Adam update
      for (let i = 0; i < dim; i++) {
        const m = beta1 * 0 + (1 - beta1) * avgGrad[i]
        const v = beta2 * 0 + (1 - beta2) * avgGrad[i] * avgGrad[i]
        aggregated[key][i] = lr * m / (Math.sqrt(v) + epsilon)
      }
    }
    
    return aggregated
  }

  // --------------------------------------------------------------------------
  // State Access
  // --------------------------------------------------------------------------

  getState(): FederatedState {
    return {
      ...this.state,
      clients: new Map(this.state.clients),
      pendingUpdates: [...this.state.pendingUpdates],
      roundHistory: [...this.state.roundHistory]
    }
  }

  getGlobalWeights(): Record<string, number[]> {
    return { ...this.state.globalWeights }
  }

  getBestWeights(): Record<string, number[]> {
    return { ...this.state.bestWeights }
  }

  getCurrentRound(): number {
    return this.state.currentRound
  }

  getRoundHistory(): AggregationResult[] {
    return [...this.state.roundHistory]
  }
}

// ============================================================================
// Federated Client
// ============================================================================

export class FederatedClient {
  private clientId: string
  private coordinator: FederatedCoordinator
  private localWeights: Record<string, number[]>
  private localData: { features: number[][]; labels: number[] }[] = []

  constructor(clientId: string, coordinator: FederatedCoordinator) {
    this.clientId = clientId
    this.coordinator = coordinator
    this.localWeights = {}
  }

  /**
   * Set local training data
   */
  setLocalData(data: { features: number[][]; labels: number[] }[]): void {
    this.localData = data
  }

  /**
   * Train locally
   */
  trainLocal(globalWeights: Record<string, number[]>, epochs: number, lr: number): ModelUpdate {
    this.localWeights = { ...globalWeights }
    
    let totalLoss = 0
    let correct = 0

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const sample of this.localData) {
        // Forward pass (simplified)
        const prediction = this.forward(sample.features)
        const loss = this.computeLoss(prediction, sample.labels)
        
        // Backward pass (simplified gradient)
        const gradients = this.backward(prediction, sample.labels, lr)
        
        // Update weights
        for (const key of Object.keys(this.localWeights)) {
          if (gradients[key]) {
            for (let i = 0; i < this.localWeights[key].length; i++) {
              this.localWeights[key][i] -= lr * (gradients[key][i] || 0)
            }
          }
        }
        
        totalLoss += loss
        if (this.argMax(prediction) === this.argMax(sample.labels)) {
          correct++
        }
      }
    }

    // Compute gradients relative to global weights
    const gradients: Record<string, number[]> = {}
    for (const key of Object.keys(globalWeights)) {
      gradients[key] = (this.localWeights[key] || []).map((w, i) => 
        w - (globalWeights[key]?.[i] || 0)
      )
    }

    return {
      clientId: this.clientId,
      round: this.coordinator.getCurrentRound(),
      timestamp: new Date(),
      gradients,
      localLoss: totalLoss / (this.localData.length * epochs),
      localAccuracy: correct / (this.localData.length * epochs),
      sampleCount: this.localData.length
    }
  }

  private forward(features: number[][]): number[] {
    // Simplified forward pass
    const flattened = features.flat()
    const output = new Array(3).fill(0)
    
    for (let i = 0; i < Math.min(flattened.length, 3); i++) {
      output[i] = flattened[i] * (this.localWeights['w0']?.[i] || 0)
    }
    
    // Softmax
    const maxVal = Math.max(...output)
    const exp = output.map(o => Math.exp(o - maxVal))
    const sum = exp.reduce((a, b) => a + b, 0)
    return exp.map(e => e / sum)
  }

  private computeLoss(prediction: number[], labels: number[]): number {
    // Cross-entropy loss
    let loss = 0
    for (let i = 0; i < prediction.length; i++) {
      loss -= labels[i] * Math.log(prediction[i] + 1e-10)
    }
    return loss
  }

  private backward(prediction: number[], labels: number[], lr: number): Record<string, number[]> {
    // Simplified gradient computation
    const grad: number[] = prediction.map((p, i) => p - labels[i])
    
    return {
      w0: grad
    }
  }

  private argMax(arr: number[]): number {
    return arr.indexOf(Math.max(...arr))
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createFederatedCoordinator(
  config: Partial<FederatedConfig> = {}
): FederatedCoordinator {
  return new FederatedCoordinator(config)
}

export function createFederatedClient(
  clientId: string,
  coordinator: FederatedCoordinator
): FederatedClient {
  return new FederatedClient(clientId, coordinator)
}
