'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PieChart, TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, Target } from 'lucide-react';

interface OptimizationResult {
  portfolios?: {
    equalWeight: { weights: Record<string, number>; method: string };
    minimumVariance: { weights: Record<string, number>; method: string } | null;
    maximumSharpe: { weights: Record<string, number>; method: string; metrics: { sharpeRatio: number } } | null;
    riskParity: { weights: Record<string, number>; method: string };
    meanVariance: { weights: Record<string, number>; method: string } | null;
  };
  efficientFrontier?: Array<{ expectedReturn: number; volatility: number; sharpeRatio: number }>;
  metrics?: {
    symbols: string[];
    expectedReturns: Record<string, number>;
  };
}

interface PortfolioOptimizationPanelProps {
  returnsData?: Record<string, number[]>;
  onOptimize?: (result: OptimizationResult) => void;
}

export function PortfolioOptimizationPanel({ returnsData, onOptimize }: PortfolioOptimizationPanelProps) {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState('comprehensive');
  const [activeTab, setActiveTab] = useState('weights');

  const runOptimization = useCallback(async () => {
    if (!returnsData || Object.keys(returnsData).length === 0) {
      setError('No returns data available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portfolio/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnsData,
          method,
          config: {
            riskFreeRate: 0.02,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Optimization request failed');
      }

      const data = await response.json();
      setResult(data.result);
      onOptimize?.(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setLoading(false);
    }
  }, [returnsData, method, onOptimize]);

  const getWeightColor = (weight: number) => {
    if (weight > 0.3) return 'bg-blue-600';
    if (weight > 0.2) return 'bg-blue-500';
    if (weight > 0.1) return 'bg-blue-400';
    return 'bg-blue-300';
  };

  const renderWeights = (weights: Record<string, number>, title: string) => {
    const entries = Object.entries(weights).sort((a, b) => b[1] - a[1]);

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {entries.map(([symbol, weight]) => (
              <div key={symbol} className="flex items-center gap-2">
                <span className="w-20 text-sm truncate">{symbol}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                  <div
                    className={`h-full ${getWeightColor(weight)}`}
                    style={{ width: `${weight * 100}%` }}
                  />
                </div>
                <span className="w-16 text-sm text-right">
                  {(weight * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Portfolio Optimization
            </CardTitle>
            <CardDescription>
              Optimize portfolio weights using various methods
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comprehensive">Comprehensive</SelectItem>
                <SelectItem value="equal_weight">Equal Weight</SelectItem>
                <SelectItem value="minimum_variance">Min Variance</SelectItem>
                <SelectItem value="maximum_sharpe">Max Sharpe</SelectItem>
                <SelectItem value="risk_parity">Risk Parity</SelectItem>
                <SelectItem value="mean_variance">Mean-Variance</SelectItem>
                <SelectItem value="efficient_frontier">Efficient Frontier</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={runOptimization} disabled={loading || !returnsData}>
              {loading ? 'Optimizing...' : 'Optimize'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!result && !error && (
          <div className="text-center py-8 text-muted-foreground">
            Click &quot;Optimize&quot; to calculate optimal portfolio weights
          </div>
        )}

        {result && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="weights">Weights</TabsTrigger>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
              <TabsTrigger value="frontier">Efficient Frontier</TabsTrigger>
            </TabsList>

            <TabsContent value="weights" className="mt-4">
              {result.portfolios && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderWeights(result.portfolios.equalWeight.weights, 'Equal Weight')}
                  {result.portfolios.maximumSharpe && renderWeights(result.portfolios.maximumSharpe.weights, 'Maximum Sharpe')}
                  {result.portfolios.minimumVariance && renderWeights(result.portfolios.minimumVariance.weights, 'Minimum Variance')}
                  {renderWeights(result.portfolios.riskParity.weights, 'Risk Parity')}
                  {result.portfolios.meanVariance && renderWeights(result.portfolios.meanVariance.weights, 'Mean-Variance')}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="mt-4">
              {result.portfolios && (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Method</th>
                            <th className="text-right py-2">Expected Return</th>
                            <th className="text-right py-2">Volatility</th>
                            <th className="text-right py-2">Sharpe Ratio</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2">Equal Weight</td>
                            <td className="text-right">-</td>
                            <td className="text-right">-</td>
                            <td className="text-right">-</td>
                          </tr>
                          {result.portfolios.maximumSharpe && (
                            <tr className="border-b bg-green-50">
                              <td className="py-2 font-medium">Maximum Sharpe ★</td>
                              <td className="text-right">
                                {(result.portfolios.maximumSharpe.metrics.expectedReturn * 100).toFixed(1)}%
                              </td>
                              <td className="text-right">
                                {(result.portfolios.maximumSharpe.metrics.volatility * 100).toFixed(1)}%
                              </td>
                              <td className="text-right font-medium">
                                {result.portfolios.maximumSharpe.metrics.sharpeRatio.toFixed(2)}
                              </td>
                            </tr>
                          )}
                          {result.portfolios.minimumVariance && (
                            <tr className="border-b">
                              <td className="py-2">Minimum Variance</td>
                              <td className="text-right">-</td>
                              <td className="text-right">
                                {(result.portfolios.minimumVariance.metrics.volatility * 100).toFixed(1)}%
                              </td>
                              <td className="text-right">-</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="frontier" className="mt-4">
              {result.efficientFrontier ? (
                <div className="space-y-4">
                  <div className="h-64 flex items-end gap-1">
                    {result.efficientFrontier.map((point, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                        style={{ height: `${(point.sharpeRatio / 2) * 100}%` }}
                        title={`Return: ${(point.expectedReturn * 100).toFixed(1)}%, Vol: ${(point.volatility * 100).toFixed(1)}%`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">Min Volatility</p>
                      <p className="font-medium">
                        {(Math.min(...result.efficientFrontier.map(p => p.volatility)) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Max Return</p>
                      <p className="font-medium">
                        {(Math.max(...result.efficientFrontier.map(p => p.expectedReturn)) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Max Sharpe</p>
                      <p className="font-medium">
                        {Math.max(...result.efficientFrontier.map(p => p.sharpeRatio)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Select &quot;Efficient Frontier&quot; method to view
                </p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default PortfolioOptimizationPanel;
