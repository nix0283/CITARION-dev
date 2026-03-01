/**
 * quantstats Integration Module
 * 
 * Portfolio analytics for quants, written in TypeScript.
 * Provides comprehensive metrics, tear sheets, and reporting.
 */

import {
  PerformanceMetrics,
  RollingMetrics,
  MonthlyReturns,
  DrawdownAnalysis,
  ReturnDistribution,
  BenchmarkComparison,
  TearSheet,
  QuantStatsConfig,
  TearSheetConfig,
} from './types';

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_CONFIG: QuantStatsConfig = {
  riskFreeRate: 0.02,
  tradingDays: 252,
  varConfidence: 0.95,
  rollingWindow: 252,
  strategyName: 'Strategy',
  benchmarkName: 'Benchmark',
};

// ============================================================================
// CORE METRICS
// ============================================================================

/**
 * Calculate comprehensive performance metrics
 */
export function calculatePerformanceMetrics(
  returns: number[],
  benchmarkReturns?: number[],
  config: QuantStatsConfig = DEFAULT_CONFIG
): PerformanceMetrics {
  const { riskFreeRate, tradingDays, varConfidence } = config;

  // Basic return calculations
  const totalReturn = returns.reduce((a, b) => a + b, 0);
  const avgDailyReturn = mean(returns);
  const avgMonthlyReturn = avgDailyReturn * 21;
  const avgYearlyReturn = avgDailyReturn * tradingDays;

  // Cumulative returns
  const cumReturns = calculateCumulativeReturns(returns);
  const cumulativeReturn = cumReturns[cumReturns.length - 1];

  // CAGR
  const years = returns.length / tradingDays;
  const cagr = Math.pow(1 + cumulativeReturn, 1 / years) - 1;

  // Volatility
  const dailyVolatility = std(returns);
  const volatility = dailyVolatility * Math.sqrt(tradingDays);

  // Downside volatility
  const negativeReturns = returns.filter(r => r < 0);
  const downsideVolatility = std(negativeReturns) * Math.sqrt(tradingDays);

  // Drawdowns
  const drawdowns = calculateDrawdowns(cumReturns);
  const maxDrawdown = Math.min(...drawdowns);
  const maxDrawdownDuration = calculateMaxDrawdownDuration(drawdowns);
  const avgDrawdown = mean(drawdowns.filter(d => d < 0));
  const calmarRatio = cagr / Math.abs(maxDrawdown);

  // Risk-free adjusted returns
  const dailyRfRate = riskFreeRate / tradingDays;
  const excessReturns = returns.map(r => r - dailyRfRate);

  // Sharpe Ratio
  const sharpeRatio = volatility > 0
    ? (avgYearlyReturn - riskFreeRate) / volatility
    : 0;

  // Sortino Ratio
  const sortinoRatio = downsideVolatility > 0
    ? (avgYearlyReturn - riskFreeRate) / downsideVolatility
    : 0;

  // Distribution metrics
  const skewness = calculateSkewness(returns);
  const kurtosis = calculateKurtosis(returns);
  const jarqueBera = calculateJarqueBera(returns, skewness, kurtosis);
  const normalDistribution = jarqueBera < 5.99; // Chi-squared critical value at 5%

  // Omega Ratio
  const threshold = dailyRfRate;
  const omegaRatio = calculateOmegaRatio(returns, threshold);

  // Tail Ratio
  const tailRatio = calculateTailRatio(returns);

  // Burke Ratio
  const burkeRatio = calculateBurkeRatio(returns, drawdowns);

  // Kelly Criterion
  const winRate = returns.filter(r => r > 0).length / returns.length;
  const avgWin = mean(returns.filter(r => r > 0)) || 0;
  const avgLoss = Math.abs(mean(returns.filter(r => r < 0)) || 0);
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
  const kellyCriterion = winRate - (1 - winRate) / (winLossRatio || 1);

  // VaR/CVaR
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95 = calculateVaR(sortedReturns, 0.95);
  const var99 = calculateVaR(sortedReturns, 0.99);
  const cvar95 = calculateCVaR(sortedReturns, 0.95);
  const cvar99 = calculateCVaR(sortedReturns, 0.99);

  // Win/Loss metrics
  const positiveReturns = returns.filter(r => r > 0);
  const negativeReturnsList = returns.filter(r => r < 0);

  const winRatePercent = (positiveReturns.length / returns.length) * 100;
  const bestDay = Math.max(...returns);
  const worstDay = Math.min(...returns);
  const profitFactor = avgLoss > 0
    ? (avgWin * positiveReturns.length) / (avgLoss * negativeReturnsList.length)
    : Infinity;

  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

  // Alpha/Beta (if benchmark provided)
  let alpha = 0;
  let beta = 1;
  let rSquared = 0;
  let correlation = 0;
  let trackingError = 0;
  let informationRatio = 0;

  if (benchmarkReturns && benchmarkReturns.length === returns.length) {
    const regression = linearRegression(returns, benchmarkReturns);
    alpha = regression.alpha;
    beta = regression.beta;
    rSquared = regression.rSquared;
    correlation = regression.correlation;

    const trackingErrors = returns.map((r, i) => r - benchmarkReturns[i]);
    trackingError = std(trackingErrors) * Math.sqrt(tradingDays);
    informationRatio = trackingError > 0
      ? ((mean(returns) - mean(benchmarkReturns)) * tradingDays) / trackingError
      : 0;
  }

  // Consecutive wins/losses
  const { maxConsecutiveWins, maxConsecutiveLosses } = calculateConsecutiveStreaks(returns);

  return {
    totalReturn,
    cagr,
    avgDailyReturn,
    avgMonthlyReturn,
    avgYearlyReturn,
    cumulativeReturn,
    volatility,
    dailyVolatility,
    annualizedVolatility: volatility,
    downsideVolatility,
    maxDrawdown,
    maxDrawdownDuration,
    avgDrawdown,
    calmarRatio,
    sharpeRatio,
    sortinoRatio,
    treynorRatio: beta > 0 ? (avgYearlyReturn - riskFreeRate) / beta : 0,
    informationRatio,
    omegaRatio,
    tailRatio,
    burkeRatio,
    kellyCriterion,
    skewness,
    kurtosis,
    jarqueBera,
    normalDistribution,
    maxDrawdownPercent: maxDrawdown * 100,
    avgDrawdownPercent: avgDrawdown * 100,
    medianDrawdown: median(drawdowns),
    drawdownRecoveryDays: maxDrawdownDuration,
    drawdownProbability: drawdowns.filter(d => d < -0.05).length / drawdowns.length,
    longestDrawdownDays: maxDrawdownDuration,
    currentDrawdown: drawdowns[drawdowns.length - 1],
    winRate: winRatePercent,
    avgWin,
    avgLoss,
    bestDay,
    worstDay,
    bestMonth: bestDay * 21, // Approximate
    worstMonth: worstDay * 21,
    bestYear: cagr,
    worstYear: cagr,
    profitFactor,
    expectancy,
    var95,
    var99,
    cvar95,
    cvar99,
    alpha,
    beta,
    rSquared,
    correlation,
    trackingError,
    totalTrades: returns.length,
    winningTrades: positiveReturns.length,
    losingTrades: negativeReturnsList.length,
    avgTradeReturn: avgDailyReturn,
    avgWinReturn: avgWin,
    avgLossReturn: avgLoss,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    avgHoldingPeriod: 1, // Daily returns = 1 day holding
  };
}

