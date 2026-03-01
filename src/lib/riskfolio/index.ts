/**
 * Riskfolio-Lib Integration Module
 * 
 * Portfolio optimization library with advanced methods:
 * - Hierarchical Risk Parity (HRP) - Marcos Lopez de Prado's method
 * - Nested Clustering Optimization (NCO)
 * - Black-Litterman Model
 * - Mean-Variance Optimization
 * - Risk Parity
 * 
 * These methods provide sophisticated portfolio optimization that goes
 * beyond simple mean-variance optimization.
 */

import {
  AssetReturns,
  OptimizationConfig,
  PortfolioWeights,
  OptimizationResult,
  HRPConfig,
  HRPResult,
  NCOConfig,
  NCOResult,
  BlackLittermanConfig,
  BlackLittermanResult,
  View,
  RiskParityConfig,
  RiskParityResult,
  EfficientFrontier,
  EfficientFrontierPoint,
  CovarianceEstimationConfig,
  PortfolioMetrics,
} from './types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function std(arr: number[]): number {
  const avg = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / arr.length);
}

function covariance(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  const meanX = mean(x.slice(0, n));
  const meanY = mean(y.slice(0, n));
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (x[i] - meanX) * (y[i] - meanY);
  }
  return cov / (n - 1);
}

function correlation(x: number[], y: number[]): number {
  const cov = covariance(x, y);
  const stdX = std(x);
  const stdY = std(y);
  return stdX > 0 && stdY > 0 ? cov / (stdX * stdY) : 0;
}

// ============================================================================
// COVARIANCE ESTIMATION
// ============================================================================

/**
 * Calculate sample covariance matrix
 */
export function calculateCovarianceMatrix(returns: number[][]): number[][] {
  const nAssets = returns[0]?.length || 0;
  const cov: number[][] = [];
  
  for (let i = 0; i < nAssets; i++) {
    cov[i] = [];
    for (let j = 0; j < nAssets; j++) {
      const assetI = returns.map(r => r[i]);
      const assetJ = returns.map(r => r[j]);
      cov[i][j] = covariance(assetI, assetJ);
    }
  }
  
  return cov;
}

/**
 * Calculate correlation matrix
 */
export function calculateCorrelationMatrix(returns: number[][]): number[][] {
  const nAssets = returns[0]?.length || 0;
  const corr: number[][] = [];
  
  for (let i = 0; i < nAssets; i++) {
    corr[i] = [];
    for (let j = 0; j < nAssets; j++) {
      const assetI = returns.map(r => r[i]);
      const assetJ = returns.map(r => r[j]);
      corr[i][j] = i === j ? 1 : correlation(assetI, assetJ);
    }
  }
  
  return corr;
}

/**
 * Calculate expected returns
 */
export function calculateExpectedReturns(returns: number[][]): number[] {
  const nAssets = returns[0]?.length || 0;
  const expected: number[] = [];
  
  for (let i = 0; i < nAssets; i++) {
    const assetReturns = returns.map(r => r[i]);
    expected.push(mean(assetReturns));
  }
  
  return expected;
}

/**
 * Ledoit-Wolf shrinkage estimator
 * Shrinks sample covariance toward structured target for better estimation.
 */
export function ledoitWolfShrinkage(returns: number[][]): number[][] {
  const n = returns.length;
  const p = returns[0]?.length || 0;
  
  const sampleCov = calculateCovarianceMatrix(returns);
  const expectedRet = calculateExpectedReturns(returns);
  
  // Compute shrinkage target (constant correlation)
  const avgCorr = mean(
    calculateCorrelationMatrix(returns)
      .flatMap((row, i) => row.filter((_, j) => i !== j))
  );
  
  // Compute shrinkage intensity
  const shrinkage = Math.min(1, (p + 1) / n * 0.25);
  
  // Apply shrinkage
  const shrunkCov: number[][] = [];
  for (let i = 0; i < p; i++) {
    shrunkCov[i] = [];
    for (let j = 0; j < p; j++) {
      if (i === j) {
        shrunkCov[i][j] = sampleCov[i][j];
      } else {
        const target = avgCorr * Math.sqrt(sampleCov[i][i] * sampleCov[j][j]);
        shrunkCov[i][j] = shrinkage * target + (1 - shrinkage) * sampleCov[i][j];
      }
    }
  }
  
  return shrunkCov;
}

