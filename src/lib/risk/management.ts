/**
 * Risk Management Module
 * Inspired by QuantConnect LEAN Risk Management Framework
 *
 * Implements comprehensive risk management:
 * - Maximum Drawdown Limits
 * - Position Sizing (Kelly, Risk Parity, Volatility-based)
 * - Exposure Limits (Sector, Asset, Market)
 * - Stop Loss Management
 * - Volatility Targeting
 * - Risk Budgeting
 * - VaR-based Risk Management
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Position {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  side: 'long' | 'short';
  unrealizedPnL: number;
  marketValue: number;
  sector?: string;
  assetClass?: string;
}

export interface Portfolio {
  totalValue: number;
  cash: number;
  positions: Position[];
  unrealizedPnL: number;
  realizedPnL: number;
  peakValue: number;
  currentDrawdown: number;
}

export interface RiskLimits {
  // Portfolio-level limits
  maxDrawdown: number; // Maximum drawdown (0-1)
  maxDailyLoss: number; // Maximum daily loss (0-1)
  maxPositionSize: number; // Maximum single position as % of portfolio
  maxSectorExposure: number; // Maximum sector exposure (0-1)
  maxAssetExposure: number; // Maximum single asset exposure (0-1)
  maxLeverage: number; // Maximum leverage ratio
  maxCorrelation: number; // Maximum correlation between positions

  // Volatility limits
  maxPortfolioVolatility: number; // Maximum annualized portfolio volatility
  volatilityTarget: number; // Target portfolio volatility

  // VaR limits
  maxVaR95: number; // Maximum 95% VaR as % of portfolio
  maxCVaR95: number; // Maximum 95% CVaR as % of portfolio

  // Concentration limits
  maxTop3Holdings: number; // Maximum % in top 3 holdings
  minPositions: number; // Minimum number of positions
  maxPositions: number; // Maximum number of positions
}

export interface RiskMetrics {
  // Drawdown metrics
  currentDrawdown: number;
  maxDrawdown: number;
  avgDrawdown: number;
  drawdownDuration: number;

  // Volatility metrics
  portfolioVolatility: number;
  dailyVolatility: number;
  annualizedVolatility: number;

  // VaR metrics
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;

  // Exposure metrics
  grossExposure: number;
  netExposure: number;
  longExposure: number;
  shortExposure: number;
  leverage: number;

  // Concentration metrics
  top3Concentration: number;
  herfindahlIndex: number;
  effectiveN: number; // Effective number of positions

  // Correlation metrics
  avgCorrelation: number;
  maxCorrelation: number;

  // Risk-adjusted metrics
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
}

export interface RiskAction {
  type: 'reduce_position' | 'close_position' | 'hedge' | 'stop_trading' | 'adjust_leverage' | 'rebalance';
  symbol?: string;
  targetValue?: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface PositionSizeResult {
  quantity: number;
  value: number;
  percentOfPortfolio: number;
  reasoning: string;
}

export interface StopLossLevel {
  type: 'fixed' | 'trailing' | 'atr' | 'volatility' | 'support';
  price: number;
  percent: number;
  triggered: boolean;
}

// ============================================================================
// DEFAULT RISK LIMITS
// ============================================================================

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxDrawdown: 0.20, // 20% max drawdown
  maxDailyLoss: 0.05, // 5% max daily loss
  maxPositionSize: 0.10, // 10% max single position
  maxSectorExposure: 0.30, // 30% max sector exposure
  maxAssetExposure: 0.15, // 15% max single asset
  maxLeverage: 2.0, // 2x max leverage
  maxCorrelation: 0.70, // 70% max correlation

  maxPortfolioVolatility: 0.25, // 25% annualized volatility
  volatilityTarget: 0.15, // 15% target volatility

  maxVaR95: 0.05, // 5% max 95% VaR
  maxCVaR95: 0.08, // 8% max 95% CVaR

  maxTop3Holdings: 0.50, // 50% max in top 3 holdings
  minPositions: 5, // Minimum 5 positions
  maxPositions: 50, // Maximum 50 positions
};

// ============================================================================
// DRAWDOWN MANAGEMENT
// ============================================================================

/**
 * Calculate current drawdown
 */