/**
 * Calculate rolling metrics
 */
export function calculateRollingMetrics(
  returns: number[],
  config: QuantStatsConfig = DEFAULT_CONFIG
): RollingMetrics {
  const { rollingWindow, riskFreeRate, tradingDays } = config;
  const window = rollingWindow || 252;
  const dailyRfRate = riskFreeRate / tradingDays;

  const result: RollingMetrics = {
    dates: [],
    rollingReturns: [],
    rollingVolatility: [],
    rollingSharpe: [],
    rollingSortino: [],
    rollingBeta: [],
    rollingAlpha: [],
    rollingCorrelation: [],
    rollingDrawdown: [],
    rollingWinRate: [],
  };

  for (let i = window; i < returns.length; i++) {
    const slice = returns.slice(i - window, i);
    const cumRet = calculateCumulativeReturns(slice);
    const drawdowns = calculateDrawdowns(cumRet);

    result.dates.push(i);
    result.rollingReturns.push(slice.reduce((a, b) => a + b, 0));
    result.rollingVolatility.push(std(slice) * Math.sqrt(tradingDays));
    result.rollingSharpe.push(calculateSharpe(slice, dailyRfRate, tradingDays));
    result.rollingSortino.push(calculateSortino(slice, dailyRfRate, tradingDays));
    result.rollingDrawdown.push(Math.min(...drawdowns));
    result.rollingWinRate.push(slice.filter(r => r > 0).length / slice.length);
    result.rollingBeta.push(1); // Placeholder
    result.rollingAlpha.push(0); // Placeholder
    result.rollingCorrelation.push(0); // Placeholder
  }

  return result;
}

