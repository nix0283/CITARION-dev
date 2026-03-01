/**
 * LUMIS - Execution Algorithms Engine
 * 
 * Named after the Latin word for light, this bot illuminates optimal
 * execution paths through the order book darkness.
 * 
 * Features:
 * - VWAP (Volume Weighted Average Price) execution
 * - TWAP (Time Weighted Average Price) execution
 * - POV (Percentage of Volume) execution
 * - IS (Implementation Shortfall) optimization
 * - Iceberg order detection and deployment
 * - Adaptive execution based on market conditions
 * - Smart order routing
 * - Market impact modeling
 * - Queue position estimation
 * 
 * Strategy Type: Execution Algorithms
 * Used for: Large order execution, Minimizing slippage, Hiding intentions
 * 
 * Reference: Kissell, R. (2013). The Science of Algorithmic Trading and Portfolio Management
 */

// ==================== TYPES ====================

export type AlgorithmType = 'VWAP' | 'TWAP' | 'POV' | 'IS' | 'ICEBERG' | 'ADAPTIVE';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'ACTIVE' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CUSTOM';
export type MarketCondition = 'NORMAL' | 'VOLATILE' | 'ILLIQUID' | 'TRENDING';

export interface ExecutionOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  totalQuantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  targetPrice: number;          // Target execution price
  vwapTarget?: number;          // VWAP benchmark
  twapTarget?: number;          // TWAP benchmark
  arrivalPrice: number;         // Price at order arrival
  algorithm: AlgorithmType;
  urgency: Urgency;
  startTime: number;
  endTime: number;              // Target completion time
  status: OrderStatus;
  childOrders: ChildOrder[];
  metrics: ExecutionMetrics;
}

export interface ChildOrder {
  id: string;
  parentId: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
  venue?: string;
  isIceberg?: boolean;
  displayedQuantity?: number;    // For iceberg orders
  hiddenQuantity?: number;
}

export interface ExecutionMetrics {
  vwap: number;                 // Achieved VWAP
  marketVwap: number;           // Market VWAP during execution
  slippageBps: number;          // Slippage in basis points
  implementationShortfall: number;
  participationRate: number;    // % of volume captured
  avgFillTime: number;          // Average time to fill
  fillRate: number;             // Fills / Total slices
  marketImpact: number;         // Estimated market impact
  costSavings: number;          // vs immediate execution
}

export interface VolumeProfile {
  timestamp: number;
  volume: number;
  cumulativeVolume: number;
  targetPercent: number;        // Target % of volume
  targetQuantity: number;        // Target quantity for interval
}

export interface LumisConfig {
  // Execution parameters
  defaultUrgency: Urgency;
  maxParticipationRate: number; // Max % of volume
  minSliceSize: number;         // Minimum order slice
  maxSliceSize: number;         // Maximum order slice
  sliceIntervalMs: number;      // Time between slices
  
  // VWAP parameters
  vwapLookbackDays: number;
  vwapAdjustmentFactor: number;
  
  // TWAP parameters
  twapIntervals: number;        // Number of time slices
  twapRandomization: number;    // Randomize timing ±%
  
  // POV parameters
  povTargetRate: number;        // Target % of volume
  povMaxRate: number;           // Maximum rate
  
  // Iceberg parameters
  icebergDisplayPercent: number; // % of order to display
  icebergRandomize: boolean;
  icebergMinDisplay: number;
  
  // Market impact
  impactModel: 'LINEAR' | 'SQUARE_ROOT' | 'ALMGREN_CHRISS';
  temporaryImpact: number;
  permanentImpact: number;
  
  // Risk limits
  maxSlippageBps: number;
  maxTimeDelayMs: number;
  cancelOnAdverseMove: boolean;
  adverseMoveThreshold: number;
}

export interface LumisState {
  activeOrders: Map<string, ExecutionOrder>;
  completedOrders: ExecutionOrder[];
  volumeProfiles: Map<string, VolumeProfile[]>;
  metrics: LumisMetrics;
}

export interface LumisMetrics {
  totalOrdersExecuted: number;
  totalVolumeExecuted: number;
  avgSlippageBps: number;
  avgParticipationRate: number;
  totalCostSavings: number;
  vwapBeats: number;           // Times beat VWAP
  vwapTotal: number;
}