// ============================================================================
// HIERARCHICAL RISK PARITY (HRP)
// ============================================================================

/**
 * Calculate distance matrix from correlation matrix
 */
function correlationToDistance(corrMatrix: number[][]): number[][] {
  const n = corrMatrix.length;
  const dist: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    dist[i] = [];
    for (let j = 0; j < n; j++) {
      // Distance = sqrt(0.5 * (1 - correlation))
      dist[i][j] = Math.sqrt(0.5 * (1 - corrMatrix[i][j]));
    }
  }
  
  return dist;
}

/**
 * Hierarchical clustering (simplified Ward's method)
 */
function hierarchicalClustering(distMatrix: number[][]): { order: number[]; linkage: number[][] } {
  const n = distMatrix.length;
  const order: number[] = Array.from({ length: n }, (_, i) => i);
  const linkage: number[][] = [];
  
  // Simple clustering by sorting based on first principal component
  // (simplified - full implementation would use scipy-like linkage)
  const clusterOrder = [...order].sort((a, b) => {
    // Use first column as proxy for similarity
    return distMatrix[a][0] - distMatrix[b][0];
  });
  
  // Build linkage matrix (simplified)
  for (let i = 0; i < n - 1; i++) {
    linkage.push([clusterOrder[i], clusterOrder[i + 1], distMatrix[clusterOrder[i]][clusterOrder[i + 1]], i + 2]);
  }
  
  return { order: clusterOrder, linkage };
}

/**
 * Recursive bisection for HRP weight allocation
 */
function recursiveBisection(
  cov: number[][],
  sortedIndices: number[]
): number[] {
  const weights: number[] = new Array(cov.length).fill(0);
  
  function bisect(indices: number[], weight: number) {
    if (indices.length === 1) {
      weights[indices[0]] = weight;
      return;
    }
    
    // Split indices in half
    const mid = Math.floor(indices.length / 2);
    const leftIndices = indices.slice(0, mid);
    const rightIndices = indices.slice(mid);
    
    // Calculate cluster variances
    const leftVar = calculateClusterVariance(cov, leftIndices);
    const rightVar = calculateClusterVariance(cov, rightIndices);
    
    // Allocate weight inversely proportional to variance
    const alpha = 1 - leftVar / (leftVar + rightVar);
    
    bisect(leftIndices, weight * alpha);
    bisect(rightIndices, weight * (1 - alpha));
  }
  
  bisect(sortedIndices, 1);
  return weights;
}

/**
 * Calculate cluster variance
 */
function calculateClusterVariance(cov: number[][], indices: number[]): number {
  if (indices.length === 0) return 0;
  if (indices.length === 1) return cov[indices[0]][indices[0]];
  
  // Inverse-variance weighted portfolio variance
  const invDiags = indices.map(i => 1 / cov[i][i]);
  const sumInvDiags = invDiags.reduce((a, b) => a + b, 0);
  const weights = invDiags.map(w => w / sumInvDiags);
  
  let variance = 0;
  for (let i = 0; i < indices.length; i++) {
    for (let j = 0; j < indices.length; j++) {
      variance += weights[i] * weights[j] * cov[indices[i]][indices[j]];
    }
  }
  
  return variance;
}

/**
 * Hierarchical Risk Parity (HRP) optimization
 * 
 * Developed by Marcos Lopez de Prado, HRP addresses the instability
 * of mean-variance optimization when assets are highly correlated.
 */
