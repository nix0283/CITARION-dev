/**
 * Reinforcement Learning for Trading
 * 
 * Q-learning and policy gradient methods for trading decisions.
 * Implements environment, agent, and training loop.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Trading environment state
 */
export interface TradingState {
  // Market state
  price: number
  position: number       // -1, 0, 1 (short, neutral, long)
  balance: number
  equity: number
  
  // Market features
  returns: number[]
  volatility: number
  momentum: number
  trend: number
  
  // Account state
  unrealizedPnl: number
  drawdown: number
  margin: number
  
  // Time features
  hour: number
  dayOfWeek: number
  
  // Technical features
  rsi: number
  macd: number
  adx: number
  
  // Full feature vector
  features: number[]
}

/**
 * Trading action
 */
export type TradingAction = 'LONG' | 'SHORT' | 'CLOSE' | 'HOLD'

/**
 * Trading environment configuration
 */
export interface TradingEnvConfig {
  // Initial state
  initialBalance: number
  
  // Trading costs
  commission: number      // Commission per trade
  slippage: number        // Slippage per trade
  
  // Position limits
  maxPosition: number     // Maximum position size
  
  // Reward configuration
  rewardScaling: number   // Scale factor for rewards
  penaltyFactor: number   // Penalty for losses
  drawdownPenalty: number // Penalty for drawdown
  
  // Episode configuration
  maxSteps: number        // Maximum steps per episode
  targetReturn: number    // Target return for success
}

/**
 * Default environment configuration
 */
export const DEFAULT_ENV_CONFIG: TradingEnvConfig = {
  initialBalance: 10000,
  commission: 0.001,      // 0.1%
  slippage: 0.0005,       // 0.05%
  maxPosition: 1,
  rewardScaling: 100,
  penaltyFactor: 1.5,
  drawdownPenalty: 2.0,
  maxSteps: 1000,
  targetReturn: 0.1,      // 10% return
}

/**
 * Environment step result
 */
export interface StepResult {
  state: TradingState
  reward: number
  done: boolean
  info: {
    pnl: number
    equity: number
    trade?: {
      action: TradingAction
      price: number
      size: number
    }
  }
}

/**
 * Q-learning agent configuration
 */
export interface QLearningConfig {
  // Learning parameters
  learningRate: number     // Alpha
  discountFactor: number   // Gamma
  explorationRate: number  // Epsilon
  explorationDecay: number // Epsilon decay
  minExploration: number   // Minimum epsilon
  
  // State discretization
  stateBins: number        // Number of bins per feature
  
  // Experience replay
  replayBufferSize: number
  batchSize: number
  
  // Training
  trainFrequency: number   // Steps between training
  targetUpdateFrequency: number // Steps between target network updates
}

/**
 * Default Q-learning configuration
 */
export const DEFAULT_QL_CONFIG: QLearningConfig = {
  learningRate: 0.001,
  discountFactor: 0.99,
  explorationRate: 1.0,
  explorationDecay: 0.995,
  minExploration: 0.01,
  stateBins: 10,
  replayBufferSize: 10000,
  batchSize: 32,
  trainFrequency: 4,
  targetUpdateFrequency: 1000,
}

/**
 * Experience tuple
 */
interface Experience {
  state: number[]
  action: number
  reward: number
  nextState: number[]
  done: boolean
}

// ============================================================================
// TRADING ENVIRONMENT
// ============================================================================

/**
 * Simulated trading environment
 */
export class TradingEnvironment {
  private config: TradingEnvConfig
  private prices: number[]
  private currentStep: number = 0
  private balance: number
  private position: number = 0
  private entryPrice: number = 0
  private maxEquity: number
  private trades: Array<{
    step: number
    action: TradingAction
    price: number
    pnl: number
  }> = []
  
  constructor(
    prices: number[],
    config: Partial<TradingEnvConfig> = {}
  ) {
    this.config = { ...DEFAULT_ENV_CONFIG, ...config }
    this.prices = prices
    this.balance = this.config.initialBalance
    this.maxEquity = this.balance
  }
  
  /**
   * Reset environment
   */
  reset(): TradingState {
    this.currentStep = 0
    this.balance = this.config.initialBalance
    this.position = 0
    this.entryPrice = 0
    this.maxEquity = this.balance
    this.trades = []
    
    return this.getState()
  }
  
