/**
 * Portfolio Optimization API Endpoint
 * Provides various portfolio optimization methods
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  comprehensiveOptimization,
  equalWeightPortfolio,
  minimumVariancePortfolio,
  maximumSharpePortfolio,
  riskParityPortfolio,
  meanVarianceOptimization,
  blackLittermanPortfolio,
  calculateCovarianceMatrix,
  calculateExpectedReturns,
  calculateEfficientFrontier,
  calculatePortfolioMetrics,
  OptimizationConfig,
  BlackLittermanConfig,
} from '@/lib/portfolio/optimization';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { returnsData, method = 'comprehensive', config = {}, views } = body;

    if (!returnsData || typeof returnsData !== 'object') {
      return NextResponse.json(
        { error: 'Invalid or missing returns data' },
        { status: 400 }
      );
    }

    // Convert returns data to Map
    const returnsMap = new Map<string, number[]>();
    Object.entries(returnsData as Record<string, number[]>).forEach(([symbol, returns]) => {
      if (Array.isArray(returns)) {
        returnsMap.set(symbol, returns);
      }
    });

    if (returnsMap.size === 0) {
      return NextResponse.json(
        { error: 'No valid returns data provided' },
        { status: 400 }
      );
    }

    const optimizationConfig: OptimizationConfig = {
      riskFreeRate: config.riskFreeRate ?? 0.02,
      targetReturn: config.targetReturn,
      targetRisk: config.targetRisk,
      minWeight: config.minWeight ?? 0,
      maxWeight: config.maxWeight ?? 1,
      maxIterations: config.maxIterations ?? 1000,
      tolerance: config.tolerance ?? 1e-8,
    };

    // Calculate matrices
    const covarianceMatrix = calculateCovarianceMatrix(returnsMap);
    const expectedReturns = calculateExpectedReturns(returnsMap);
    const symbols = Array.from(returnsMap.keys());

    let result: Record<string, unknown>;

    switch (method) {
      case 'equal_weight':
        result = equalWeightPortfolio(symbols);
        break;

      case 'minimum_variance':
        result = minimumVariancePortfolio(covarianceMatrix, optimizationConfig);
        break;

      case 'maximum_sharpe':
        result = maximumSharpePortfolio(covarianceMatrix, expectedReturns, optimizationConfig);
        break;

      case 'risk_parity':
        result = riskParityPortfolio(covarianceMatrix, optimizationConfig);
        break;

      case 'mean_variance':
        result = meanVarianceOptimization(covarianceMatrix, expectedReturns, optimizationConfig);
        break;

      case 'black_litterman': {
        if (!views || !config.marketWeights) {
          return NextResponse.json(
            { error: 'Black-Litterman requires marketWeights and views' },
            { status: 400 }
          );
        }

        const blConfig: BlackLittermanConfig = {
          ...optimizationConfig,
          marketWeights: config.marketWeights,
          investorViews: views,
          tau: config.tau ?? 0.025,
        };

        result = blackLittermanPortfolio(covarianceMatrix, blConfig);
        break;
      }

      case 'efficient_frontier': {
        const frontierPoints = calculateEfficientFrontier(
          covarianceMatrix,
          expectedReturns,
          optimizationConfig,
          config.numPoints ?? 20
        );
        result = { efficientFrontier: frontierPoints };
        break;
      }

      case 'metrics': {
        const weights = config.weights;
        if (!weights) {
          return NextResponse.json(
            { error: 'Metrics calculation requires weights' },
            { status: 400 }
          );
        }
        result = { metrics: calculatePortfolioMetrics(weights, returnsMap, optimizationConfig) };
        break;
      }

      case 'comprehensive':
      default:
        result = comprehensiveOptimization(returnsMap, optimizationConfig);
    }

    return NextResponse.json({
      success: true,
      method,
      symbols: symbols.length,
      result,
    });
  } catch (error) {
    console.error('Portfolio optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to perform portfolio optimization', message: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return NextResponse.json({
    endpoint: 'Portfolio Optimization API',
    description: 'Various portfolio optimization methods inspired by QuantConnect LEAN',
    methods: [
      {
        method: 'comprehensive',
        description: 'Run all optimization methods and compare results',
      },
      {
        method: 'equal_weight',
        description: 'Simple equal weight allocation',
      },
      {
        method: 'minimum_variance',
        description: 'Minimize portfolio variance',
      },
      {
        method: 'maximum_sharpe',
        description: 'Maximize Sharpe ratio (tangency portfolio)',
      },
      {
        method: 'risk_parity',
        description: 'Equal risk contribution from each asset',
      },
      {
        method: 'mean_variance',
        description: 'Markowitz mean-variance optimization',
      },
      {
        method: 'black_litterman',
        description: 'Black-Litterman model with investor views',
      },
      {
        method: 'efficient_frontier',
        description: 'Calculate efficient frontier points',
      },
      {
        method: 'metrics',
        description: 'Calculate portfolio metrics for given weights',
      },
    ],
    config: {
      riskFreeRate: { type: 'number', default: 0.02, description: 'Annual risk-free rate' },
      targetReturn: { type: 'number', description: 'Target return for mean-variance' },
      minWeight: { type: 'number', default: 0, description: 'Minimum weight per asset' },
      maxWeight: { type: 'number', default: 1, description: 'Maximum weight per asset' },
      marketWeights: { type: 'object', description: 'Market cap weights for Black-Litterman' },
      views: { type: 'array', description: 'Investor views for Black-Litterman' },
    },
    usage: {
      method: 'POST',
      body: {
        returnsData: 'Object with symbol keys and returns array values',
        method: 'Optimization method to use',
        config: 'Optimization configuration',
      },
    },
  });
}