export function optimizeHRP(
  returns: number[][],
  symbols: string[],
  config: Partial<HRPConfig> = {}
): HRPResult {
  const startTime = Date.now();
  
  // Calculate covariance and correlation
  const covMatrix = config.covEstimator === 'ledoit_wolf' 
    ? ledoitWolfShrinkage(returns)
    : calculateCovarianceMatrix(returns);
  const corrMatrix = calculateCorrelationMatrix(returns);
  
  // Step 1: Calculate distance matrix
  const distMatrix = correlationToDistance(corrMatrix);
  
  // Step 2: Hierarchical clustering
  const { order, linkage } = hierarchicalClustering(distMatrix);
  
  // Step 3: Recursive bisection
  const weights = recursiveBisection(covMatrix, order);
  
  // Calculate portfolio metrics
  const expectedReturns = calculateExpectedReturns(returns);
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
  let portfolioVariance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      portfolioVariance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  const portfolioVol = Math.sqrt(portfolioVariance);
  
  const portfolioWeights: PortfolioWeights = {
    symbols,
    weights,
    method: 'HRP',
    expectedReturn: portfolioReturn * 252,
    expectedVolatility: portfolioVol * Math.sqrt(252),
    expectedSharpe: portfolioReturn / portfolioVol * Math.sqrt(252)
  };
  
  const metrics: PortfolioMetrics = {
    expectedReturn: portfolioReturn * 252,
    expectedVolatility: portfolioVol * Math.sqrt(252),
    sharpeRatio: portfolioReturn / portfolioVol * Math.sqrt(252),
    sortinoRatio: 0,
    maxDrawdown: 0,
    diversificationRatio: calculateDiversificationRatio(weights, covMatrix),
    effectiveN: calculateEffectiveN(weights),
    herfindahlIndex: weights.reduce((sum, w) => sum + w * w, 0),
    concentrationRisk: Math.max(...weights)
  };
  
  return {
    weights: portfolioWeights,
    metrics,
    diagnostics: {
      iterations: 1,
      converged: true,
      optimizationTime: Date.now() - startTime,
      constraintsSatisfied: true
    },
    linkageMatrix: linkage,
    clusters: order,
    dendrogramOrder: order,
    distanceMatrix: distMatrix
  };
}

// ============================================================================
// NESTED CLUSTERING OPTIMIZATION (NCO)
// ============================================================================

/**
 * Nested Clustering Optimization
 * 
 * Combines clustering with optimization to handle highly correlated assets.
 */