// ==================== CONSTANTS ====================

export const DEFAULT_LUMIS_CONFIG: LumisConfig = {
  defaultUrgency: 'MEDIUM',
  maxParticipationRate: 0.15,   // 15% of volume
  minSliceSize: 0.001,          // 0.1% of total
  maxSliceSize: 0.1,            // 10% of total
  sliceIntervalMs: 60000,       // 1 minute
  
  vwapLookbackDays: 20,
  vwapAdjustmentFactor: 1.0,
  
  twapIntervals: 10,
  twapRandomization: 0.2,       // ±20%
  
  povTargetRate: 0.10,
  povMaxRate: 0.20,
  
  icebergDisplayPercent: 0.1,   // 10% visible
  icebergRandomize: true,
  icebergMinDisplay: 0.01,
  
  impactModel: 'SQUARE_ROOT',
  temporaryImpact: 0.1,
  permanentImpact: 0.05,
  
  maxSlippageBps: 50,
  maxTimeDelayMs: 300000,       // 5 minutes
  cancelOnAdverseMove: true,
  adverseMoveThreshold: 0.02,   // 2%
};

// ==================== MARKET IMPACT MODEL ====================

export class MarketImpactModel {
  private config: LumisConfig;

  constructor(config: LumisConfig) {
    this.config = config;
  }

  /**
   * Estimate market impact using selected model
   */
  estimateImpact(
    quantity: number,
    averageVolume: number,
    volatility: number,
    duration: number  // in minutes
  ): { temporaryImpact: number; permanentImpact: number; totalImpact: number } {
    const participationRate = quantity / averageVolume;
    
    let temporary: number;
    let permanent: number;
    
    switch (this.config.impactModel) {
      case 'LINEAR':
        temporary = this.config.temporaryImpact * participationRate;
        permanent = this.config.permanentImpact * participationRate;
        break;
        
      case 'SQUARE_ROOT':
        // Square root law: impact ~ σ * sqrt(Q/V)
        temporary = this.config.temporaryImpact * volatility * Math.sqrt(participationRate);
        permanent = this.config.permanentImpact * volatility * Math.sqrt(participationRate);
        break;
        
      case 'ALMGREN_CHRISS':
        // Almgren-Chriss model
        const dailyVol = volatility / Math.sqrt(252);
        const X = quantity;
        const T = duration / 390; // Convert to trading days
        const V = averageVolume;
        
        temporary = this.config.temporaryImpact * dailyVol * Math.pow(X / V, 2/3) * Math.pow(1/T, 1/3);
        permanent = this.config.permanentImpact * dailyVol * (X / V);
        break;
        
      default:
        temporary = 0;
        permanent = 0;
    }
    
    // Adjust for duration
    const durationAdjustment = Math.sqrt(1 / Math.max(duration / 60, 1));
    temporary *= durationAdjustment;
    
    return {
      temporaryImpact: temporary,
      permanentImpact: permanent,
      totalImpact: temporary + permanent,
    };
  }

  /**
   * Calculate optimal execution trajectory
   * Using Almgren-Chriss framework
   */
  calculateOptimalTrajectory(
    totalQuantity: number,
    totalDuration: number,  // in minutes
    riskAversion: number = 0.5
  ): number[] {
    const intervals = Math.ceil(totalDuration / (this.config.sliceIntervalMs / 60000));
    const trajectory: number[] = [];
    
    // Optimal trajectory: x(t) = X * (1 - sinh(κ(T-t)) / sinh(κT))
    // Simplified: exponential decay weighted by risk aversion
    
    const kappa = riskAversion * 0.1; // Decay rate
    
    for (let i = 1; i <= intervals; i++) {
      const t = i / intervals;
      const remaining = totalQuantity * (1 - t);
      
      if (i === intervals) {
        trajectory.push(remaining);
      } else {
        const optimalRemaining = totalQuantity * (1 - Math.sinh(kappa * (1 - t)) / Math.sinh(kappa));
        const sliceQuantity = (i === 1 ? totalQuantity - optimalRemaining : trajectory[i-2] - optimalRemaining);
        trajectory.push(Math.max(0, sliceQuantity));
      }
    }
    
    // Normalize to total quantity
    const sum = trajectory.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < trajectory.length; i++) {
        trajectory[i] = (trajectory[i] / sum) * totalQuantity;
      }
    }
    
    return trajectory;
  }
}

