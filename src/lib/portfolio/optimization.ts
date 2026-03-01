/**
 * Portfolio Optimization Module
 * Inspired by QuantConnect LEAN Algorithm Framework
 *
 * Implements multiple portfolio optimization strategies:
 * - Mean-Variance Optimization (Markowitz)
 * - Risk Parity
 * - Black-Litterman Model
 * - Minimum Variance Portfolio
 * - Maximum Sharpe Ratio Portfolio
 * - Equal Weight Portfolio
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AssetReturn {
  symbol: string;
  returns: number[];
  meanReturn: number;
  volatility: number;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
}

export interface CovarianceMatrix {
  symbols: string[];
  matrix: number[][];
}

export interface PortfolioWeights {
  [symbol: string]: number;
}

export interface PortfolioMetrics {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  var95: number; // Value at Risk 95%
  cvar95: number; // Conditional VaR 95%
}

export interface OptimizedPortfolio {
  weights: PortfolioWeights;
  metrics: PortfolioMetrics;
  method: string;
  timestamp: number;
}

export interface OptimizationConfig {
  riskFreeRate: number;
  targetReturn?: number;
  targetRisk?: number;
  minWeight?: number;
  maxWeight?: number;
  maxIterations?: number;
  tolerance?: number;
}

export interface BlackLittermanConfig extends OptimizationConfig {
  marketWeights: PortfolioWeights;
  investorViews: InvestorView[];
  tau: number; // Scaling factor for prior (typically 0.025)
}

export interface InvestorView {
  assets: string[];
  weights: number[];
  expectedReturn: number;
  confidence: number; // 0-1
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate mean of an array
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Calculate covariance between two arrays
 */
function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const meanX = mean(x);
  const meanY = mean(y);
  const sum = x.reduce((acc, xi, i) => acc + (xi - meanX) * (y[i] - meanY), 0);
  return sum / (x.length - 1);
}

/**
 * Calculate correlation between two arrays
 */
function correlation(x: number[], y: number[]): number {
  const cov = covariance(x, y);
  const stdX = stdDev(x);
  const stdY = stdDev(y);
  if (stdX === 0 || stdY === 0) return 0;
  return cov / (stdX * stdY);
}

/**
 * Matrix multiplication
 */
function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result: number[][] = [];

  for (let i = 0; i < rowsA; i++) {
    result[i] = [];
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }

  return result;
}

/**
 * Matrix transpose
 */
function transpose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0].length;
  const result: number[][] = [];

  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = A[i][j];
    }
  }

  return result;
}

/**
 * Matrix inverse using Gauss-Jordan elimination
 */
function matrixInverse(A: number[][]): number[][] | null {
  const n = A.length;
  const augmented: number[][] = A.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    if (Math.abs(augmented[i][i]) < 1e-10) return null;

    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j < 2 * n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // Back substitution
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i - 1; j >= 0; j--) {
      const factor = augmented[j][i] / augmented[i][i];
      for (let k = 0; k < 2 * n; k++) {
        augmented[j][k] -= factor * augmented[i][k];
      }
    }
  }

  // Normalize
  for (let i = 0; i < n; i++) {
    const divisor = augmented[i][i];
    for (let j = n; j < 2 * n; j++) {
      augmented[i][j] /= divisor;
    }
  }

  return augmented.map(row => row.slice(n));
}

/**
 * Calculate portfolio volatility
 */
function portfolioVolatility(
  weights: number[],
  covarianceMatrix: number[][]
): number {
  const n = weights.length;
  let variance = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covarianceMatrix[i][j];
    }
  }

  return Math.sqrt(variance);
}

/**
 * Calculate portfolio expected return
 */
function portfolioReturn(
  weights: number[],
  expectedReturns: number[]
): number {
  return weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
}

// ============================================================================
// CALCULATE RETURNS AND MATRICES
// ============================================================================

/**
 * Calculate asset returns from price data
 */