  /**
   * Take a step in the environment
   */
  step(action: TradingAction): StepResult {
    const prevPrice = this.prices[this.currentStep]
    const trade = this.executeAction(action, prevPrice)
    
    this.currentStep++
    
    const done = this.currentStep >= this.prices.length - 1 || 
                 this.currentStep >= this.config.maxSteps
    
    const nextPrice = this.prices[this.currentStep]
    const state = this.getState()
    
    // Calculate reward
    const reward = this.calculateReward(trade, prevPrice, nextPrice)
    
    // Update max equity
    const equity = this.calculateEquity(nextPrice)
    this.maxEquity = Math.max(this.maxEquity, equity)
    
    return {
      state,
      reward,
      done,
      info: {
        pnl: trade?.pnl || 0,
        equity,
        trade: trade ? {
          action: trade.action,
          price: trade.price,
          size: Math.abs(this.position),
        } : undefined,
      },
    }
  }
  
  /**
   * Execute trading action
   */
  private executeAction(
    action: TradingAction,
    price: number
  ): { action: TradingAction; price: number; pnl: number } | undefined {
    let pnl = 0
    
    switch (action) {
      case 'LONG':
        if (this.position !== 1) {
          // Close existing position
          if (this.position !== 0) {
            pnl = this.closePosition(price)
          }
          // Open long
          this.position = 1
          this.entryPrice = price * (1 + this.config.slippage)
        }
        break
        
      case 'SHORT':
        if (this.position !== -1) {
          // Close existing position
          if (this.position !== 0) {
            pnl = this.closePosition(price)
          }
          // Open short
          this.position = -1
          this.entryPrice = price * (1 - this.config.slippage)
        }
        break
        
      case 'CLOSE':
        if (this.position !== 0) {
          pnl = this.closePosition(price)
          this.position = 0
        }
        break
        
      case 'HOLD':
        // No action
        break
    }
    
    if (pnl !== 0) {
      this.trades.push({
        step: this.currentStep,
        action,
        price,
        pnl,
      })
    }
    
    return pnl !== 0 ? { action, price, pnl } : undefined
  }
  
  /**
   * Close position
   */
  private closePosition(price: number): number {
    if (this.position === 0) return 0
    
    const exitPrice = this.position > 0
      ? price * (1 - this.config.slippage)
      : price * (1 + this.config.slippage)
    
    const pnl = this.position * (exitPrice - this.entryPrice)
    const commission = Math.abs(pnl) * this.config.commission
    
    const netPnl = pnl - commission
    this.balance += netPnl
    
    return netPnl
  }
  
  /**
   * Calculate reward
   */
  private calculateReward(
    trade: { action: TradingAction; price: number; pnl: number } | undefined,
    prevPrice: number,
    nextPrice: number
  ): number {
    // Position PnL
    const positionPnl = this.position * (nextPrice - prevPrice)
    
    // Base reward from position PnL
    let reward = positionPnl * this.config.rewardScaling
    
    // Add trade PnL if trade occurred
    if (trade) {
      reward += trade.pnl * this.config.rewardScaling
    }
    
    // Drawdown penalty
    const equity = this.calculateEquity(nextPrice)
    const drawdown = (this.maxEquity - equity) / this.maxEquity
    if (drawdown > 0) {
      reward -= drawdown * this.config.drawdownPenalty
    }
    
    // Loss penalty
    if (reward < 0) {
      reward *= this.config.penaltyFactor
    }
    
    return reward
  }
  