// ==================== VWAP EXECUTOR ====================

export class VWAPExecutor {
  private config: LumisConfig;

  constructor(config: LumisConfig) {
    this.config = config;
  }

  /**
   * Generate VWAP execution schedule
   * Distributes order according to historical volume profile
   */
  generateSchedule(
    totalQuantity: number,
    durationMinutes: number,
    volumeProfile: VolumeProfile[]
  ): Array<{ time: number; quantity: number; targetPercent: number }> {
    const schedule: Array<{ time: number; quantity: number; targetPercent: number }> = [];
    
    // Calculate total volume in profile
    const totalVolume = volumeProfile.reduce((sum, vp) => sum + vp.volume, 0);
    
    // Distribute order according to volume profile
    let cumulativeQuantity = 0;
    
    for (const vp of volumeProfile) {
      const volumePercent = vp.volume / totalVolume;
      const sliceQuantity = totalQuantity * volumePercent * this.config.vwapAdjustmentFactor;
      
      cumulativeQuantity += sliceQuantity;
      
      schedule.push({
        time: vp.timestamp,
        quantity: Math.min(sliceQuantity, totalQuantity - schedule.reduce((s, x) => s + x.quantity, 0)),
        targetPercent: volumePercent,
      });
      
      if (cumulativeQuantity >= totalQuantity) break;
    }
    
    // Normalize to exact total quantity
    const scheduledTotal = schedule.reduce((s, x) => s + x.quantity, 0);
    if (scheduledTotal !== totalQuantity && schedule.length > 0) {
      schedule[schedule.length - 1].quantity += totalQuantity - scheduledTotal;
    }
    
    return schedule;
  }

  /**
   * Calculate expected VWAP benchmark
   */
  calculateVWAPBenchmark(
    prices: number[],
    volumes: number[]
  ): number {
    if (prices.length !== volumes.length || prices.length === 0) return 0;
    
    let sumPV = 0;
    let sumV = 0;
    
    for (let i = 0; i < prices.length; i++) {
      sumPV += prices[i] * volumes[i];
      sumV += volumes[i];
    }
    
    return sumV > 0 ? sumPV / sumV : 0;
  }

  /**
   * Calculate VWAP slippage in basis points
   */
  calculateSlippage(
    executionVWAP: number,
    marketVWAP: number,
    side: OrderSide
  ): number {
    if (marketVWAP === 0) return 0;
    
    const slippage = side === 'BUY'
      ? (executionVWAP - marketVWAP) / marketVWAP
      : (marketVWAP - executionVWAP) / marketVWAP;
    
    return slippage * 10000; // Convert to basis points
  }
}

// ==================== TWAP EXECUTOR ====================

export class TWAPExecutor {
  private config: LumisConfig;

  constructor(config: LumisConfig) {
    this.config = config;
  }

  /**
   * Generate TWAP execution schedule
   * Distributes order evenly over time
   */
  generateSchedule(
    totalQuantity: number,
    durationMinutes: number,
    startTime: number = Date.now()
  ): Array<{ time: number; quantity: number }> {
    const intervals = this.config.twapIntervals;
    const intervalMs = (durationMinutes * 60000) / intervals;
    const baseQuantity = totalQuantity / intervals;
    
    const schedule: Array<{ time: number; quantity: number }> = [];
    let remainingQuantity = totalQuantity;
    
    for (let i = 0; i < intervals; i++) {
      // Apply randomization
      let quantity = baseQuantity;
      if (this.config.twapRandomization > 0) {
        const randomFactor = 1 + (Math.random() * 2 - 1) * this.config.twapRandomization;
        quantity = baseQuantity * randomFactor;
      }
      
      // Ensure we don't exceed remaining quantity
      quantity = Math.min(quantity, remainingQuantity);
      
      // Randomize timing slightly
      const timeOffset = (Math.random() - 0.5) * intervalMs * 0.2;
      
      schedule.push({
        time: startTime + i * intervalMs + timeOffset,
        quantity,
      });
      
      remainingQuantity -= quantity;
    }
    
    // Add any remaining quantity to last slice
    if (remainingQuantity > 0 && schedule.length > 0) {
      schedule[schedule.length - 1].quantity += remainingQuantity;
    }
    
    return schedule;
  }