export function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    } else {
      returns.push(0);
    }
  }
  return returns;
}

/**
 * Calculate log returns from price data
 */
export function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    } else {
      returns.push(0);
    }
  }
  return returns;
}

/**
 * Calculate covariance matrix from returns data
 */
export function calculateCovarianceMatrix(
  returnsData: Map<string, number[]>
): CovarianceMatrix {
  const symbols = Array.from(returnsData.keys());
  const n = symbols.length;
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      const returnsI = returnsData.get(symbols[i]) || [];
      const returnsJ = returnsData.get(symbols[j]) || [];
      matrix[i][j] = covariance(returnsI, returnsJ);
    }
  }

  return { symbols, matrix };
}

/**
 * Calculate correlation matrix from returns data
 */
export function calculateCorrelationMatrix(
  returnsData: Map<string, number[]>
): CorrelationMatrix {
  const symbols = Array.from(returnsData.keys());
  const n = symbols.length;
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      const returnsI = returnsData.get(symbols[i]) || [];
      const returnsJ = returnsData.get(symbols[j]) || [];
      matrix[i][j] = correlation(returnsI, returnsJ);
    }
  }

  return { symbols, matrix };
}

/**
 * Calculate expected returns for each asset
 */
export function calculateExpectedReturns(
  returnsData: Map<string, number[]>
): Map<string, number> {
  const expectedReturns = new Map<string, number>();

  returnsData.forEach((returns, symbol) => {
    expectedReturns.set(symbol, mean(returns));
  });

  return expectedReturns;
}

// ============================================================================
// OPTIMIZATION METHODS
// ============================================================================

/**
 * Equal Weight Portfolio
 * Simple baseline: each asset gets 1/n weight
 */
export function equalWeightPortfolio(symbols: string[]): OptimizedPortfolio {
  const n = symbols.length;
  const weight = 1 / n;
  const weights: PortfolioWeights = {};

  symbols.forEach(symbol => {
    weights[symbol] = weight;
  });

  return {
    weights,
    metrics: {
      expectedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      var95: 0,
      cvar95: 0,
    },
    method: 'Equal Weight',
    timestamp: Date.now(),
  };
}

/**
 * Minimum Variance Portfolio
 * Find weights that minimize portfolio variance
 */
export function minimumVariancePortfolio(
  covarianceMatrix: CovarianceMatrix,
  config: OptimizationConfig = { riskFreeRate: 0.02 }
): OptimizedPortfolio | null {
  const { symbols, matrix } = covarianceMatrix;
  const n = symbols.length;

  // Add regularization to ensure invertibility
  const regularizedMatrix = matrix.map((row, i) =>
    row.map((val, j) => val + (i === j ? 1e-8 : 0))
  );

  const invMatrix = matrixInverse(regularizedMatrix);
  if (!invMatrix) return null;

  // Ones vector
  const ones = Array(n).fill(1);

  // Calculate minimum variance weights: w = Σ^(-1) * 1 / (1' * Σ^(-1) * 1)
  const invOnes = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      invOnes[i] += invMatrix[i][j] * ones[j];
    }
  }

  const denominator = invOnes.reduce((sum, val) => sum + val, 0);
  const weights = invOnes.map(val => val / denominator);

  // Apply weight constraints
  const constrainedWeights = applyWeightConstraints(weights, config);

  const portfolioWeights: PortfolioWeights = {};
  symbols.forEach((symbol, i) => {
    portfolioWeights[symbol] = constrainedWeights[i];
  });

  return {
    weights: portfolioWeights,
    metrics: {
      expectedReturn: 0,
      volatility: portfolioVolatility(constrainedWeights, matrix),
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      var95: 0,
      cvar95: 0,
    },
    method: 'Minimum Variance',
    timestamp: Date.now(),
  };
}

/**
 * Maximum Sharpe Ratio Portfolio (Tangency Portfolio)
 * Find weights that maximize risk-adjusted return
 */