  /**
   * Get current state
   */
  private getState(): TradingState {
    const currentPrice = this.prices[this.currentStep]
    const equity = this.calculateEquity(currentPrice)
    
    // Calculate features
    const lookback = Math.min(20, this.currentStep)
    const recentPrices = this.prices.slice(this.currentStep - lookback, this.currentStep + 1)
    
    const returns = []
    for (let i = 1; i < recentPrices.length; i++) {
      returns.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1])
    }
    
    // Build state
    const state: TradingState = {
      price: currentPrice,
      position: this.position,
      balance: this.balance,
      equity,
      returns,
      volatility: this.calculateVolatility(returns),
      momentum: returns.length > 0 ? returns.reduce((a, b) => a + b, 0) : 0,
      trend: this.calculateTrend(recentPrices),
      unrealizedPnl: this.position * (currentPrice - this.entryPrice),
      drawdown: (this.maxEquity - equity) / this.maxEquity,
      margin: equity / this.config.initialBalance - 1,
      hour: new Date().getUTCHours(),
      dayOfWeek: new Date().getUTCDay(),
      rsi: this.calculateRSI(recentPrices),
      macd: 0, // Simplified
      adx: 0,  // Simplified
      features: [],
    }
    
    // Build feature vector
    state.features = this.buildFeatureVector(state)
    
    return state
  }
  
  /**
   * Calculate equity
   */
  private calculateEquity(price: number): number {
    return this.balance + this.position * (price - this.entryPrice)
  }
  
  /**
   * Calculate volatility
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance)
  }
  
  /**
   * Calculate trend
   */
  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0
    
    const n = prices.length
    const sumX = (n * (n - 1)) / 2
    const sumY = prices.reduce((a, b) => a + b, 0)
    const sumXY = prices.reduce((sum, y, x) => sum + x * y, 0)
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
    const sumY2 = prices.reduce((sum, y) => sum + y * y, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    )
    
    return denominator !== 0 ? numerator / denominator : 0
  }
  
  /**
   * Calculate RSI
   */
  private calculateRSI(prices: number[]): number {
    if (prices.length < 14) return 50
    
    let gains = 0
    let losses = 0
    
    for (let i = prices.length - 14; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }
    
    if (losses === 0) return 100
    
    const rs = gains / losses
    return 100 - (100 / (1 + rs))
  }
  
  /**
   * Build feature vector
   */
  private buildFeatureVector(state: TradingState): number[] {
    return [
      state.position,
      state.unrealizedPnl / 1000,  // Normalized
      state.drawdown,
      state.margin,
      state.volatility * 100,
      state.momentum * 100,
      state.trend,
      state.rsi / 100,
      state.hour / 24,
      state.dayOfWeek / 7,
    ]
  }
  
  /**
   * Get trade history
   */
  getTrades(): TradingEnvironment['trades'] {
    return [...this.trades]
  }
}

// ============================================================================
// Q-LEARNING AGENT
// ============================================================================

/**
 * Q-Learning Trading Agent
 */
export class QLearningAgent {
  private config: QLearningConfig
  private qTable: Map<string, number[]> = new Map()
  private replayBuffer: Experience[] = []
  private stepCount: number = 0
  private explorationRate: number
  
  constructor(config: Partial<QLearningConfig> = {}) {
    this.config = { ...DEFAULT_QL_CONFIG, ...config }
    this.explorationRate = this.config.explorationRate
  }
  
  /**
   * Select action
   */
  selectAction(state: TradingState, training: boolean = true): TradingAction {
    const stateKey = this.discretizeState(state)
    
    // Initialize Q-values if not exist
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, [0, 0, 0, 0]) // LONG, SHORT, CLOSE, HOLD
    }
    
    // Epsilon-greedy exploration
    if (training && Math.random() < this.explorationRate) {
      return this.randomAction()
    }
    
    // Select best action
    const qValues = this.qTable.get(stateKey)!
    const actions: TradingAction[] = ['LONG', 'SHORT', 'CLOSE', 'HOLD']
    const maxQ = Math.max(...qValues)
    const bestIdx = qValues.indexOf(maxQ)
    
    return actions[bestIdx]
  }
  
  /**
   * Learn from experience
   */
  learn(
    state: TradingState,
    action: TradingAction,
    reward: number,
    nextState: TradingState,
    done: boolean
  ): void {
    // Add to replay buffer
    this.replayBuffer.push({
      state: state.features,
      action: this.actionToIndex(action),
      reward,
      nextState: nextState.features,
      done,
    })
    
    // Trim buffer
    if (this.replayBuffer.length > this.config.replayBufferSize) {
      this.replayBuffer.shift()
    }
    
    this.stepCount++
    
    // Train periodically
    if (this.stepCount % this.config.trainFrequency === 0 &&
        this.replayBuffer.length >= this.config.batchSize) {
      this.trainBatch()
    }
    
    // Decay exploration rate
    this.explorationRate = Math.max(
      this.config.minExploration,
      this.explorationRate * this.config.explorationDecay
    )
  }
  
  /**
   * Train on a batch
   */
  private trainBatch(): void {
    // Sample batch
    const batch: Experience[] = []
    for (let i = 0; i < this.config.batchSize; i++) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length)
      batch.push(this.replayBuffer[idx])
    }
    
    // Update Q-values
    for (const exp of batch) {
      const stateKey = this.featuresToKey(exp.state)
      const nextKey = this.featuresToKey(exp.nextState)
      
      if (!this.qTable.has(stateKey)) {
        this.qTable.set(stateKey, [0, 0, 0, 0])
      }
      if (!this.qTable.has(nextKey)) {
        this.qTable.set(nextKey, [0, 0, 0, 0])
      }
      
      const qValues = this.qTable.get(stateKey)!
      const nextQValues = this.qTable.get(nextKey)!
      
      // Q-learning update
      const maxNextQ = exp.done ? 0 : Math.max(...nextQValues)
      const target = exp.reward + this.config.discountFactor * maxNextQ
      
      qValues[exp.action] += this.config.learningRate * (target - qValues[exp.action])
      
      this.qTable.set(stateKey, qValues)
    }
  }
  
  /**
   * Discretize state
   */
  private discretizeState(state: TradingState): string {
    const bins = this.config.stateBins
    
    const discretized = state.features.map(f => 
      Math.min(bins - 1, Math.max(0, Math.floor((f + 1) / 2 * bins)))
    )
    
    return discretized.join(',')
  }
  
  /**
   * Features to key
   */
  private featuresToKey(features: number[]): string {
    const bins = this.config.stateBins
    const discretized = features.map(f =>
      Math.min(bins - 1, Math.max(0, Math.floor((f + 1) / 2 * bins)))
    )
    return discretized.join(',')
  }
  
  /**
   * Action to index
   */
  private actionToIndex(action: TradingAction): number {
    return { LONG: 0, SHORT: 1, CLOSE: 2, HOLD: 3 }[action]
  }
  
  /**
   * Random action
   */
  private randomAction(): TradingAction {
    const actions: TradingAction[] = ['LONG', 'SHORT', 'CLOSE', 'HOLD']
    return actions[Math.floor(Math.random() * actions.length)]
  }
  
  /**
   * Get Q-table size
   */
  getQTableSize(): number {
    return this.qTable.size
  }
  
  /**
   * Get exploration rate
   */
  getExplorationRate(): number {
    return this.explorationRate
  }
}