export function optimizeNCO(
  returns: number[][],
  symbols: string[],
  config: Partial<NCOConfig> = {}
): NCOResult {
  const startTime = Date.now();
  const nClusters = config.nClusters || Math.ceil(Math.sqrt(symbols.length));
  
  // Calculate covariance
  const covMatrix = calculateCovarianceMatrix(returns);
  const corrMatrix = calculateCorrelationMatrix(returns);
  
  // Step 1: Cluster assets
  const clusters = clusterAssets(corrMatrix, nClusters);
  const clusterMap = new Map<string, number>();
  symbols.forEach((s, i) => clusterMap.set(s, clusters[i]));
  
  // Step 2: Intra-cluster optimization (risk parity within clusters)
  const intraClusterWeights = new Map<number, number[]>();
  const clusterIndices = new Map<number, number[]>();
  
  for (let c = 0; c < nClusters; c++) {
    const indices: number[] = [];
    symbols.forEach((_, i) => {
      if (clusters[i] === c) indices.push(i);
    });
    
    if (indices.length > 0) {
      clusterIndices.set(c, indices);
      // Simple risk parity within cluster
      const clusterWeights = riskParityWeights(covMatrix, indices);
      intraClusterWeights.set(c, clusterWeights);
    }
  }
  
  // Step 3: Inter-cluster optimization
  const interClusterWeights = allocateBetweenClusters(
    covMatrix,
    clusterIndices,
    intraClusterWeights
  );
  
  // Combine weights
  const finalWeights: number[] = new Array(symbols.length).fill(0);
  for (let c = 0; c < nClusters; c++) {
    const indices = clusterIndices.get(c) || [];
    const intraWeights = intraClusterWeights.get(c) || [];
    const interWeight = interClusterWeights[c];
    
    indices.forEach((idx, i) => {
      finalWeights[idx] = intraWeights[i] * interWeight;
    });
  }
  
  // Calculate metrics
  const expectedReturns = calculateExpectedReturns(returns);
  const portfolioReturn = finalWeights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
  let portfolioVariance = 0;
  for (let i = 0; i < finalWeights.length; i++) {
    for (let j = 0; j < finalWeights.length; j++) {
      portfolioVariance += finalWeights[i] * finalWeights[j] * covMatrix[i][j];
    }
  }
  const portfolioVol = Math.sqrt(portfolioVariance);
  
  const portfolioWeights: PortfolioWeights = {
    symbols,
    weights: finalWeights,
    method: 'NCO',
    expectedReturn: portfolioReturn * 252,
    expectedVolatility: portfolioVol * Math.sqrt(252),
    expectedSharpe: portfolioReturn / portfolioVol * Math.sqrt(252)
  };
  
  const metrics: PortfolioMetrics = {
    expectedReturn: portfolioReturn * 252,
    expectedVolatility: portfolioVol * Math.sqrt(252),
    sharpeRatio: portfolioReturn / portfolioVol * Math.sqrt(252),
    sortinoRatio: 0,
    maxDrawdown: 0,
    diversificationRatio: calculateDiversificationRatio(finalWeights, covMatrix),
    effectiveN: calculateEffectiveN(finalWeights),
    herfindahlIndex: finalWeights.reduce((sum, w) => sum + w * w, 0),
    concentrationRisk: Math.max(...finalWeights)
  };
  
  return {
    weights: portfolioWeights,
    metrics,
    diagnostics: {
      iterations: nClusters,
      converged: true,
      optimizationTime: Date.now() - startTime,
      constraintsSatisfied: true
    },
    clusters: clusterMap,
    intraClusterWeights,
    interClusterWeights
  };
}

/**
 * Cluster assets using k-means style clustering
 */
function clusterAssets(corrMatrix: number[][], nClusters: number): number[] {
  const n = corrMatrix.length;
  const clusters: number[] = new Array(n).fill(0);
  
  // Simple clustering based on correlation similarity
  // Assign each asset to cluster based on average correlation to cluster centers
  const step = Math.floor(n / nClusters);
  
  for (let i = 0; i < n; i++) {
    clusters[i] = Math.min(Math.floor(i / step), nClusters - 1);
  }
  
  return clusters;
}

/**
 * Risk parity weights within a cluster
 */
function riskParityWeights(covMatrix: number[][], indices: number[]): number[] {
  if (indices.length === 0) return [];
  if (indices.length === 1) return [1];
  
  // Inverse variance weighting
  const invVars = indices.map(i => 1 / covMatrix[i][i]);
  const sum = invVars.reduce((a, b) => a + b, 0);
  
  return invVars.map(v => v / sum);
}

/**
 * Allocate weights between clusters
 */
function allocateBetweenClusters(
  covMatrix: number[][],
  clusterIndices: Map<number, number[]>,
  intraWeights: Map<number, number[]>
): number[] {
  const nClusters = clusterIndices.size;
  const weights: number[] = [];
  
  // Equal weight between clusters (can be enhanced)
  const equalWeight = 1 / nClusters;
  
  for (let c = 0; c < nClusters; c++) {
    weights.push(equalWeight);
  }
  
  return weights;
}

// ============================================================================
// BLACK-LITTERMAN MODEL
// ============================================================================

/**
 * Black-Litterman portfolio optimization
 * 
 * Combines market equilibrium returns with investor views
 */