/**
 * Calculate monthly returns breakdown
 */
export function calculateMonthlyReturns(
  returns: number[],
  dates: number[]
): MonthlyReturns {
  const monthlyData: Record<string, number[]> = {
    jan: [], feb: [], mar: [], apr: [], may: [], jun: [],
    jul: [], aug: [], sep: [], oct: [], nov: [], dec: [],
  };

  const yearData: Record<number, number[]> = {};
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  // Group returns by month and year
  for (let i = 0; i < returns.length && i < dates.length; i++) {
    const date = new Date(dates[i]);
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    monthlyData[month].push(returns[i]);

    if (!yearData[year]) yearData[year] = [];
    yearData[year].push(returns[i]);
  }

  // Calculate monthly aggregates
  const months = {
    jan: monthlyData.jan.reduce((a, b) => a + b, 0),
    feb: monthlyData.feb.reduce((a, b) => a + b, 0),
    mar: monthlyData.mar.reduce((a, b) => a + b, 0),
    apr: monthlyData.apr.reduce((a, b) => a + b, 0),
    may: monthlyData.may.reduce((a, b) => a + b, 0),
    jun: monthlyData.jun.reduce((a, b) => a + b, 0),
    jul: monthlyData.jul.reduce((a, b) => a + b, 0),
    aug: monthlyData.aug.reduce((a, b) => a + b, 0),
    sep: monthlyData.sep.reduce((a, b) => a + b, 0),
    oct: monthlyData.oct.reduce((a, b) => a + b, 0),
    nov: monthlyData.nov.reduce((a, b) => a + b, 0),
    dec: monthlyData.dec.reduce((a, b) => a + b, 0),
  };

  // Calculate yearly returns
  const years = Object.keys(yearData).map(Number).sort();
  const yearlyReturns = years.map(y => yearData[y].reduce((a, b) => a + b, 0));

  // Find best/worst months and years
  const monthEntries = Object.entries(months);
  const bestMonth = monthEntries.reduce((a, b) => b[1] > a[1] ? b : a);
  const worstMonth = monthEntries.reduce((a, b) => b[1] < a[1] ? b : a);

  const bestYear = { year: years[yearlyReturns.indexOf(Math.max(...yearlyReturns))], return: Math.max(...yearlyReturns) };
  const worstYear = { year: years[yearlyReturns.indexOf(Math.min(...yearlyReturns))], return: Math.min(...yearlyReturns) };

  const allMonthly = Object.values(months);
  const positiveMonths = allMonthly.filter(m => m > 0).length;
  const negativeMonths = allMonthly.filter(m => m < 0).length;

  return {
    years,
    months: {
      jan: monthlyData.jan,
      feb: monthlyData.feb,
      mar: monthlyData.mar,
      apr: monthlyData.apr,
      may: monthlyData.may,
      jun: monthlyData.jun,
      jul: monthlyData.jul,
      aug: monthlyData.aug,
      sep: monthlyData.sep,
      oct: monthlyData.oct,
      nov: monthlyData.nov,
      dec: monthlyData.dec,
    },
    yearlyReturns,
    bestMonth: { month: bestMonth[0], return: bestMonth[1] },
    worstMonth: { month: worstMonth[0], return: worstMonth[1] },
    bestYear,
    worstYear,
    avgMonthlyReturn: mean(allMonthly),
    avgYearlyReturn: mean(yearlyReturns),
    positiveMonths,
    negativeMonths,
  };
}

