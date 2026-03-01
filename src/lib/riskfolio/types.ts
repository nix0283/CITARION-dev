/**
 * Riskfolio-Lib Integration Types
 * 
 * Portfolio optimization library with advanced methods:
 * - Hierarchical Risk Parity (HRP)
 * - Nested Clustering Optimization (NCO)
 * - Black-Litterman Model
 * - Mean-Variance Optimization
 * - Risk Parity
 */

// ============================================================================
// BASIC TYPES
// ============================================================================

export interface Asset {
  symbol: string;
  name?: string;
  prices: number[];
  returns?: number[];
}

export interface AssetReturns {
  /** Asset symbols */
  symbols: string[];
  /** Returns matrix [n_periods x n_assets] */
  returns: number[][];
  /** Mean returns */
  meanReturns: number[];
  /** Covariance matrix */
  covMatrix: number[][];
  /** Correlation matrix */
  corrMatrix: number[][];
}

// ============================================================================
// OPTIMIZATION TYPES
// ============================================================================

export interface OptimizationConfig {
  /** Optimization method */
  method: 'HRP' | 'NCO' | 'BLACK_LITTERMAN' | 'MEAN_VARIANCE' | 'RISK_PARITY' | 'MIN_VARIANCE' | 'MAX_SHARPE';
  /** Objective function */
  objective?: 'MAX_RETURN' | 'MIN_RISK' | 'MAX_SHARPE' | 'MAX_UTILITY';
  /** Risk-free rate */
  riskFreeRate?: number;
  /** Target return (for min risk with target) */
  targetReturn?: number;
  /** Target risk (for max return with target) */
  targetRisk?: number;
  /** Maximum weight per asset */
  maxWeight?: number;
  /** Minimum weight per asset */
  minWeight?: number;
  /** Long-only constraint */
  longOnly?: boolean;
}

export interface PortfolioWeights {
  /** Asset symbols */
  symbols: string[];
  /** Weight for each asset */
  weights: number[];
  /** Optimization method used */
  method: string;
  /** Expected portfolio return */
  expectedReturn: number;
  /** Expected portfolio volatility */
  expectedVolatility: number;
  /** Expected Sharpe ratio */
  expectedSharpe: number;
}

export interface OptimizationResult {
  weights: PortfolioWeights;
  metrics: PortfolioMetrics;
  diagnostics: OptimizationDiagnostics;
}

export interface PortfolioMetrics {
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  diversificationRatio: number;
  effectiveN: number;
  herfindahlIndex: number;
  concentrationRisk: number;
}

export interface OptimizationDiagnostics {
  iterations: number;
  converged: boolean;
  optimizationTime: number;
  constraintsSatisfied: boolean;
  gradientNorm?: number;
}

// ============================================================================
// HRP TYPES
// ============================================================================

export interface HRPConfig extends OptimizationConfig {
  method: 'HRP';
  /** Linkage method for hierarchical clustering */
  linkage?: 'single' | 'complete' | 'average' | 'ward';
  /** Distance metric */
  distance?: 'euclidean' | 'correlation' | 'mahalanobis';
  /** Clustering method */
  clustering?: 'Hierarchical' | 'KMeans' | 'DBSCAN';
}

export interface HRPResult extends OptimizationResult {
  linkageMatrix: number[][];
  clusters: number[];
  dendrogramOrder: number[];
  distanceMatrix: number[][];
}

// ============================================================================
// NCO TYPES
// ============================================================================

export interface NCOConfig extends OptimizationConfig {
  method: 'NCO';
  /** Number of clusters */
  nClusters?: number;
  /** Inner optimization method */
  innerMethod?: 'MIN_VARIANCE' | 'RISK_PARITY' | 'MAX_SHARPE';
  /** Covariance estimation method */
  covEstimator?: 'sample' | 'ledoit_wolf' | 'oracle_approximating';
}

export interface NCOResult extends OptimizationResult {
  clusters: Map<string, number>;
  intraClusterWeights: Map<number, number[]>;
  interClusterWeights: number[];
}

// ============================================================================
// BLACK-LITTERMAN TYPES
// ============================================================================

export interface BlackLittermanConfig extends OptimizationConfig {
  method: 'BLACK_LITTERMAN';
  /** Market capitalization weights */
  marketWeights: number[];
  /** Investor views */
  views: View[];
  /** Tau parameter (confidence in prior) */
  tau?: number;
  /** Risk aversion parameter */
  riskAversion?: number;
}

export interface View {
  /** View type */
  type: 'ABSOLUTE' | 'RELATIVE';
  /** Asset(s) involved in view */
  assets: string[];
  /** Expected return (absolute) or return difference (relative) */
  expectedReturn: number;
  /** Confidence in the view (0-1) */
  confidence: number;
}

export interface BlackLittermanResult extends OptimizationResult {
  posteriorReturns: number[];
  posteriorCovariance: number[][];
  impliedReturns: number[];
  viewsImpact: number[];
}

// ============================================================================
// RISK PARITY TYPES
// ============================================================================

export interface RiskParityConfig extends OptimizationConfig {
  method: 'RISK_PARITY';
  /** Target risk contribution per asset (optional) */
  targetRiskContributions?: number[];
  /** Risk measure */
  riskMeasure?: 'VARIANCE' | 'MAD' | 'CVAR';
}

export interface RiskParityResult extends OptimizationResult {
  riskContributions: number[];
  marginalRiskContributions: number[];
}

// ============================================================================
// EFFICIENT FRONTIER
// ============================================================================

export interface EfficientFrontierPoint {
  return: number;
  risk: number;
  sharpe: number;
  weights: number[];
}

export interface EfficientFrontier {
  points: EfficientFrontierPoint[];
  maxSharpePortfolio: EfficientFrontierPoint;
  minRiskPortfolio: EfficientFrontierPoint;
  maxReturnPortfolio: EfficientFrontierPoint;
}

// ============================================================================
// COVARIANCE ESTIMATION
// ============================================================================

export interface CovarianceEstimationConfig {
  method: 'SAMPLE' | 'LEDOIT_WOLF' | 'ORACLE_APPROXIMATING' | 'GRAPHICAL_LASSO';
  shrinkageIntensity?: number;
  /** For Ledoit-Wolf */
  shrinkageTarget?: 'IDENTITY' | 'SINGLE_FACTOR' | 'CONSTANT_CORRELATION';
}

// ============================================================================
// RISK METRICS
// ============================================================================

export interface RiskMetrics {
  /** Value at Risk (95%) */
  var95: number;
  /** Value at Risk (99%) */
  var99: number;
  /** Conditional VaR (95%) */
  cvar95: number;
  /** Conditional VaR (99%) */
  cvar99: number;
  /** Maximum Drawdown */
  maxDrawdown: number;
  /** Ulcer Index */
  ulcerIndex: number;
  /** Pain Index */
  painIndex: number;
  /** Marginal VaR */
  marginalVar: number[];
  /** Component VaR */
  componentVar: number[];
}