export function maximumSharpePortfolio(
  covarianceMatrix: CovarianceMatrix,
  expectedReturns: Map<string, number>,
  config: OptimizationConfig = { riskFreeRate: 0.02 }
): OptimizedPortfolio | null {
  const { symbols, matrix } = covarianceMatrix;
  const n = symbols.length;

  const returns = symbols.map(s => expectedReturns.get(s) || 0);
  const excessReturns = returns.map(r => r - config.riskFreeRate / 252);

  // Add regularization
  const regularizedMatrix = matrix.map((row, i) =>
    row.map((val, j) => val + (i === j ? 1e-8 : 0))
  );

  const invMatrix = matrixInverse(regularizedMatrix);
  if (!invMatrix) return null;

  // Calculate Sharpe-maximizing weights: w = Σ^(-1) * (μ - rf) / (1' * Σ^(-1) * (μ - rf))
  const invExcess = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      invExcess[i] += invMatrix[i][j] * excessReturns[j];
    }
  }

  const denominator = invExcess.reduce((sum, val) => sum + val, 0);
  if (Math.abs(denominator) < 1e-10) return null;

  const weights = invExcess.map(val => val / denominator);

  // Apply weight constraints
  const constrainedWeights = applyWeightConstraints(weights, config);

  // Normalize to sum to 1
  const sum = constrainedWeights.reduce((s, w) => s + Math.max(0, w), 0);
  const normalizedWeights = constrainedWeights.map(w => Math.max(0, w) / sum);

  const portfolioWeights: PortfolioWeights = {};
  symbols.forEach((symbol, i) => {
    portfolioWeights[symbol] = normalizedWeights[i];
  });

  const vol = portfolioVolatility(normalizedWeights, matrix);
  const ret = portfolioReturn(normalizedWeights, returns);

  return {
    weights: portfolioWeights,
    metrics: {
      expectedReturn: ret * 252,
      volatility: vol * Math.sqrt(252),
      sharpeRatio: (ret * 252 - config.riskFreeRate) / (vol * Math.sqrt(252)),
      sortinoRatio: 0,
      maxDrawdown: 0,
      var95: 0,
      cvar95: 0,
    },
    method: 'Maximum Sharpe Ratio',
    timestamp: Date.now(),
  };
}

/**
 * Risk Parity Portfolio
 * Each asset contributes equally to portfolio risk
 */
export function riskParityPortfolio(
  covarianceMatrix: CovarianceMatrix,
  config: OptimizationConfig = { riskFreeRate: 0.02 }
): OptimizedPortfolio {
  const { symbols, matrix } = covarianceMatrix;
  const n = symbols.length;

  // Initial weights
  let weights = Array(n).fill(1 / n);
  const maxIterations = config.maxIterations || 1000;
  const tolerance = config.tolerance || 1e-8;

  for (let iter = 0; iter < maxIterations; iter++) {
    // Calculate marginal risk contribution
    const portfolioVol = portfolioVolatility(weights, matrix);
    const marginalRisk: number[] = [];

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += weights[j] * matrix[i][j];
      }
      marginalRisk.push(sum / portfolioVol);
    }

    // Risk contribution of each asset
    const riskContrib = weights.map((w, i) => w * marginalRisk[i]);
    const totalRiskContrib = riskContrib.reduce((sum, rc) => sum + rc, 0);

    // Target risk contribution (equal)
    const targetRiskContrib = totalRiskContrib / n;

    // Update weights
    const newWeights = weights.map((w, i) => {
      if (riskContrib[i] > 0) {
        return w * targetRiskContrib / riskContrib[i];
      }
      return w;
    });

    // Normalize
    const sum = newWeights.reduce((s, w) => s + Math.max(0, w), 0);
    const normalizedWeights = newWeights.map(w => Math.max(0, w) / sum);

    // Check convergence
    const diff = weights.reduce((max, w, i) => Math.max(max, Math.abs(w - normalizedWeights[i])), 0);
    weights = normalizedWeights;

    if (diff < tolerance) break;
  }

  // Apply constraints
  const constrainedWeights = applyWeightConstraints(weights, config);

  const portfolioWeights: PortfolioWeights = {};
  symbols.forEach((symbol, i) => {
    portfolioWeights[symbol] = constrainedWeights[i];
  });

  return {
    weights: portfolioWeights,
    metrics: {
      expectedReturn: 0,
      volatility: portfolioVolatility(constrainedWeights, matrix),
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      var95: 0,
      cvar95: 0,
    },
    method: 'Risk Parity',
    timestamp: Date.now(),
  };
}