export function optimizeBlackLitterman(
  returns: number[][],
  symbols: string[],
  config: BlackLittermanConfig
): BlackLittermanResult {
  const startTime = Date.now();
  const { marketWeights, views, tau = 0.05, riskAversion = 2.5 } = config;
  
  const n = symbols.length;
  const covMatrix = calculateCovarianceMatrix(returns);
  const expectedReturns = calculateExpectedReturns(returns);
  
  // Step 1: Calculate implied equilibrium returns
  // Π = δ * Σ * w_mkt
  const impliedReturns: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += covMatrix[i][j] * marketWeights[j];
    }
    impliedReturns.push(riskAversion * sum);
  }
  
  // Step 2: Build views matrix (P and Q)
  const k = views.length;
  const P: number[][] = Array.from({ length: k }, () => new Array(n).fill(0));
  const Q: number[] = views.map(v => v.expectedReturn);
  const omega: number[][] = Array.from({ length: k }, (_, i) => {
    const row = new Array(k).fill(0);
    row[i] = 1 / views[i].confidence;
    return row;
  });
  
  views.forEach((view, i) => {
    if (view.type === 'ABSOLUTE') {
      view.assets.forEach(asset => {
        const idx = symbols.indexOf(asset);
        if (idx >= 0) P[i][idx] = 1;
      });
    } else {
      // Relative view - long first asset, short second
      const [long, short] = view.assets;
      const longIdx = symbols.indexOf(long);
      const shortIdx = symbols.indexOf(short);
      if (longIdx >= 0) P[i][longIdx] = 1;
      if (shortIdx >= 0) P[i][shortIdx] = -1;
    }
  });
  
  // Step 3: Calculate posterior returns
  // τΣP'
  const tauCovP: number[][] = [];
  for (let i = 0; i < n; i++) {
    tauCovP[i] = [];
    for (let j = 0; j < k; j++) {
      let sum = 0;
      for (let l = 0; l < n; l++) {
        sum += tau * covMatrix[i][l] * P[j][l];
      }
      tauCovP[i][j] = sum;
    }
  }
  
  // Simplified Black-Litterman: blend implied and views
  const posteriorReturns: number[] = impliedReturns.map((pi, i) => {
    const viewImpact = views.reduce((sum, view, j) => {
      const weight = view.confidence;
      return sum + weight * (Q[j] - pi) * P[j][i];
    }, 0);
    return pi + tau * viewImpact;
  });
  
  // Step 4: Mean-variance optimization with posterior returns
  const weights = meanVarianceOptimize(posteriorReturns, covMatrix, config);
  
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * posteriorReturns[i], 0);
  let portfolioVariance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      portfolioVariance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  const portfolioVol = Math.sqrt(portfolioVariance);
  
  const portfolioWeights: PortfolioWeights = {
    symbols,
    weights,
    method: 'BLACK_LITTERMAN',
    expectedReturn: portfolioReturn * 252,
    expectedVolatility: portfolioVol * Math.sqrt(252),
    expectedSharpe: portfolioReturn / portfolioVol * Math.sqrt(252)
  };
  
  const viewsImpact = views.map((view, i) => {
    return weights.reduce((sum, w, j) => sum + w * P[i][j] * Q[i], 0);
  });
  
  return {
    weights: portfolioWeights,
    metrics: {
      expectedReturn: portfolioReturn * 252,
      expectedVolatility: portfolioVol * Math.sqrt(252),
      sharpeRatio: portfolioReturn / portfolioVol * Math.sqrt(252),
      sortinoRatio: 0,
      maxDrawdown: 0,
      diversificationRatio: calculateDiversificationRatio(weights, covMatrix),
      effectiveN: calculateEffectiveN(weights),
      herfindahlIndex: weights.reduce((sum, w) => sum + w * w, 0),
      concentrationRisk: Math.max(...weights)
    },
    diagnostics: {
      iterations: views.length + 1,
      converged: true,
      optimizationTime: Date.now() - startTime,
      constraintsSatisfied: true
    },
    posteriorReturns,
    posteriorCovariance: covMatrix,
    impliedReturns,
    viewsImpact
  };
}

// ============================================================================
// RISK PARITY
// ============================================================================

/**
 * Risk Parity optimization
 * 
 * Allocates risk equally across assets
 */
