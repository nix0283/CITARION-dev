/**
 * mlfinlab Integration Types
 * 
 * Implements key concepts from "Advances in Financial Machine Learning"
 * by Marcos Lopez de Prado
 */

// ============================================================================
// TRIPLE BARRIER LABELING
// ============================================================================

export interface TripleBarrierConfig {
  /** Profit taking barrier as decimal (e.g., 0.02 = 2%) */
  profitTakingBarrier: number;
  /** Stop loss barrier as decimal (e.g., 0.01 = 1%) */
  stopLossBarrier: number;
  /** Maximum holding period in bars */
  maxHoldingPeriod: number;
  /** Minimum holding period before exit */
  minHoldingPeriod?: number;
  /** Use volatility-adjusted barriers */
  volatilityAdjusted?: boolean;
  /** ATR multiplier for volatility adjustment */
  atrMultiplier?: number;
  /** Side filter: only label long (1), short (-1), or both (0) */
  sideFilter?: number;
}

export interface BarrierEvent {
  type: 'PROFIT_TAKING' | 'STOP_LOSS' | 'TIME_OUT';
  price: number;
  barIndex: number;
  timestamp: number;
  return: number;
}

export interface TripleBarrierLabel {
  /** Index of the bar where labeling started */
  startIndex: number;
  /** Index where barrier was touched */
  endIndex: number;
  /** Which barrier was touched first */
  barrier: 'PROFIT_TAKING' | 'STOP_LOSS' | 'TIME_OUT';
  /** Binary label: 1 for profit, -1 for loss, 0 for timeout */
  label: number;
  /** Return from entry to exit */
  returns: number;
  /** Price at entry */
  entryPrice: number;
  /** Price at exit */
  exitPrice: number;
  /** Holding period in bars */
  holdingPeriod: number;
  /** Event details */
  event: BarrierEvent;
}

// ============================================================================
// META LABELING
// ============================================================================

export interface MetaLabelingConfig {
  /** Primary model predictions (from primary signal) */
  primaryPredictions: number[];
  /** Actual returns */
  actualReturns: number[];
  /** Labels from triple barrier */
  tripleBarrierLabels: TripleBarrierLabel[];
  /** Minimum probability threshold for meta-label */
  probabilityThreshold?: number;
  /** Use secondary model for meta-labeling */
  useSecondaryModel?: boolean;
  /** Secondary model type */
  secondaryModelType?: 'RANDOM_FOREST' | 'LOGISTIC_REGRESSION' | 'XGBOOST' | 'SVM';
}

export interface MetaLabel {
  /** Original triple barrier label */
  tripleBarrierLabel: TripleBarrierLabel;
  /** Primary model prediction */
  primaryPrediction: number;
  /** Meta label: 1 if signal is likely correct, 0 otherwise */
  metaLabel: number;
  /** Probability from secondary model */
  probability: number;
  /** Confidence score */
  confidence: number;
  /** Feature importance for this prediction */
  featureImportance?: Record<string, number>;
}

export interface MetaLabelingResult {
  metaLabels: MetaLabel[];
  /** Average precision of primary model */
  primaryPrecision: number;
  /** Average recall of primary model */
  primaryRecall: number;
  /** Precision after meta-labeling */
  metaPrecision: number;
  /** Recall after meta-labeling */
  metaRecall: number;
  /** Improvement from meta-labeling */
  precisionImprovement: number;
  /** Number of signals bet on after meta-labeling */
  signalsUsed: number;
  /** Number of signals filtered out */
  signalsFiltered: number;
  /** Feature importance from secondary model */
  globalFeatureImportance: Record<string, number>;
}

// ============================================================================
// FRACTIONAL DIFFERENTIATION
// ============================================================================

export interface FractionalDiffConfig {
  /** Fractional order (d), typically between 0 and 1 */
  d: number;
  /** Minimum weight threshold for truncation */
  minWeight?: number;
  /** Maximum window size */
  maxWindow?: number;
  /** Method: 'EXPANSION' or 'FIXED_WINDOW' */
  method?: 'EXPANSION' | 'FIXED_WINDOW';
}