/**
 * Calculate detailed drawdown analysis
 */
export function calculateDrawdownAnalysis(
  returns: number[]
): DrawdownAnalysis {
  const cumReturns = calculateCumulativeReturns(returns);
  const drawdowns = calculateDrawdowns(cumReturns);

  // Find individual drawdown periods
  const drawdownPeriods: DrawdownAnalysis['drawdowns'] = [];
  let inDrawdown = false;
  let currentStart = 0;
  let currentPeak = 0;

  for (let i = 0; i < drawdowns.length; i++) {
    if (drawdowns[i] < 0 && !inDrawdown) {
      inDrawdown = true;
      currentStart = i;
      currentPeak = cumReturns[i];
    } else if (drawdowns[i] >= 0 && inDrawdown) {
      // End of drawdown
      const trough = Math.min(...drawdowns.slice(currentStart, i));
      const troughIndex = currentStart + drawdowns.slice(currentStart, i).indexOf(trough);

      drawdownPeriods.push({
        start: currentStart,
        end: troughIndex,
        peak: currentPeak,
        trough: cumReturns[troughIndex],
        drawdown: trough,
        duration: i - currentStart,
        recoveryDate: i,
      });

      inDrawdown = false;
    }
  }

  // Handle current drawdown if still in one
  if (inDrawdown) {
    const trough = Math.min(...drawdowns.slice(currentStart));
    const troughIndex = currentStart + drawdowns.slice(currentStart).indexOf(trough);

    drawdownPeriods.push({
      start: currentStart,
      end: troughIndex,
      peak: currentPeak,
      trough: cumReturns[troughIndex],
      drawdown: trough,
      duration: drawdowns.length - currentStart,
      recoveryDate: null,
    });
  }

  const maxDrawdown = Math.min(...drawdowns);
  const maxDuration = Math.max(...drawdownPeriods.map(d => d.duration));
  const avgDrawdown = mean(drawdownPeriods.map(d => d.drawdown));
  const avgDuration = mean(drawdownPeriods.map(d => d.duration));

  return {
    drawdowns: drawdownPeriods,
    maxDrawdown,
    maxDuration,
    avgDrawdown,
    avgDuration,
    currentDrawdown: drawdowns[drawdowns.length - 1],
    currentDuration: inDrawdown ? drawdowns.length - currentStart : 0,
    drawdownProbability: drawdownPeriods.length / (returns.length / 252), // Per year
    recoveryProbability: drawdownPeriods.filter(d => d.recoveryDate !== null).length / drawdownPeriods.length,
  };
}

/**
 * Calculate return distribution analysis
 */