  /**
   * Calculate TWAP benchmark
   */
  calculateTWAPBenchmark(
    prices: number[],
    startTime: number,
    endTime: number
  ): number {
    if (prices.length === 0) return 0;
    
    // Simple average of prices during time window
    return prices.reduce((sum, p) => sum + p, 0) / prices.length;
  }
}

// ==================== ICEBERG EXECUTOR ====================

export class IcebergExecutor {
  private config: LumisConfig;

  constructor(config: LumisConfig) {
    this.config = config;
  }

  /**
   * Generate iceberg order structure
   * Only displays a portion of total order
   */
  generateIceberg(
    totalQuantity: number,
    price: number,
    side: OrderSide
  ): { displayed: number; hidden: number; slices: number[] } {
    // Calculate displayed portion
    let displayedQuantity = totalQuantity * this.config.icebergDisplayPercent;
    
    // Apply minimum
    displayedQuantity = Math.max(displayedQuantity, this.config.icebergMinDisplay);
    
    const hiddenQuantity = totalQuantity - displayedQuantity;
    
    // Generate randomized slices for hidden portion
    const slices: number[] = [];
    let remaining = hiddenQuantity;
    
    // Number of hidden slices
    const numSlices = Math.ceil(hiddenQuantity / displayedQuantity);
    const avgSliceSize = hiddenQuantity / numSlices;
    
    for (let i = 0; i < numSlices; i++) {
      let slice = avgSliceSize;
      
      if (this.config.icebergRandomize) {
        // Randomize slice size ±30%
        slice = avgSliceSize * (1 + (Math.random() * 0.6 - 0.3));
      }
      
      slice = Math.min(slice, remaining);
      slices.push(slice);
      remaining -= slice;
      
      if (remaining <= 0) break;
    }
    
    // Add remaining
    if (remaining > 0 && slices.length > 0) {
      slices[slices.length - 1] += remaining;
    }
    
    return {
      displayed: displayedQuantity,
      hidden: hiddenQuantity,
      slices,
    };
  }

  /**
   * Detect iceberg orders in orderbook
   */
  detectIceberg(
    orderbook: { bids: Array<{ price: number; quantity: number }>, asks: Array<{ price: number; quantity: number }> },
    trades: Array<{ price: number; quantity: number; timestamp: number }>
  ): { detected: boolean; level: number; estimatedSize: number; confidence: number } {
    // Look for patterns indicating iceberg orders:
    // 1. Repeated fills at same price level
    // 2. Quantity refreshes after partial fills
    // 3. Unusually large fills relative to displayed size
    
    const levels = new Map<number, { fills: number; totalQuantity: number; refreshes: number }>();
    
    // Group trades by price level
    for (const trade of trades) {
      const level = trade.price;
      const existing = levels.get(level) || { fills: 0, totalQuantity: 0, refreshes: 0 };
      existing.fills++;
      existing.totalQuantity += trade.quantity;
      levels.set(level, existing);
    }
    
    // Analyze each level
    for (const [level, data] of levels) {
      // Check for unusually high number of fills at one level
      if (data.fills > 10) {
        // Check if displayed quantity at this level is much smaller than total traded
        const bidQty = orderbook.bids.find(b => b.price === level)?.quantity || 0;
        const askQty = orderbook.asks.find(a => a.price === level)?.quantity || 0;
        const displayedQty = Math.max(bidQty, askQty);
        
        if (displayedQty > 0 && data.totalQuantity > displayedQty * 3) {
          // Likely iceberg
          return {
            detected: true,
            level,
            estimatedSize: data.totalQuantity * 1.5,
            confidence: Math.min(0.95, 0.5 + (data.fills / 50)),
          };
        }
      }
    }
    
    return { detected: false, level: 0, estimatedSize: 0, confidence: 0 };
  }
}

// ==================== POV EXECUTOR ====================

export class POVExecutor {
  private config: LumisConfig;

  constructor(config: LumisConfig) {
    this.config = config;
  }

  /**
   * Calculate order quantity based on participation rate
   */
  calculateSliceQuantity(
    marketVolume: number,
    targetRate: number = this.config.povTargetRate
  ): number {
    return marketVolume * Math.min(targetRate, this.config.povMaxRate);
  }