/**
 * Mean-Variance Optimization (Markowitz)
 * Find optimal weights for given target return or target risk
 */
export function meanVarianceOptimization(
  covarianceMatrix: CovarianceMatrix,
  expectedReturns: Map<string, number>,
  config: OptimizationConfig & { targetReturn?: number }
): OptimizedPortfolio | null {
  const { symbols, matrix } = covarianceMatrix;
  const n = symbols.length;

  const returns = symbols.map(s => expectedReturns.get(s) || 0);
  const targetReturn = config.targetReturn || mean(returns);

  // Add regularization
  const regularizedMatrix = matrix.map((row, i) =>
    row.map((val, j) => val + (i === j ? 1e-8 : 0))
  );

  const invMatrix = matrixInverse(regularizedMatrix);
  if (!invMatrix) return null;

  // Calculate Lagrangian multipliers
  const ones = Array(n).fill(1);

  // A = 1' * Σ^(-1) * 1
  let A = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      A += ones[i] * invMatrix[i][j] * ones[j];
    }
  }

  // B = 1' * Σ^(-1) * μ
  let B = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      B += ones[i] * invMatrix[i][j] * returns[j];
    }
  }

  // C = μ' * Σ^(-1) * μ
  let C = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      C += returns[i] * invMatrix[i][j] * returns[j];
    }
  }

  // D = A*C - B*B
  const D = A * C - B * B;

  if (Math.abs(D) < 1e-10) return null;

  // Lagrangian multipliers
  const lambda = (C - targetReturn * B) / D;
  const gamma = (targetReturn * A - B) / D;

  // Calculate weights: w = Σ^(-1) * (λ * 1 + γ * μ)
  const weights = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      weights[i] += invMatrix[i][j] * (lambda * ones[j] + gamma * returns[j]);
    }
  }

  // Apply constraints
  const constrainedWeights = applyWeightConstraints(weights, config);

  const portfolioWeights: PortfolioWeights = {};
  symbols.forEach((symbol, i) => {
    portfolioWeights[symbol] = constrainedWeights[i];
  });

  const vol = portfolioVolatility(constrainedWeights, matrix);
  const ret = portfolioReturn(constrainedWeights, returns);

  return {
    weights: portfolioWeights,
    metrics: {
      expectedReturn: ret * 252,
      volatility: vol * Math.sqrt(252),
      sharpeRatio: (ret * 252 - config.riskFreeRate) / (vol * Math.sqrt(252)),
      sortinoRatio: 0,
      maxDrawdown: 0,
      var95: 0,
      cvar95: 0,
    },
    method: 'Mean-Variance Optimization',
    timestamp: Date.now(),
  };
}

/**
 * Black-Litterman Model
 * Combines market equilibrium with investor views
 */