export function calculateReturnDistribution(
  returns: number[]
): ReturnDistribution {
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const n = returns.length;

  const meanVal = mean(returns);
  const medianVal = median(returns);
  const stdVal = std(returns);
  const skewness = calculateSkewness(returns);
  const kurtosis = calculateKurtosis(returns);
  const jarqueBera = calculateJarqueBera(returns, skewness, kurtosis);

  // Percentiles
  const percentiles = {
    p1: percentile(sortedReturns, 1),
    p5: percentile(sortedReturns, 5),
    p10: percentile(sortedReturns, 10),
    p25: percentile(sortedReturns, 25),
    p50: percentile(sortedReturns, 50),
    p75: percentile(sortedReturns, 75),
    p90: percentile(sortedReturns, 90),
    p95: percentile(sortedReturns, 95),
    p99: percentile(sortedReturns, 99),
  };

  // Histogram
  const numBins = Math.ceil(Math.sqrt(n));
  const minVal = sortedReturns[0];
  const maxVal = sortedReturns[n - 1];
  const binWidth = (maxVal - minVal) / numBins;

  const histogram: ReturnDistribution['histogram'] = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = minVal + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = returns.filter(r => r >= binStart && r < binEnd).length;
    histogram.push({
      bin: [binStart, binEnd],
      count,
      frequency: count / n,
    });
  }

  // Normal fit
  const normalPdf = histogram.map(h => ({
    x: (h.bin[0] + h.bin[1]) / 2,
    pdf: normalPDF((h.bin[0] + h.bin[1]) / 2, meanVal, stdVal),
  }));

  return {
    mean: meanVal,
    median: medianVal,
    std: stdVal,
    skewness,
    kurtosis,
    jarqueBera,
    isNormal: jarqueBera < 5.99,
    percentiles,
    histogram,
    normalFit: {
      mean: meanVal,
      std: stdVal,
      pdf: normalPdf.map(n => n.pdf),
    },
  };
}

/**
 * Calculate benchmark comparison
 */
export function calculateBenchmarkComparison(
  returns: number[],
  benchmarkReturns: number[],
  benchmarkName: string
): BenchmarkComparison {
  const regression = linearRegression(returns, benchmarkReturns);

  // Capture ratios
  const upMonths = returns.filter((r, i) => benchmarkReturns[i] > 0);
  const downMonths = returns.filter((r, i) => benchmarkReturns[i] < 0);
  const upBenchmark = benchmarkReturns.filter(r => r > 0);
  const downBenchmark = benchmarkReturns.filter(r => r < 0);

  const upCapture = upBenchmark.length > 0
    ? mean(upMonths) / mean(upBenchmark)
    : 1;
  const downCapture = downBenchmark.length > 0
    ? mean(downMonths) / mean(downBenchmark)
    : 1;

  // Relative performance
  const relativePerformance = returns.map((r, i) => r - benchmarkReturns[i]);

  const cumRelPerf: number[] = [];
  let cumulative = 0;
  for (const rp of relativePerformance) {
    cumulative += rp;
    cumRelPerf.push(cumulative);
  }

  return {
    benchmarkName,
    strategyReturns: returns,
    benchmarkReturns,
    alpha: regression.alpha,
    beta: regression.beta,
    correlation: regression.correlation,
    rSquared: regression.rSquared,
    trackingError: std(relativePerformance) * Math.sqrt(252),
    informationRatio: mean(relativePerformance) * 252 / (std(relativePerformance) * Math.sqrt(252)),
    upCapture,
    downCapture,
    relativePerformance,
    cumulativeOutperformance: cumRelPerf[cumRelPerf.length - 1],
  };
}

// ============================================================================
// TEAR SHEET GENERATION
// ============================================================================

/**
 * Generate comprehensive tear sheet
 */