export function calculateDrawdown(
  portfolioValues: number[]
): { current: number; max: number; avg: number; duration: number } {
  if (portfolioValues.length === 0) {
    return { current: 0, max: 0, avg: 0, duration: 0 };
  }

  let peak = portfolioValues[0];
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let drawdownSum = 0;
  let drawdownCount = 0;
  let currentDrawdownDuration = 0;
  let maxDuration = 0;

  for (let i = 0; i < portfolioValues.length; i++) {
    const value = portfolioValues[i];

    if (value > peak) {
      peak = value;
      currentDrawdownDuration = 0;
    } else {
      currentDrawdownDuration++;
      if (currentDrawdownDuration > maxDuration) {
        maxDuration = currentDrawdownDuration;
      }
    }

    const drawdown = (peak - value) / peak;
    currentDrawdown = drawdown;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }

    if (drawdown > 0) {
      drawdownSum += drawdown;
      drawdownCount++;
    }
  }

  return {
    current: currentDrawdown,
    max: maxDrawdown,
    avg: drawdownCount > 0 ? drawdownSum / drawdownCount : 0,
    duration: maxDuration,
  };
}

/**
 * Check drawdown limits and generate actions
 */
export function checkDrawdownLimits(
  portfolio: Portfolio,
  limits: RiskLimits
): RiskAction[] {
  const actions: RiskAction[] = [];
  const drawdown = portfolio.currentDrawdown;

  // Critical: At or exceeding max drawdown
  if (drawdown >= limits.maxDrawdown) {
    actions.push({
      type: 'stop_trading',
      reason: `Maximum drawdown reached: ${(drawdown * 100).toFixed(1)}% >= ${(limits.maxDrawdown * 100).toFixed(1)}%`,
      urgency: 'critical',
    });

    // Close all positions
    for (const pos of portfolio.positions) {
      actions.push({
        type: 'close_position',
        symbol: pos.symbol,
        reason: 'Emergency close due to max drawdown breach',
        urgency: 'critical',
      });
    }
  }
  // Warning: Approaching max drawdown
  else if (drawdown >= limits.maxDrawdown * 0.8) {
    actions.push({
      type: 'reduce_position',
      reason: `Approaching max drawdown: ${(drawdown * 100).toFixed(1)}%`,
      urgency: 'high',
    });
  }
  // Caution: Getting close
  else if (drawdown >= limits.maxDrawdown * 0.6) {
    actions.push({
      type: 'adjust_leverage',
      reason: `Drawdown warning: ${(drawdown * 100).toFixed(1)}%`,
      urgency: 'medium',
    });
  }

  return actions;
}

// ============================================================================
// POSITION SIZING
// ============================================================================

/**
 * Kelly Criterion position sizing
 */
export function kellyPositionSize(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  portfolioValue: number,
  maxFraction: number = 0.25 // Max 25% Kelly to reduce volatility
): PositionSizeResult {
  // Kelly fraction: f* = p - (1-p)/(w/l)
  // where p = win rate, w = avg win, l = avg loss
  const winLossRatio = avgLoss !== 0 ? avgWin / avgLoss : 1;
  const kellyFraction = winRate - (1 - winRate) / winLossRatio;

  // Apply fractional Kelly for risk management
  const adjustedFraction = Math.min(Math.max(0, kellyFraction), maxFraction);

  return {
    quantity: 0, // To be calculated based on price
    value: portfolioValue * adjustedFraction,
    percentOfPortfolio: adjustedFraction * 100,
    reasoning: `Kelly fraction: ${(kellyFraction * 100).toFixed(1)}%, adjusted: ${(adjustedFraction * 100).toFixed(1)}% (win rate: ${(winRate * 100).toFixed(1)}%, W/L ratio: ${winLossRatio.toFixed(2)})`,
  };
}

/**
 * Volatility-based position sizing
 */
export function volatilityPositionSize(
  targetVolatility: number,
  assetVolatility: number,
  portfolioValue: number,
  maxPosition: number = 0.20
): PositionSizeResult {
  // Position size = Target Vol / Asset Vol
  // This gives the weight that achieves target volatility contribution
  const rawFraction = assetVolatility > 0 ? targetVolatility / assetVolatility : 0;
  const fraction = Math.min(rawFraction, maxPosition);

  return {
    quantity: 0,
    value: portfolioValue * fraction,
    percentOfPortfolio: fraction * 100,
    reasoning: `Target vol: ${(targetVolatility * 100).toFixed(1)}%, Asset vol: ${(assetVolatility * 100).toFixed(1)}%, Position: ${(fraction * 100).toFixed(1)}%`,
  };
}