  /**
   * Adjust participation rate based on urgency
   */
  adjustParticipationRate(
    baseRate: number,
    urgency: Urgency,
    progress: number,  // 0-1, how much of order is filled
    timeElapsed: number,
    totalTime: number
  ): number {
    // Time remaining factor
    const timeRemaining = Math.max(0, 1 - timeElapsed / totalTime);
    
    // Progress factor
    const fillProgress = progress;
    
    // Urgency multiplier
    let urgencyMultiplier: number;
    switch (urgency) {
      case 'LOW': urgencyMultiplier = 0.7; break;
      case 'MEDIUM': urgencyMultiplier = 1.0; break;
      case 'HIGH': urgencyMultiplier = 1.3; break;
      default: urgencyMultiplier = 1.0;
    }
    
    // If behind schedule, increase rate
    if (progress < 1 - timeRemaining) {
      urgencyMultiplier *= 1.2;
    }
    
    return Math.min(baseRate * urgencyMultiplier, this.config.povMaxRate);
  }
}

// ==================== LUMIS BOT ====================

export class LumisBot {
  private config: LumisConfig;
  private state: LumisState;
  private impactModel: MarketImpactModel;
  private vwapExecutor: VWAPExecutor;
  private twapExecutor: TWAPExecutor;
  private icebergExecutor: IcebergExecutor;
  private povExecutor: POVExecutor;

  constructor(config: Partial<LumisConfig>) {
    this.config = { ...DEFAULT_LUMIS_CONFIG, ...config };
    
    this.impactModel = new MarketImpactModel(this.config);
    this.vwapExecutor = new VWAPExecutor(this.config);
    this.twapExecutor = new TWAPExecutor(this.config);
    this.icebergExecutor = new IcebergExecutor(this.config);
    this.povExecutor = new POVExecutor(this.config);
    
    this.state = {
      activeOrders: new Map(),
      completedOrders: [],
      volumeProfiles: new Map(),
      metrics: this.initMetrics(),
    };
  }

  private initMetrics(): LumisMetrics {
    return {
      totalOrdersExecuted: 0,
      totalVolumeExecuted: 0,
      avgSlippageBps: 0,
      avgParticipationRate: 0,
      totalCostSavings: 0,
      vwapBeats: 0,
      vwapTotal: 0,
    };
  }

  /**
   * Create a new execution order
   */
  createOrder(
    symbol: string,
    side: OrderSide,
    quantity: number,
    algorithm: AlgorithmType,
    options: {
      urgency?: Urgency;
      duration?: number;           // in minutes
      targetPrice?: number;
      volumeProfile?: VolumeProfile[];
    } = {}
  ): ExecutionOrder {
    const orderId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const duration = options.duration ?? 30; // Default 30 minutes
    
    const order: ExecutionOrder = {
      id: orderId,
      symbol,
      side,
      totalQuantity: quantity,
      filledQuantity: 0,
      remainingQuantity: quantity,
      targetPrice: options.targetPrice ?? 0,
      arrivalPrice: options.targetPrice ?? 0,
      algorithm,
      urgency: options.urgency ?? this.config.defaultUrgency,
      startTime: now,
      endTime: now + duration * 60000,
      status: 'PENDING',
      childOrders: [],
      metrics: {
        vwap: 0,
        marketVwap: 0,
        slippageBps: 0,
        implementationShortfall: 0,
        participationRate: 0,
        avgFillTime: 0,
        fillRate: 0,
        marketImpact: 0,
        costSavings: 0,
      },
    };
    
    // Generate execution schedule
    switch (algorithm) {
      case 'VWAP':
        this.initVWAPExecution(order, options.volumeProfile);
        break;
      case 'TWAP':
        this.initTWAPExecution(order);
        break;
      case 'ICEBERG':
        this.initIcebergExecution(order);
        break;
      case 'POV':
        this.initPOVExecution(order);
        break;
      case 'ADAPTIVE':
        this.initAdaptiveExecution(order);
        break;
    }
    
    this.state.activeOrders.set(orderId, order);
    order.status = 'ACTIVE';
    
    return order;
  }