// ============================================================================
// TRAINING
// ============================================================================

/**
 * Training configuration
 */
export interface RLTrainingConfig {
  episodes: number
  maxStepsPerEpisode: number
  logFrequency: number
  saveFrequency: number
}

/**
 * Training result
 */
export interface RLTrainingResult {
  episodes: number
  totalSteps: number
  avgReward: number
  avgReturn: number
  winRate: number
  maxReturn: number
  minReturn: number
  episodeRewards: number[]
  episodeReturns: number[]
}

/**
 * Train RL agent
 */
export async function trainRLAgent(
  prices: number[],
  envConfig: Partial<TradingEnvConfig> = {},
  agentConfig: Partial<QLearningConfig> = {},
  trainingConfig: Partial<RLTrainingConfig> = {}
): Promise<{ agent: QLearningAgent; result: RLTrainingResult }> {
  const tConfig: RLTrainingConfig = {
    episodes: 100,
    maxStepsPerEpisode: 500,
    logFrequency: 10,
    saveFrequency: 50,
    ...trainingConfig,
  }
  
  const env = new TradingEnvironment(prices, envConfig)
  const agent = new QLearningAgent(agentConfig)
  
  const episodeRewards: number[] = []
  const episodeReturns: number[] = []
  let totalSteps = 0
  
  for (let episode = 0; episode < tConfig.episodes; episode++) {
    let state = env.reset()
    let totalReward = 0
    let step = 0
    
    for (step = 0; step < tConfig.maxStepsPerEpisode; step++) {
      // Select action
      const action = agent.selectAction(state, true)
      
      // Take step
      const result = env.step(action)
      
      // Learn
      agent.learn(state, action, result.reward, result.state, result.done)
      
      state = result.state
      totalReward += result.reward
      
      totalSteps++
      
      if (result.done) break
    }
    
    episodeRewards.push(totalReward)
    episodeReturns.push(result.info.equity / 10000 - 1)
    
    // Log progress
    if (episode % tConfig.logFrequency === 0) {
      const avgReward = episodeRewards.slice(-tConfig.logFrequency).reduce((a, b) => a + b, 0) / tConfig.logFrequency
      console.log(`[RL] Episode ${episode}: reward=${avgReward.toFixed(2)}, exp=${(agent.getExplorationRate() * 100).toFixed(1)}%`)
    }
  }
  
  const avgReward = episodeRewards.reduce((a, b) => a + b, 0) / episodeRewards.length
  const returns = episodeReturns.slice(-20)
  
  const result: RLTrainingResult = {
    episodes: tConfig.episodes,
    totalSteps,
    avgReward,
    avgReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
    winRate: returns.filter(r => r > 0).length / returns.length,
    maxReturn: Math.max(...returns),
    minReturn: Math.min(...returns),
    episodeRewards,
    episodeReturns,
  }
  
  return { agent, result }
}

export default {
  TradingEnvironment,
  QLearningAgent,
  trainRLAgent,
}