export function blackLittermanPortfolio(
  covarianceMatrix: CovarianceMatrix,
  config: BlackLittermanConfig
): OptimizedPortfolio | null {
  const { symbols, matrix } = covarianceMatrix;
  const n = symbols.length;

  // Market capitalization weights (prior)
  const marketWeights = symbols.map(s => config.marketWeights[s] || 1 / n);

  // Calculate implied equilibrium returns: Π = λ * Σ * w_market
  const riskAversion = 2.5; // Typical value
  const impliedReturns = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      impliedReturns[i] += riskAversion * matrix[i][j] * marketWeights[j];
    }
  }

  // Process investor views
  const { investorViews } = config;
  const k = investorViews.length;

  if (k === 0) {
    // No views, return equilibrium portfolio
    const portfolioWeights: PortfolioWeights = {};
    symbols.forEach((symbol, i) => {
      portfolioWeights[symbol] = marketWeights[i];
    });
    return {
      weights: portfolioWeights,
      metrics: {
        expectedReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        var95: 0,
        cvar95: 0,
      },
      method: 'Black-Litterman (No Views)',
      timestamp: Date.now(),
    };
  }

  // Build P matrix (picking matrix for views)
  const P: number[][] = Array(k).fill(null).map(() => Array(n).fill(0));
  const Q: number[] = [];

  investorViews.forEach((view, viewIdx) => {
    view.assets.forEach((asset, assetIdx) => {
      const symbolIdx = symbols.indexOf(asset);
      if (symbolIdx >= 0) {
        P[viewIdx][symbolIdx] = view.weights[assetIdx];
      }
    });
    Q.push(view.expectedReturn);
  });

  // Omega matrix (uncertainty of views)
  const tau = config.tau || 0.025;
  const Omega: number[][] = Array(k).fill(null).map(() => Array(k).fill(0));
  investorViews.forEach((view, i) => {
    // Scale uncertainty by confidence
    Omega[i][i] = (1 - view.confidence) * 0.01;
  });

  // Black-Litterman formula for posterior returns
  // E[R] = Π + τ * Σ * P' * (P * τ * Σ * P' + Ω)^(-1) * (Q - P * Π)

  const tauSigma = matrix.map(row => row.map(val => tau * val));

  // P * τ * Σ
  const PtauSigma = Array(k).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < n; j++) {
      for (let l = 0; l < n; l++) {
        PtauSigma[i][j] += P[i][l] * tauSigma[l][j];
      }
    }
  }

  // P * τ * Σ * P'
  const PtauSigmaPt = Array(k).fill(null).map(() => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      for (let l = 0; l < n; l++) {
        PtauSigmaPt[i][j] += PtauSigma[i][l] * P[j][l];
      }
    }
  }

  // P * τ * Σ * P' + Ω
  const M = PtauSigmaPt.map((row, i) => row.map((val, j) => val + Omega[i][j]));

  // (P * τ * Σ * P' + Ω)^(-1)
  const invM = matrixInverse(M);
  if (!invM) return null;

  // Q - P * Π
  const Pimplied = Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < n; j++) {
      Pimplied[i] += P[i][j] * impliedReturns[j];
    }
  }
  const QminusPimplied = Q.map((q, i) => q - Pimplied[i]);

  // τ * Σ * P' * invM * (Q - P * Π)
  const adjustment = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      for (let l = 0; l < k; l++) {
        adjustment[i] += tauSigma[i][j] * P[l][j] * invM[l][j] * QminusPimplied[l];
      }
    }
  }

  // Posterior returns
  const posteriorReturns = impliedReturns.map((r, i) => r + adjustment[i]);

  // Calculate optimal weights
  const regularizedMatrix = matrix.map((row, i) =>
    row.map((val, j) => val + (i === j ? 1e-8 : 0))
  );
  const invMatrix = matrixInverse(regularizedMatrix);
  if (!invMatrix) return null;

  const rawWeights = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rawWeights[i] += invMatrix[i][j] * posteriorReturns[j] / riskAversion;
    }
  }

  // Normalize
  const sum = rawWeights.reduce((s, w) => s + Math.max(0, w), 0);
  const weights = rawWeights.map(w => Math.max(0, w) / sum);

  // Apply constraints
  const constrainedWeights = applyWeightConstraints(weights, config);

  const portfolioWeights: PortfolioWeights = {};
  symbols.forEach((symbol, i) => {
    portfolioWeights[symbol] = constrainedWeights[i];
  });

  const vol = portfolioVolatility(constrainedWeights, matrix);
  const ret = portfolioReturn(constrainedWeights, posteriorReturns);

  return {
    weights: portfolioWeights,
    metrics: {
      expectedReturn: ret * 252,
      volatility: vol * Math.sqrt(252),
      sharpeRatio: (ret * 252 - config.riskFreeRate) / (vol * Math.sqrt(252)),
      sortinoRatio: 0,
      maxDrawdown: 0,
      var95: 0,
      cvar95: 0,
    },
    method: 'Black-Litterman',
    timestamp: Date.now(),
  };
}