/**
 * Risk parity position sizing
 */
export function riskParityPositionSize(
  assetVolatilities: Map<string, number>,
  portfolioValue: number
): Map<string, PositionSizeResult> {
  const results = new Map<string, PositionSizeResult>();

  // Calculate inverse volatility weights
  const inverseVols = new Map<string, number>();
  let sumInverseVol = 0;

  assetVolatilities.forEach((vol, symbol) => {
    const invVol = vol > 0 ? 1 / vol : 0;
    inverseVols.set(symbol, invVol);
    sumInverseVol += invVol;
  });

  // Normalize to get weights
  inverseVols.forEach((invVol, symbol) => {
    const weight = sumInverseVol > 0 ? invVol / sumInverseVol : 0;

    results.set(symbol, {
      quantity: 0,
      value: portfolioValue * weight,
      percentOfPortfolio: weight * 100,
      reasoning: `Risk parity weight: ${(weight * 100).toFixed(1)}% (inverse vol allocation)`,
    });
  });

  return results;
}

/**
 * ATR-based position sizing
 */
export function atrPositionSize(
  portfolioValue: number,
  atr: number,
  price: number,
  riskPerTrade: number = 0.02, // 2% risk per trade
  stopLossATR: number = 2 // Stop loss at 2x ATR
): PositionSizeResult {
  // Position size = Risk Amount / (ATR * Stop Loss Multiplier)
  const riskAmount = portfolioValue * riskPerTrade;
  const stopLossDistance = atr * stopLossATR;
  const shares = stopLossDistance > 0 ? riskAmount / stopLossDistance : 0;
  const positionValue = shares * price;
  const fraction = portfolioValue > 0 ? positionValue / portfolioValue : 0;

  return {
    quantity: shares,
    value: positionValue,
    percentOfPortfolio: fraction * 100,
    reasoning: `Risk: ${(riskPerTrade * 100).toFixed(1)}% of portfolio, Stop: ${stopLossATR}x ATR = $${stopLossDistance.toFixed(2)}`,
  };
}

// ============================================================================
// EXPOSURE MANAGEMENT
// ============================================================================

/**
 * Calculate portfolio exposures
 */
export function calculateExposures(
  portfolio: Portfolio
): {
  gross: number;
  net: number;
  long: number;
  short: number;
  leverage: number;
  bySector: Map<string, number>;
  byAsset: Map<string, number>;
} {
  let longExposure = 0;
  let shortExposure = 0;
  const sectorExposure = new Map<string, number>();
  const assetExposure = new Map<string, number>();

  for (const pos of portfolio.positions) {
    const exposure = pos.marketValue / portfolio.totalValue;

    if (pos.side === 'long') {
      longExposure += exposure;
    } else {
      shortExposure += exposure;
    }

    // Sector exposure
    if (pos.sector) {
      const current = sectorExposure.get(pos.sector) || 0;
      sectorExposure.set(pos.sector, current + Math.abs(exposure));
    }

    // Asset exposure
    const currentAsset = assetExposure.get(pos.symbol) || 0;
    assetExposure.set(pos.symbol, currentAsset + Math.abs(exposure));
  }

  return {
    gross: longExposure + shortExposure,
    net: longExposure - shortExposure,
    long: longExposure,
    short: shortExposure,
    leverage: portfolio.totalValue > 0
      ? (longExposure + shortExposure) * portfolio.totalValue / portfolio.totalValue
      : 0,
    bySector: sectorExposure,
    byAsset: assetExposure,
  };
}

/**
 * Check exposure limits
 */