  private initVWAPExecution(order: ExecutionOrder, volumeProfile?: VolumeProfile[]): void {
    if (!volumeProfile) {
      // Use default flat profile
      volumeProfile = this.generateDefaultVolumeProfile(order.totalQuantity);
    }
    
    const schedule = this.vwapExecutor.generateSchedule(
      order.totalQuantity,
      (order.endTime - order.startTime) / 60000,
      volumeProfile
    );
    
    // Convert schedule to child orders
    for (const slice of schedule) {
      if (slice.quantity > 0) {
        order.childOrders.push({
          id: `${order.id}-child-${order.childOrders.length}`,
          parentId: order.id,
          price: order.targetPrice,
          quantity: slice.quantity,
          filledQuantity: 0,
          status: 'PENDING',
          createdAt: slice.time,
        });
      }
    }
  }

  private initTWAPExecution(order: ExecutionOrder): void {
    const schedule = this.twapExecutor.generateSchedule(
      order.totalQuantity,
      (order.endTime - order.startTime) / 60000,
      order.startTime
    );
    
    for (const slice of schedule) {
      if (slice.quantity > 0) {
        order.childOrders.push({
          id: `${order.id}-child-${order.childOrders.length}`,
          parentId: order.id,
          price: order.targetPrice,
          quantity: slice.quantity,
          filledQuantity: 0,
          status: 'PENDING',
          createdAt: slice.time,
        });
      }
    }
  }

  private initIcebergExecution(order: ExecutionOrder): void {
    const iceberg = this.icebergExecutor.generateIceberg(
      order.totalQuantity,
      order.targetPrice,
      order.side
    );
    
    // Create displayed order
    order.childOrders.push({
      id: `${order.id}-displayed`,
      parentId: order.id,
      price: order.targetPrice,
      quantity: iceberg.displayed,
      filledQuantity: 0,
      status: 'PENDING',
      createdAt: Date.now(),
      isIceberg: true,
      displayedQuantity: iceberg.displayed,
      hiddenQuantity: 0,
    });
    
    // Create hidden slices
    for (let i = 0; i < iceberg.slices.length; i++) {
      order.childOrders.push({
        id: `${order.id}-hidden-${i}`,
        parentId: order.id,
        price: order.targetPrice,
        quantity: iceberg.slices[i],
        filledQuantity: 0,
        status: 'PENDING',
        createdAt: Date.now() + (i + 1) * 1000, // Stagger timing
        isIceberg: true,
        displayedQuantity: 0,
        hiddenQuantity: iceberg.slices[i],
      });
    }
  }

  private initPOVExecution(order: ExecutionOrder): void {
    // POV doesn't pre-generate slices - they're created dynamically
    // based on market volume
    order.childOrders.push({
      id: `${order.id}-pov-main`,
      parentId: order.id,
      price: order.targetPrice,
      quantity: 0, // Will be set dynamically
      filledQuantity: 0,
      status: 'PENDING',
      createdAt: Date.now(),
    });
  }

  private initAdaptiveExecution(order: ExecutionOrder): void {
    // Adaptive uses optimal trajectory from impact model
    const trajectory = this.impactModel.calculateOptimalTrajectory(
      order.totalQuantity,
      (order.endTime - order.startTime) / 60000,
      order.urgency === 'HIGH' ? 0.8 : order.urgency === 'LOW' ? 0.2 : 0.5
    );
    
    const intervalMs = (order.endTime - order.startTime) / trajectory.length;
    
    for (let i = 0; i < trajectory.length; i++) {
      if (trajectory[i] > 0) {
        order.childOrders.push({
          id: `${order.id}-adaptive-${i}`,
          parentId: order.id,
          price: order.targetPrice,
          quantity: trajectory[i],
          filledQuantity: 0,
          status: 'PENDING',
          createdAt: order.startTime + i * intervalMs,
        });
      }
    }
  }

  private generateDefaultVolumeProfile(quantity: number): VolumeProfile[] {
    const intervals = this.config.twapIntervals;
    const profile: VolumeProfile[] = [];
    const now = Date.now();
    
    for (let i = 0; i < intervals; i++) {
      profile.push({
        timestamp: now + i * this.config.sliceIntervalMs,
        volume: 1, // Equal volume
        cumulativeVolume: i + 1,
        targetPercent: 1 / intervals,
        targetQuantity: quantity / intervals,
      });
    }
    
    return profile;
  }