export function generateTearSheet(
  returns: number[],
  dates: number[],
  config: TearSheetConfig
): TearSheet {
  const performance = calculatePerformanceMetrics(returns, config.benchmarkReturns, config);
  const rollingMetrics = calculateRollingMetrics(returns, config);
  const monthlyReturns = calculateMonthlyReturns(returns, dates);
  const drawdownAnalysis = calculateDrawdownAnalysis(returns);
  const returnDistribution = calculateReturnDistribution(returns);

  let benchmarkComparison: BenchmarkComparison = {
    benchmarkName: config.benchmarkName,
    strategyReturns: returns,
    benchmarkReturns: config.benchmarkReturns || [],
    alpha: 0,
    beta: 1,
    correlation: 0,
    rSquared: 0,
    trackingError: 0,
    informationRatio: 0,
    upCapture: 1,
    downCapture: 1,
    relativePerformance: [],
    cumulativeOutperformance: 0,
  };

  if (config.benchmarkReturns && config.benchmarkReturns.length === returns.length) {
    benchmarkComparison = calculateBenchmarkComparison(returns, config.benchmarkReturns, config.benchmarkName);
  }

  const period = {
    start: dates[0] || Date.now(),
    end: dates[dates.length - 1] || Date.now(),
    years: (dates[dates.length - 1] - dates[0]) / (365.25 * 24 * 60 * 60 * 1000),
  };

  const htmlReport = generateHTMLReport({
    strategyName: config.strategyName,
    benchmarkName: config.benchmarkName,
    performance,
    rollingMetrics,
    monthlyReturns,
    drawdownAnalysis,
    returnDistribution,
    benchmarkComparison,
    period,
  });

  return {
    title: config.title || `${config.strategyName} Performance Analysis`,
    generatedAt: Date.now(),
    strategyName: config.strategyName,
    benchmarkName: config.benchmarkName,
    period,
    performance,
    rollingMetrics,
    monthlyReturns,
    drawdownAnalysis,
    returnDistribution,
    benchmarkComparison,
    riskDecomposition: {
      systematicRisk: performance.beta * performance.volatility,
      idiosyncraticRisk: Math.sqrt(performance.volatility ** 2 - (performance.beta * performance.volatility) ** 2),
      totalRisk: performance.volatility,
    },
    statistics: {
      sharpeRank: 0, // Requires comparison universe
      sortinoRank: 0,
      calmarRank: 0,
      riskAdjustedRank: 0,
    },
    htmlReport,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function std(arr: number[]): number {
  if (arr.length === 0) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

function calculateCumulativeReturns(returns: number[]): number[] {
  const cumReturns: number[] = [];
  let cumulative = 0;

  for (const ret of returns) {
    cumulative = (1 + cumulative) * (1 + ret) - 1;
    cumReturns.push(cumulative);
  }

  return cumReturns;
}

function calculateDrawdowns(cumReturns: number[]): number[] {
  const drawdowns: number[] = [];
  let peak = cumReturns[0] || 0;

  for (const ret of cumReturns) {
    if (ret > peak) {
      peak = ret;
    }
    drawdowns.push(peak === 0 ? 0 : (ret - peak) / peak);
  }

  return drawdowns;
}

function calculateMaxDrawdownDuration(drawdowns: number[]): number {
  let maxDuration = 0;
  let currentDuration = 0;

  for (const dd of drawdowns) {
    if (dd < 0) {
      currentDuration++;
      maxDuration = Math.max(maxDuration, currentDuration);
    } else {
      currentDuration = 0;
    }
  }

  return maxDuration;
}

function calculateSharpe(returns: number[], dailyRfRate: number, tradingDays: number): number {
  const excessReturns = returns.map(r => r - dailyRfRate);
  const avgExcess = mean(excessReturns);
  const stdExcess = std(excessReturns);

  return stdExcess > 0 ? (avgExcess * tradingDays) / (stdExcess * Math.sqrt(tradingDays)) : 0;
}

function calculateSortino(returns: number[], dailyRfRate: number, tradingDays: number): number {
  const excessReturns = returns.map(r => r - dailyRfRate);
  const avgExcess = mean(excessReturns);
  const negativeReturns = excessReturns.filter(r => r < 0);
  const downsideStd = std(negativeReturns);

  return downsideStd > 0 ? (avgExcess * tradingDays) / (downsideStd * Math.sqrt(tradingDays)) : 0;
}

function calculateSkewness(returns: number[]): number {
  const n = returns.length;
  if (n < 3) return 0;

  const avg = mean(returns);
  const stdDev = std(returns);

  if (stdDev === 0) return 0;

  const skewSum = returns.reduce((sum, r) => sum + Math.pow((r - avg) / stdDev, 3), 0);

  return (n / ((n - 1) * (n - 2))) * skewSum;
}

function calculateKurtosis(returns: number[]): number {
  const n = returns.length;
  if (n < 4) return 0;

  const avg = mean(returns);
  const stdDev = std(returns);

  if (stdDev === 0) return 0;

  const kurtSum = returns.reduce((sum, r) => sum + Math.pow((r - avg) / stdDev, 4), 0);

  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurtSum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
}

function calculateJarqueBera(returns: number[], skewness: number, kurtosis: number): number {
  const n = returns.length;
  return (n / 6) * (Math.pow(skewness, 2) + Math.pow(kurtosis, 2) / 4);
}

function calculateOmegaRatio(returns: number[], threshold: number): number {
  const gains = returns.filter(r => r > threshold).reduce((a, b) => a + (b - threshold), 0);
  const losses = returns.filter(r => r <= threshold).reduce((a, b) => a + (threshold - b), 0);

  return losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;
}

function calculateTailRatio(returns: number[]): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const n = sorted.length;

  const rightTail = percentile(sorted, 95);
  const leftTail = Math.abs(percentile(sorted, 5));

  return leftTail > 0 ? rightTail / leftTail : 0;
}

function calculateBurkeRatio(returns: number[], drawdowns: number[]): number {
  const avgReturn = mean(returns);
  const drawdownSquared = drawdowns.filter(d => d < 0).reduce((sum, d) => sum + d * d, 0);

  return drawdownSquared > 0 ? avgReturn / Math.sqrt(drawdownSquared) : 0;
}

function calculateVaR(sortedReturns: number[], confidence: number): number {
  const index = Math.floor((1 - confidence) * sortedReturns.length);
  return Math.abs(sortedReturns[index]);
}

function calculateCVaR(sortedReturns: number[], confidence: number): number {
  const index = Math.floor((1 - confidence) * sortedReturns.length);
  const tailReturns = sortedReturns.slice(0, index);
  return Math.abs(mean(tailReturns));
}

function linearRegression(y: number[], x: number[]): { alpha: number; beta: number; rSquared: number; correlation: number } {
  const n = Math.min(y.length, x.length);
  if (n < 2) return { alpha: 0, beta: 1, rSquared: 0, correlation: 0 };

  const meanX = mean(x.slice(0, n));
  const meanY = mean(y.slice(0, n));

  let ssXX = 0;
  let ssYY = 0;
  let ssXY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    ssXX += dx * dx;
    ssYY += dy * dy;
    ssXY += dx * dy;
  }

  const beta = ssXX > 0 ? ssXY / ssXX : 1;
  const alpha = meanY - beta * meanX;
  const correlation = ssXX > 0 && ssYY > 0 ? ssXY / Math.sqrt(ssXX * ssYY) : 0;
  const rSquared = correlation * correlation;

  return { alpha, beta, rSquared, correlation };
}

function calculateConsecutiveStreaks(returns: number[]): { maxConsecutiveWins: number; maxConsecutiveLosses: number } {
  let maxWins = 0;
  let maxLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  for (const ret of returns) {
    if (ret > 0) {
      currentWins++;
      currentLosses = 0;
      maxWins = Math.max(maxWins, currentWins);
    } else if (ret < 0) {
      currentLosses++;
      currentWins = 0;
      maxLosses = Math.max(maxLosses, currentLosses);
    } else {
      currentWins = 0;
      currentLosses = 0;
    }
  }

  return { maxConsecutiveWins: maxWins, maxConsecutiveLosses: maxLosses };
}

function normalPDF(x: number, mean: number, std: number): number {
  const coefficient = 1 / (std * Math.sqrt(2 * Math.PI));
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(std, 2));
  return coefficient * Math.exp(exponent);
}