export function checkExposureLimits(
  portfolio: Portfolio,
  limits: RiskLimits
): RiskAction[] {
  const actions: RiskAction[] = [];
  const exposures = calculateExposures(portfolio);

  // Check leverage
  if (exposures.leverage > limits.maxLeverage) {
    actions.push({
      type: 'adjust_leverage',
      targetValue: limits.maxLeverage,
      reason: `Leverage ${(exposures.leverage).toFixed(2)}x exceeds max ${limits.maxLeverage}x`,
      urgency: 'high',
    });
  }

  // Check sector exposure
  exposures.bySector.forEach((exposure, sector) => {
    if (exposure > limits.maxSectorExposure) {
      actions.push({
        type: 'reduce_position',
        reason: `Sector ${sector} exposure ${(exposure * 100).toFixed(1)}% exceeds max ${(limits.maxSectorExposure * 100).toFixed(1)}%`,
        urgency: 'medium',
      });
    }
  });

  // Check single asset exposure
  exposures.byAsset.forEach((exposure, symbol) => {
    if (exposure > limits.maxAssetExposure) {
      actions.push({
        type: 'reduce_position',
        symbol,
        targetValue: limits.maxAssetExposure * portfolio.totalValue,
        reason: `Asset ${symbol} exposure ${(exposure * 100).toFixed(1)}% exceeds max ${(limits.maxAssetExposure * 100).toFixed(1)}%`,
        urgency: 'medium',
      });
    }
  });

  // Check position count
  if (portfolio.positions.length > limits.maxPositions) {
    actions.push({
      type: 'reduce_position',
      reason: `Too many positions: ${portfolio.positions.length} > ${limits.maxPositions}`,
      urgency: 'low',
    });
  }

  return actions;
}

// ============================================================================
// STOP LOSS MANAGEMENT
// ============================================================================

/**
 * Calculate stop loss levels
 */
export function calculateStopLoss(
  position: Position,
  options: {
    fixedPercent?: number;
    trailingPercent?: number;
    atr?: number;
    atrMultiplier?: number;
    volatility?: number;
    volatilityMultiplier?: number;
    supportLevel?: number;
  }
): StopLossLevel[] {
  const stops: StopLossLevel[] = [];
  const { entryPrice, currentPrice, side } = position;

  // Fixed percentage stop
  if (options.fixedPercent) {
    const stopPrice = side === 'long'
      ? entryPrice * (1 - options.fixedPercent)
      : entryPrice * (1 + options.fixedPercent);

    stops.push({
      type: 'fixed',
      price: stopPrice,
      percent: options.fixedPercent,
      triggered: side === 'long'
        ? currentPrice <= stopPrice
        : currentPrice >= stopPrice,
    });
  }

  // Trailing stop
  if (options.trailingPercent) {
    const highestPrice = Math.max(entryPrice, currentPrice);
    const lowestPrice = Math.min(entryPrice, currentPrice);

    const stopPrice = side === 'long'
      ? highestPrice * (1 - options.trailingPercent)
      : lowestPrice * (1 + options.trailingPercent);

    stops.push({
      type: 'trailing',
      price: stopPrice,
      percent: options.trailingPercent,
      triggered: side === 'long'
        ? currentPrice <= stopPrice
        : currentPrice >= stopPrice,
    });
  }

  // ATR-based stop
  if (options.atr && options.atrMultiplier) {
    const stopPrice = side === 'long'
      ? currentPrice - options.atr * options.atrMultiplier
      : currentPrice + options.atr * options.atrMultiplier;

    stops.push({
      type: 'atr',
      price: stopPrice,
      percent: Math.abs(currentPrice - stopPrice) / currentPrice,
      triggered: side === 'long'
        ? currentPrice <= stopPrice
        : currentPrice >= stopPrice,
    });
  }

  // Volatility-based stop
  if (options.volatility && options.volatilityMultiplier) {
    const stopPrice = side === 'long'
      ? currentPrice * (1 - options.volatility * options.volatilityMultiplier)
      : currentPrice * (1 + options.volatility * options.volatilityMultiplier);

    stops.push({
      type: 'volatility',
      price: stopPrice,
      percent: options.volatility * options.volatilityMultiplier,
      triggered: side === 'long'
        ? currentPrice <= stopPrice
        : currentPrice >= stopPrice,
    });
  }

  // Support-based stop
  if (options.supportLevel) {
    const stopPrice = options.supportLevel;

    stops.push({
      type: 'support',
      price: stopPrice,
      percent: Math.abs(currentPrice - stopPrice) / currentPrice,
      triggered: side === 'long'
        ? currentPrice <= stopPrice
        : currentPrice >= stopPrice,
    });
  }

  return stops;
}

/**
 * Check stop loss triggers
 */
export function checkStopLosses(
  positions: Position[],
  stopOptions: Map<string, Parameters<typeof calculateStopLoss>[1]>
): RiskAction[] {
  const actions: RiskAction[] = [];

  positions.forEach(position => {
    const options = stopOptions.get(position.symbol);
    if (!options) return;

    const stops = calculateStopLoss(position, options);

    for (const stop of stops) {
      if (stop.triggered) {
        actions.push({
          type: 'close_position',
          symbol: position.symbol,
          reason: `${stop.type} stop loss triggered at $${stop.price.toFixed(2)} (${(stop.percent * 100).toFixed(1)}%)`,
          urgency: 'high',
        });
        break; // Only one stop action per position
      }
    }
  });

  return actions;
}