/**
 * Apply weight constraints (min/max weights)
 */
function applyWeightConstraints(
  weights: number[],
  config: OptimizationConfig
): number[] {
  const minWeight = config.minWeight ?? 0;
  const maxWeight = config.maxWeight ?? 1;

  let constrained = weights.map(w => Math.max(minWeight, Math.min(maxWeight, w)));

  // Ensure weights sum to 1
  const sum = constrained.reduce((s, w) => s + w, 0);
  if (sum > 0) {
    constrained = constrained.map(w => w / sum);
  }

  return constrained;
}

// ============================================================================
// PORTFOLIO METRICS CALCULATION
// ============================================================================

/**
 * Calculate comprehensive portfolio metrics
 */
export function calculatePortfolioMetrics(
  weights: PortfolioWeights,
  returnsData: Map<string, number[]>,
  config: OptimizationConfig = { riskFreeRate: 0.02 }
): PortfolioMetrics {
  const symbols = Object.keys(weights);
  const weightArray = symbols.map(s => weights[s]);

  // Calculate portfolio returns series
  const portfolioReturns: number[] = [];
  const minLength = Math.min(...Array.from(returnsData.values()).map(r => r.length));

  for (let i = 0; i < minLength; i++) {
    let periodReturn = 0;
    symbols.forEach((symbol, idx) => {
      const assetReturns = returnsData.get(symbol) || [];
      periodReturn += weightArray[idx] * (assetReturns[i] || 0);
    });
    portfolioReturns.push(periodReturn);
  }

  // Expected return (annualized)
  const expectedReturn = mean(portfolioReturns) * 252;

  // Volatility (annualized)
  const volatility = stdDev(portfolioReturns) * Math.sqrt(252);

  // Sharpe Ratio
  const sharpeRatio = volatility > 0
    ? (expectedReturn - config.riskFreeRate) / volatility
    : 0;

  // Sortino Ratio (using downside deviation)
  const downsideReturns = portfolioReturns.filter(r => r < 0);
  const downsideDev = downsideReturns.length > 0
    ? stdDev(downsideReturns) * Math.sqrt(252)
    : 0;
  const sortinoRatio = downsideDev > 0
    ? (expectedReturn - config.riskFreeRate) / downsideDev
    : 0;

  // Maximum Drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 1;

  for (const ret of portfolioReturns) {
    cumulative *= (1 + ret);
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = (peak - cumulative) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Value at Risk (95%)
  const sortedReturns = [...portfolioReturns].sort((a, b) => a - b);
  const var95Index = Math.floor(portfolioReturns.length * 0.05);
  const var95 = sortedReturns[var95Index] || 0;

  // Conditional VaR (Expected Shortfall)
  const tailReturns = sortedReturns.slice(0, var95Index + 1);
  const cvar95 = tailReturns.length > 0 ? mean(tailReturns) : 0;

  return {
    expectedReturn,
    volatility,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    var95,
    cvar95,
  };
}

// ============================================================================
// EFFICIENT FRONTIER
// ============================================================================

export interface EfficientFrontierPoint {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  weights: PortfolioWeights;
}

/**
 * Calculate Efficient Frontier
 */
export function calculateEfficientFrontier(
  covarianceMatrix: CovarianceMatrix,
  expectedReturns: Map<string, number>,
  config: OptimizationConfig = { riskFreeRate: 0.02 },
  numPoints: number = 20
): EfficientFrontierPoint[] {
  const { symbols, matrix } = covarianceMatrix;
  const returns = symbols.map(s => expectedReturns.get(s) || 0);

  const minReturn = Math.min(...returns);
  const maxReturn = Math.max(...returns);
  const step = (maxReturn - minReturn) / (numPoints - 1);

  const frontier: EfficientFrontierPoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const targetReturn = minReturn + i * step;
    const result = meanVarianceOptimization(covarianceMatrix, expectedReturns, {
      ...config,
      targetReturn,
    });

    if (result) {
      frontier.push({
        expectedReturn: result.metrics.expectedReturn,
        volatility: result.metrics.volatility,
        sharpeRatio: result.metrics.sharpeRatio,
        weights: result.weights,
      });
    }
  }

  return frontier.sort((a, b) => a.volatility - b.volatility);
}