  /**
   * Process a fill for a child order
   */
  processFill(
    orderId: string,
    childOrderId: string,
    fillQuantity: number,
    fillPrice: number
  ): ExecutionOrder | null {
    const order = this.state.activeOrders.get(orderId);
    if (!order) return null;
    
    const childOrder = order.childOrders.find(c => c.id === childOrderId);
    if (!childOrder) return null;
    
    // Update child order
    childOrder.filledQuantity += fillQuantity;
    if (childOrder.filledQuantity >= childOrder.quantity) {
      childOrder.status = 'FILLED';
      childOrder.filledAt = Date.now();
    } else {
      childOrder.status = 'PARTIALLY_FILLED';
    }
    
    // Update parent order
    order.filledQuantity += fillQuantity;
    order.remainingQuantity -= fillQuantity;
    
    // Update VWAP
    const prevVwap = order.metrics.vwap;
    const prevQty = order.filledQuantity - fillQuantity;
    order.metrics.vwap = (prevVwap * prevQty + fillPrice * fillQuantity) / order.filledQuantity;
    
    // Check if complete
    if (order.remainingQuantity <= 0) {
      order.status = 'FILLED';
      this.completeOrder(order);
    }
    
    return order;
  }

  /**
   * Complete an order and update metrics
   */
  private completeOrder(order: ExecutionOrder): void {
    this.state.activeOrders.delete(order.id);
    this.state.completedOrders.push(order);
    
    // Update metrics
    this.state.metrics.totalOrdersExecuted++;
    this.state.metrics.totalVolumeExecuted += order.totalQuantity;
    this.state.metrics.vwapTotal++;
    
    if (order.metrics.slippageBps < 0) {
      this.state.metrics.vwapBeats++;
    }
    
    // Calculate average slippage
    const totalSlippage = this.state.completedOrders.reduce(
      (sum, o) => sum + o.metrics.slippageBps, 0
    );
    this.state.metrics.avgSlippageBps = totalSlippage / this.state.completedOrders.length;
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): boolean {
    const order = this.state.activeOrders.get(orderId);
    if (!order) return false;
    
    order.status = 'CANCELLED';
    
    // Cancel all pending child orders
    for (const child of order.childOrders) {
      if (child.status === 'PENDING') {
        child.status = 'CANCELLED';
      }
    }
    
    this.state.activeOrders.delete(orderId);
    this.state.completedOrders.push(order);
    
    return true;
  }

  /**
   * Get next child order to execute
   */
  getNextChildOrder(orderId: string): ChildOrder | null {
    const order = this.state.activeOrders.get(orderId);
    if (!order) return null;
    
    const now = Date.now();
    
    // Find pending child order whose time has come
    for (const child of order.childOrders) {
      if (child.status === 'PENDING' && child.createdAt <= now) {
        return child;
      }
    }
    
    return null;
  }

  /**
   * Get state
   */
  getState(): LumisState {
    return {
      ...this.state,
      activeOrders: new Map(this.state.activeOrders),
      completedOrders: [...this.state.completedOrders],
      volumeProfiles: new Map(this.state.volumeProfiles),
    };
  }

  /**
   * Get config
   */
  getConfig(): LumisConfig {
    return { ...this.config };
  }

  /**
   * Get order
   */
  getOrder(orderId: string): ExecutionOrder | undefined {
    return this.state.activeOrders.get(orderId) || 
           this.state.completedOrders.find(o => o.id === orderId);
  }

  /**
   * Get active orders for symbol
   */
  getActiveOrdersForSymbol(symbol: string): ExecutionOrder[] {
    return Array.from(this.state.activeOrders.values()).filter(o => o.symbol === symbol);
  }

  /**
   * Reset
   */
  reset(): void {
    this.state = {
      activeOrders: new Map(),
      completedOrders: [],
      volumeProfiles: new Map(),
      metrics: this.initMetrics(),
    };
  }
}

// ==================== EXPORTS ====================

const LumisModule = {
  LumisBot,
  MarketImpactModel,
  VWAPExecutor,
  TWAPExecutor,
  IcebergExecutor,
  POVExecutor,
  DEFAULT_LUMIS_CONFIG,
};

export default LumisModule;