// ============================================================================
// VOLATILITY TARGETING
// ============================================================================

/**
 * Calculate portfolio volatility from position volatilities and correlations
 */
export function calculatePortfolioVolatility(
  positions: Position[],
  volatilities: Map<string, number>,
  correlations: Map<string, Map<string, number>>,
  portfolioValue: number
): number {
  let variance = 0;

  for (let i = 0; i < positions.length; i++) {
    const posI = positions[i];
    const volI = volatilities.get(posI.symbol) || 0;
    const weightI = posI.marketValue / portfolioValue;

    for (let j = 0; j < positions.length; j++) {
      const posJ = positions[j];
      const volJ = volatilities.get(posJ.symbol) || 0;
      const weightJ = posJ.marketValue / portfolioValue;

      const corr = correlations.get(posI.symbol)?.get(posJ.symbol) || 0;

      variance += weightI * weightJ * volI * volJ * corr;
    }
  }

  return Math.sqrt(variance);
}

/**
 * Adjust positions to target volatility
 */
export function adjustForVolatilityTarget(
  portfolio: Portfolio,
  currentVolatility: number,
  targetVolatility: number,
  maxAdjustment: number = 0.30 // Max 30% position adjustment
): RiskAction {
  if (currentVolatility <= 0) {
    return {
      type: 'rebalance',
      reason: 'Cannot adjust - zero volatility',
      urgency: 'low',
    };
  }

  const scaleFactor = targetVolatility / currentVolatility;

  if (Math.abs(1 - scaleFactor) < 0.05) {
    return {
      type: 'rebalance',
      reason: 'Volatility close to target',
      urgency: 'low',
    };
  }

  // Limit adjustment
  const adjustedScale = Math.max(1 - maxAdjustment, Math.min(1 + maxAdjustment, scaleFactor));

  return {
    type: 'adjust_leverage',
    targetValue: adjustedScale,
    reason: `Adjust portfolio by ${(adjustedScale * 100 - 100).toFixed(1)}% to target ${(targetVolatility * 100).toFixed(1)}% volatility (current: ${(currentVolatility * 100).toFixed(1)}%)`,
    urgency: Math.abs(1 - scaleFactor) > 0.3 ? 'high' : 'medium',
  };
}

// ============================================================================
// VAR-BASED RISK MANAGEMENT
// ============================================================================

/**
 * Calculate Value at Risk (parametric)
 */
export function calculateVaR(
  portfolioValue: number,
  portfolioVolatility: number,
  expectedReturn: number,
  confidenceLevel: number = 0.95,
  timeHorizon: number = 1 // days
): number {
  // Z-scores for common confidence levels
  const zScores: { [key: number]: number } = {
    0.90: 1.28,
    0.95: 1.65,
    0.99: 2.33,
  };

  const z = zScores[confidenceLevel] || 1.65;

  // VaR = Portfolio Value * (Expected Return - Z * Volatility * sqrt(T))
  const dailyVol = portfolioVolatility / Math.sqrt(252);
  const varAmount = portfolioValue * (
    expectedReturn / 252 * timeHorizon - z * dailyVol * Math.sqrt(timeHorizon)
  );

  return Math.abs(varAmount);
}

/**
 * Calculate Conditional VaR (Expected Shortfall)
 */
export function calculateCVaR(
  portfolioValue: number,
  portfolioVolatility: number,
  expectedReturn: number,
  confidenceLevel: number = 0.95
): number {
  const zScores: { [key: number]: number } = {
    0.90: 1.28,
    0.95: 1.65,
    0.99: 2.33,
  };

  const z = zScores[confidenceLevel] || 1.65;
  const dailyVol = portfolioVolatility / Math.sqrt(252);

  // CVaR = μ - σ * φ(z) / (1 - α)
  // where φ is the standard normal PDF
  const phi = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

  const cvarAmount = portfolioValue * (
    expectedReturn / 252 - dailyVol * phi(z) / (1 - confidenceLevel)
  );

  return Math.abs(cvarAmount);
}

// ============================================================================
// CONCENTRATION RISK
// ============================================================================