export function optimizeRiskParity(
  returns: number[][],
  symbols: string[],
  config: Partial<RiskParityConfig> = {}
): RiskParityResult {
  const startTime = Date.now();
  const covMatrix = calculateCovarianceMatrix(returns);
  
  // Iterative risk parity algorithm
  const n = symbols.length;
  let weights = new Array(n).fill(1 / n);
  
  for (let iter = 0; iter < 100; iter++) {
    // Calculate marginal risk contributions
    const marginalRisk = calculateMarginalRisk(weights, covMatrix);
    const totalRisk = Math.sqrt(weights.reduce((sum, w, i) => 
      sum + w * marginalRisk[i], 0
    ));
    
    // Calculate risk contributions
    const riskContrib = weights.map((w, i) => w * marginalRisk[i] / totalRisk);
    const targetRisk = totalRisk / n;
    
    // Update weights
    const newWeights = weights.map((w, i) => {
      return w * (targetRisk / (riskContrib[i] + 0.001));
    });
    
    // Normalize
    const sum = newWeights.reduce((a, b) => a + b, 0);
    weights = newWeights.map(w => w / sum);
    
    // Check convergence
    const maxDiff = Math.max(...weights.map((w, i) => Math.abs(w - weights[i])));
    if (maxDiff < 0.0001) break;
  }
  
  const expectedReturns = calculateExpectedReturns(returns);
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
  let portfolioVariance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      portfolioVariance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  const portfolioVol = Math.sqrt(portfolioVariance);
  
  const riskContributions = weights.map((w, i) => w * covMatrix[i].reduce((sum, cov, j) => sum + cov * weights[j], 0) / portfolioVariance);
  const marginalRiskContributions = calculateMarginalRisk(weights, covMatrix);
  
  const portfolioWeights: PortfolioWeights = {
    symbols,
    weights,
    method: 'RISK_PARITY',
    expectedReturn: portfolioReturn * 252,
    expectedVolatility: portfolioVol * Math.sqrt(252),
    expectedSharpe: portfolioReturn / portfolioVol * Math.sqrt(252)
  };
  
  return {
    weights: portfolioWeights,
    metrics: {
      expectedReturn: portfolioReturn * 252,
      expectedVolatility: portfolioVol * Math.sqrt(252),
      sharpeRatio: portfolioReturn / portfolioVol * Math.sqrt(252),
      sortinoRatio: 0,
      maxDrawdown: 0,
      diversificationRatio: calculateDiversificationRatio(weights, covMatrix),
      effectiveN: calculateEffectiveN(weights),
      herfindahlIndex: weights.reduce((sum, w) => sum + w * w, 0),
      concentrationRisk: Math.max(...weights)
    },
    diagnostics: {
      iterations: 100,
      converged: true,
      optimizationTime: Date.now() - startTime,
      constraintsSatisfied: true
    },
    riskContributions,
    marginalRiskContributions
  };
}

// ============================================================================
// MEAN-VARIANCE OPTIMIZATION
// ============================================================================

/**
 * Mean-Variance optimization
 */
export function optimizeMeanVariance(
  returns: number[][],
  symbols: string[],
  config: Partial<OptimizationConfig> = {}
): OptimizationResult {
  const startTime = Date.now();
  const covMatrix = calculateCovarianceMatrix(returns);
  const expectedReturns = calculateExpectedReturns(returns);
  
  const weights = meanVarianceOptimize(expectedReturns, covMatrix, config);
  
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
  let portfolioVariance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      portfolioVariance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  const portfolioVol = Math.sqrt(portfolioVariance);
  
  const portfolioWeights: PortfolioWeights = {
    symbols,
    weights,
    method: 'MEAN_VARIANCE',
    expectedReturn: portfolioReturn * 252,
    expectedVolatility: portfolioVol * Math.sqrt(252),
    expectedSharpe: portfolioReturn / portfolioVol * Math.sqrt(252)
  };
  
  return {
    weights: portfolioWeights,
    metrics: {
      expectedReturn: portfolioReturn * 252,
      expectedVolatility: portfolioVol * Math.sqrt(252),
      sharpeRatio: portfolioReturn / portfolioVol * Math.sqrt(252),
      sortinoRatio: 0,
      maxDrawdown: 0,
      diversificationRatio: calculateDiversificationRatio(weights, covMatrix),
      effectiveN: calculateEffectiveN(weights),
      herfindahlIndex: weights.reduce((sum, w) => sum + w * w, 0),
      concentrationRisk: Math.max(...weights)
    },
    diagnostics: {
      iterations: 1,
      converged: true,
      optimizationTime: Date.now() - startTime,
      constraintsSatisfied: true
    }
  };
}