function generateHTMLReport(data: any): string {
  const { strategyName, benchmarkName, performance, period } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${strategyName} - Performance Tear Sheet</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #1a1a2e; border-bottom: 3px solid #0f3460; padding-bottom: 10px; }
    h2 { color: #0f3460; margin-top: 30px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .metric-card { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #0f3460; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1a1a2e; }
    .metric-value.positive { color: #28a745; }
    .metric-value.negative { color: #dc3545; }
    .section { margin: 30px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #0f3460; color: white; }
    tr:hover { background: #f5f5f5; }
    .summary { background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); color: white; padding: 25px; border-radius: 8px; margin-bottom: 30px; }
    .summary h2 { color: white; margin: 0 0 15px 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .summary-item { text-align: center; }
    .summary-value { font-size: 28px; font-weight: bold; }
    .summary-label { font-size: 12px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${strategyName}</h1>
    <p>Performance Analysis vs ${benchmarkName} | Period: ${new Date(period.start).toLocaleDateString()} - ${new Date(period.end).toLocaleDateString()}</p>
    
    <div class="summary">
      <h2>Performance Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value">${(performance.cagr * 100).toFixed(2)}%</div>
          <div class="summary-label">CAGR</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${performance.sharpeRatio.toFixed(2)}</div>
          <div class="summary-label">Sharpe Ratio</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${(performance.maxDrawdown * 100).toFixed(2)}%</div>
          <div class="summary-label">Max Drawdown</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${(performance.winRate).toFixed(1)}%</div>
          <div class="summary-label">Win Rate</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>Risk Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Volatility (Ann.)</div>
          <div class="metric-value">${(performance.volatility * 100).toFixed(2)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Sortino Ratio</div>
          <div class="metric-value">${performance.sortinoRatio.toFixed(2)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Calmar Ratio</div>
          <div class="metric-value">${performance.calmarRatio.toFixed(2)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">VaR 95%</div>
          <div class="metric-value negative">${(performance.var95 * 100).toFixed(2)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">CVaR 95%</div>
          <div class="metric-value negative">${(performance.cvar95 * 100).toFixed(2)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Kelly Criterion</div>
          <div class="metric-value">${(performance.kellyCriterion * 100).toFixed(2)}%</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>Trade Statistics</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total Trades</td><td>${performance.totalTrades}</td></tr>
        <tr><td>Winning Trades</td><td>${performance.winningTrades}</td></tr>
        <tr><td>Losing Trades</td><td>${performance.losingTrades}</td></tr>
        <tr><td>Average Win</td><td class="positive">${(performance.avgWin * 100).toFixed(4)}%</td></tr>
        <tr><td>Average Loss</td><td class="negative">${(performance.avgLoss * 100).toFixed(4)}%</td></tr>
        <tr><td>Profit Factor</td><td>${performance.profitFactor.toFixed(2)}</td></tr>
        <tr><td>Max Consecutive Wins</td><td>${performance.maxConsecutiveWins}</td></tr>
        <tr><td>Max Consecutive Losses</td><td>${performance.maxConsecutiveLosses}</td></tr>
      </table>
    </div>
    
    <div class="section">
      <h2>Distribution Analysis</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Skewness</div>
          <div class="metric-value">${performance.skewness.toFixed(3)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Kurtosis</div>
          <div class="metric-value">${performance.kurtosis.toFixed(3)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Normal Distribution</div>
          <div class="metric-value">${performance.normalDistribution ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
    
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
      Generated by CITARION QuantStats Module | ${new Date().toLocaleString()}
    </footer>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const quantstats = {
  calculatePerformanceMetrics,
  calculateRollingMetrics,
  calculateMonthlyReturns,
  calculateDrawdownAnalysis,
  calculateReturnDistribution,
  calculateBenchmarkComparison,
  generateTearSheet,
  DEFAULT_CONFIG,
};

export default quantstats;