export interface FractionalDiffResult {
  /** Fractionally differenced series */
  series: number[];
  /** Original series length */
  originalLength: number;
  /** Effective length after differencing */
  effectiveLength: number;
  /** Fractional order used */
  d: number;
  /** Memory preserved (correlation with original) */
  memoryPreserved: number;
  /** Augmented Dickey-Fuller test p-value */
  adfPValue: number;
  /** Whether series is stationary */
  isStationary: boolean;
  /** Weights used for differencing */
  weights: number[];
}

// ============================================================================
// BET SIZING
// ============================================================================

export interface BetSizingConfig {
  /** Method for bet sizing */
  method: 'KELLY' | 'PROBABILITY_WEIGHTED' | 'CONCURRENT_BETS' | 'META_LABEL_WEIGHTED';
  /** Maximum position size as fraction */
  maxSize: number;
  /** Minimum position size as fraction */
  minSize: number;
  /** Average win rate for Kelly */
  winRate?: number;
  /** Average win/loss ratio for Kelly */
  winLossRatio?: number;
  /** Fraction of Kelly to use (for fractional Kelly) */
  kellyFraction?: number;
  /** Concurrent bet adjustment factor */
  concurrentAdjustment?: number;
}

export interface BetSize {
  /** Position size as fraction of portfolio */
  size: number;
  /** Direction: 1 for long, -1 for short */
  direction: number;
  /** Confidence in the bet */
  confidence: number;
  /** Method used to calculate size */
  method: string;
  /** Raw Kelly fraction (if applicable) */
  kellyFraction?: number;
  /** Adjusted size after risk management */
  adjustedSize: number;
  /** Reason for any adjustments */
  adjustmentReason?: string;
}

// ============================================================================
// FEATURES
// ============================================================================

export interface FinancialFeatures {
  /** Price-based features */
  price: {
    returns: number[];
    logReturns: number[];
    fractionalDiff: number[];
    volatility: number[];
    momentum: number[];
  };
  /** Volume-based features */
  volume: {
    volumeRatio: number[];
    obv: number[];
    vwap: number[];
  };
  /** Microstructure features */
  microstructure: {
    rollMeasure: number[];
    rollImpact: number[];
    kyleLambda: number[];
    amihud: number[];
  };
  /** Technical indicators */
  technical: {
    rsi: number[];
    macd: number[];
    bollingerBands: { upper: number[]; middle: number[]; lower: number[] };
    atr: number[];
    adx: number[];
  };
}

// ============================================================================
// SAMPLING
// ============================================================================

export interface SamplingConfig {
  /** Type of sampling */
  type: 'TIME' | 'TICK' | 'VOLUME' | 'DOLLAR';
  /** Bars per sample */
  barsPerSample?: number;
  /** Threshold for volume/dollar bars */
  threshold?: number;
}

export interface SampledBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  ticks: number;
}

// ============================================================================
// CROSS-VALIDATION
// ============================================================================

export interface PurgedKFoldConfig {
  /** Number of folds */
  nSplits: number;
  /** Embargo period (bars to exclude after each train set) */
  embargo: number;
  /** Purge period (bars to exclude before each test set) */
  purge: number;
}

export interface CVSplit {
  trainIndices: number[];
  testIndices: number[];
  trainStart: number;
  trainEnd: number;
  testStart: number;
  testEnd: number;
}

// ============================================================================
// COMBINED RESULT
// ============================================================================

export interface MLFinLabResult {
  tripleBarrier: TripleBarrierLabel[];
  metaLabeling: MetaLabelingResult;
  fractionalDiff: FractionalDiffResult;
  betSizing: BetSize[];
  features: FinancialFeatures;
  metrics: {
    avgHoldingPeriod: number;
    hitRate: number;
    avgReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}