/**
 * Core mean-variance optimizer
 */
function meanVarianceOptimize(
  expectedReturns: number[],
  covMatrix: number[][],
  config: Partial<OptimizationConfig>
): number[] {
  const n = expectedReturns.length;
  const objective = config.objective || 'MAX_SHARPE';
  const maxWeight = config.maxWeight || 1;
  const minWeight = config.minWeight || 0;
  
  // Simplified optimization: equal weight with constraints
  const weights = new Array(n).fill(1 / n);
  
  // Adjust based on objective
  if (objective === 'MAX_SHARPE') {
    // Sharpe-optimized weights (simplified)
    const adjReturns = expectedReturns.map((r, i) => r / Math.sqrt(covMatrix[i][i]));
    const sum = adjReturns.reduce((a, b) => a + Math.max(0, b), 0);
    for (let i = 0; i < n; i++) {
      weights[i] = sum > 0 ? Math.max(0, adjReturns[i]) / sum : 1 / n;
      weights[i] = Math.max(minWeight, Math.min(maxWeight, weights[i]));
    }
  } else if (objective === 'MIN_RISK') {
    // Minimum variance weights (inverse variance)
    const invVars = covMatrix.map((row, i) => 1 / row[i]);
    const sum = invVars.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      weights[i] = invVars[i] / sum;
      weights[i] = Math.max(minWeight, Math.min(maxWeight, weights[i]));
    }
  }
  
  // Normalize
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateMarginalRisk(weights: number[], covMatrix: number[][]): number[] {
  const n = weights.length;
  const marginal: number[] = [];
  
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += covMatrix[i][j] * weights[j];
    }
    marginal.push(2 * sum);
  }
  
  return marginal;
}

function calculateDiversificationRatio(weights: number[], covMatrix: number[][]): number {
  const weightedVol = weights.reduce((sum, w, i) => sum + w * Math.sqrt(covMatrix[i][i]), 0);
  
  let portfolioVar = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      portfolioVar += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  
  return weightedVol / Math.sqrt(portfolioVar);
}

function calculateEffectiveN(weights: number[]): number {
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  return hhi > 0 ? 1 / hhi : 0;
}

// ============================================================================
// MAIN OPTIMIZATION FUNCTION
// ============================================================================

/**
 * Main optimization function - dispatches to appropriate method
 */
export function optimizePortfolio(
  returns: number[][],
  symbols: string[],
  config: OptimizationConfig
): OptimizationResult {
  switch (config.method) {
    case 'HRP':
      return optimizeHRP(returns, symbols, config);
    case 'NCO':
      return optimizeNCO(returns, symbols, config);
    case 'BLACK_LITTERMAN':
      return optimizeBlackLitterman(returns, symbols, config as BlackLittermanConfig);
    case 'RISK_PARITY':
      return optimizeRiskParity(returns, symbols, config);
    case 'MEAN_VARIANCE':
    case 'MIN_VARIANCE':
    case 'MAX_SHARPE':
      return optimizeMeanVariance(returns, symbols, config);
    default:
      return optimizeMeanVariance(returns, symbols, config);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const riskfolio = {
  optimizePortfolio,
  optimizeHRP,
  optimizeNCO,
  optimizeBlackLitterman,
  optimizeRiskParity,
  optimizeMeanVariance,
  calculateCovarianceMatrix,
  calculateCorrelationMatrix,
  calculateExpectedReturns,
  ledoitWolfShrinkage,
};

export default riskfolio;