/**
 * Calculate portfolio concentration metrics
 */
export function calculateConcentrationMetrics(
  positions: Position[],
  portfolioValue: number
): {
  top3Concentration: number;
  herfindahlIndex: number;
  effectiveN: number;
} {
  // Calculate weights
  const weights = positions.map(p => Math.abs(p.marketValue) / portfolioValue);

  // Sort by weight descending
  const sortedWeights = [...weights].sort((a, b) => b - a);

  // Top 3 concentration
  const top3Concentration = sortedWeights.slice(0, 3).reduce((sum, w) => sum + w, 0);

  // Herfindahl-Hirschman Index
  const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);

  // Effective N (inverse HHI)
  const effectiveN = herfindahlIndex > 0 ? 1 / herfindahlIndex : 0;

  return {
    top3Concentration,
    herfindahlIndex,
    effectiveN,
  };
}

/**
 * Check concentration limits
 */
export function checkConcentrationLimits(
  positions: Position[],
  portfolioValue: number,
  limits: RiskLimits
): RiskAction[] {
  const actions: RiskAction[] = [];
  const metrics = calculateConcentrationMetrics(positions, portfolioValue);

  // Top 3 concentration
  if (metrics.top3Concentration > limits.maxTop3Holdings) {
    actions.push({
      type: 'rebalance',
      reason: `Top 3 holdings concentration ${(metrics.top3Concentration * 100).toFixed(1)}% exceeds ${(limits.maxTop3Holdings * 100).toFixed(1)}%`,
      urgency: 'medium',
    });
  }

  // Minimum positions
  if (positions.length < limits.minPositions) {
    actions.push({
      type: 'rebalance',
      reason: `Only ${positions.length} positions, minimum is ${limits.minPositions}`,
      urgency: 'low',
    });
  }

  // Low diversification (HHI > 0.25 = high concentration)
  if (metrics.herfindahlIndex > 0.25) {
    actions.push({
      type: 'rebalance',
      reason: `Low diversification (HHI: ${metrics.herfindahlIndex.toFixed(2)}, Effective N: ${metrics.effectiveN.toFixed(1)})`,
      urgency: 'medium',
    });
  }

  return actions;
}

// ============================================================================
// COMPREHENSIVE RISK CHECK
// ============================================================================

export interface RiskCheckResult {
  timestamp: number;
  metrics: RiskMetrics;
  actions: RiskAction[];
  riskScore: number; // 0-100, higher = more risk
  status: 'safe' | 'warning' | 'danger' | 'critical';
}

/**
 * Comprehensive risk check
 */