// ============================================================================
// COMPREHENSIVE OPTIMIZATION
// ============================================================================

export interface ComprehensiveOptimizationResult {
  portfolios: {
    equalWeight: OptimizedPortfolio;
    minimumVariance: OptimizedPortfolio | null;
    maximumSharpe: OptimizedPortfolio | null;
    riskParity: OptimizedPortfolio;
    meanVariance: OptimizedPortfolio | null;
  };
  efficientFrontier: EfficientFrontierPoint[];
  metrics: {
    symbols: string[];
    expectedReturns: Map<string, number>;
    covarianceMatrix: CovarianceMatrix;
    correlationMatrix: CorrelationMatrix;
  };
}

/**
 * Run all optimization methods
 */
export function comprehensiveOptimization(
  returnsData: Map<string, number[]>,
  config: OptimizationConfig = { riskFreeRate: 0.02 }
): ComprehensiveOptimizationResult {
  const symbols = Array.from(returnsData.keys());

  // Calculate matrices
  const covarianceMatrix = calculateCovarianceMatrix(returnsData);
  const correlationMatrix = calculateCorrelationMatrix(returnsData);
  const expectedReturns = calculateExpectedReturns(returnsData);

  // Run optimizations
  const equalWeight = equalWeightPortfolio(symbols);
  const minimumVariance = minimumVariancePortfolio(covarianceMatrix, config);
  const maximumSharpe = maximumSharpePortfolio(covarianceMatrix, expectedReturns, config);
  const riskParity = riskParityPortfolio(covarianceMatrix, config);
  const meanVariance = meanVarianceOptimization(covarianceMatrix, expectedReturns, config);

  // Calculate efficient frontier
  const efficientFrontier = calculateEfficientFrontier(covarianceMatrix, expectedReturns, config);

  return {
    portfolios: {
      equalWeight,
      minimumVariance,
      maximumSharpe,
      riskParity,
      meanVariance,
    },
    efficientFrontier,
    metrics: {
      symbols,
      expectedReturns,
      covarianceMatrix,
      correlationMatrix,
    },
  };
}

// Export all functions
const portfolioOptimization = {
  // Utilities
  calculateReturns,
  calculateLogReturns,
  calculateCovarianceMatrix,
  calculateCorrelationMatrix,
  calculateExpectedReturns,

  // Optimization Methods
  equalWeightPortfolio,
  minimumVariancePortfolio,
  maximumSharpePortfolio,
  riskParityPortfolio,
  meanVarianceOptimization,
  blackLittermanPortfolio,

  // Metrics
  calculatePortfolioMetrics,

  // Efficient Frontier
  calculateEfficientFrontier,

  // Comprehensive
  comprehensiveOptimization,
};

export default portfolioOptimization;