export function comprehensiveRiskCheck(
  portfolio: Portfolio,
  historicalValues: number[],
  returns: number[],
  options: {
    limits?: Partial<RiskLimits>;
    volatilities?: Map<string, number>;
    correlations?: Map<string, Map<string, number>>;
    stopOptions?: Map<string, Parameters<typeof calculateStopLoss>[1]>;
  } = {}
): RiskCheckResult {
  const limits = { ...DEFAULT_RISK_LIMITS, ...options.limits };
  const actions: RiskAction[] = [];

  // Calculate drawdowns
  const drawdowns = calculateDrawdown(historicalValues);

  // Calculate exposures
  const exposures = calculateExposures(portfolio);

  // Calculate concentration
  const concentration = calculateConcentrationMetrics(
    portfolio.positions,
    portfolio.totalValue
  );

  // Calculate portfolio volatility
  let portfolioVolatility = 0;
  if (options.volatilities && options.correlations) {
    portfolioVolatility = calculatePortfolioVolatility(
      portfolio.positions,
      options.volatilities,
      options.correlations,
      portfolio.totalValue
    );
  } else if (returns.length > 0) {
    // Calculate from returns
    const dailyVol = Math.sqrt(
      returns.reduce((sum, r) => sum + r * r, 0) / returns.length
    );
    portfolioVolatility = dailyVol * Math.sqrt(252);
  }

  // Calculate VaR
  const expectedReturn = returns.length > 0
    ? returns.reduce((sum, r) => sum + r, 0) / returns.length * 252
    : 0;

  const var95 = calculateVaR(portfolio.totalValue, portfolioVolatility, expectedReturn, 0.95);
  const var99 = calculateVaR(portfolio.totalValue, portfolioVolatility, expectedReturn, 0.99);
  const cvar95 = calculateCVaR(portfolio.totalValue, portfolioVolatility, expectedReturn, 0.95);
  const cvar99 = calculateCVaR(portfolio.totalValue, portfolioVolatility, expectedReturn, 0.99);

  // Build metrics
  const metrics: RiskMetrics = {
    currentDrawdown: drawdowns.current,
    maxDrawdown: drawdowns.max,
    avgDrawdown: drawdowns.avg,
    drawdownDuration: drawdowns.duration,

    portfolioVolatility,
    dailyVolatility: portfolioVolatility / Math.sqrt(252),
    annualizedVolatility: portfolioVolatility,

    var95: var95 / portfolio.totalValue,
    var99: var99 / portfolio.totalValue,
    cvar95: cvar95 / portfolio.totalValue,
    cvar99: cvar99 / portfolio.totalValue,

    grossExposure: exposures.gross,
    netExposure: exposures.net,
    longExposure: exposures.long,
    shortExposure: exposures.short,
    leverage: exposures.leverage,

    top3Concentration: concentration.top3Concentration,
    herfindahlIndex: concentration.herfindahlIndex,
    effectiveN: concentration.effectiveN,

    avgCorrelation: 0, // TODO: Calculate
    maxCorrelation: 0,

    sharpeRatio: 0, // TODO: Calculate
    sortinoRatio: 0,
    calmarRatio: 0,
  };

  // Run all checks
  actions.push(...checkDrawdownLimits(portfolio, limits));
  actions.push(...checkExposureLimits(portfolio, limits));
  actions.push(...checkConcentrationLimits(portfolio.positions, portfolio.totalValue, limits));

  if (options.stopOptions) {
    actions.push(...checkStopLosses(portfolio.positions, options.stopOptions));
  }

  // Check VaR limits
  if (metrics.var95 > limits.maxVaR95) {
    actions.push({
      type: 'reduce_position',
      reason: `VaR 95% exceeds limit: ${(metrics.var95 * 100).toFixed(1)}% > ${(limits.maxVaR95 * 100).toFixed(1)}%`,
      urgency: 'high',
    });
  }

  // Check volatility limit
  if (metrics.annualizedVolatility > limits.maxPortfolioVolatility) {
    actions.push({
      type: 'adjust_leverage',
      reason: `Volatility exceeds limit: ${(metrics.annualizedVolatility * 100).toFixed(1)}% > ${(limits.maxPortfolioVolatility * 100).toFixed(1)}%`,
      urgency: 'medium',
    });
  }

  // Calculate risk score (0-100)
  let riskScore = 0;

  // Drawdown contribution (0-25)
  riskScore += Math.min(25, (drawdowns.current / limits.maxDrawdown) * 25);

  // Volatility contribution (0-25)
  riskScore += Math.min(25, (metrics.annualizedVolatility / limits.maxPortfolioVolatility) * 25);

  // Concentration contribution (0-25)
  riskScore += Math.min(25, concentration.herfindahlIndex * 100);

  // VaR contribution (0-25)
  riskScore += Math.min(25, (metrics.var95 / limits.maxVaR95) * 25);

  // Determine status
  let status: RiskCheckResult['status'] = 'safe';
  if (riskScore >= 80 || actions.some(a => a.urgency === 'critical')) {
    status = 'critical';
  } else if (riskScore >= 60 || actions.some(a => a.urgency === 'high')) {
    status = 'danger';
  } else if (riskScore >= 40 || actions.some(a => a.urgency === 'medium')) {
    status = 'warning';
  }

  return {
    timestamp: Date.now(),
    metrics,
    actions,
    riskScore,
    status,
  };
}

// Export all
const riskManagement = {
  // Defaults
  DEFAULT_RISK_LIMITS,

  // Drawdown
  calculateDrawdown,
  checkDrawdownLimits,

  // Position Sizing
  kellyPositionSize,
  volatilityPositionSize,
  riskParityPositionSize,
  atrPositionSize,

  // Exposure
  calculateExposures,
  checkExposureLimits,

  // Stop Loss
  calculateStopLoss,
  checkStopLosses,

  // Volatility
  calculatePortfolioVolatility,
  adjustForVolatilityTarget,

  // VaR
  calculateVaR,
  calculateCVaR,

  // Concentration
  calculateConcentrationMetrics,
  checkConcentrationLimits,

  // Comprehensive
  comprehensiveRiskCheck,
};

export default riskManagement;
