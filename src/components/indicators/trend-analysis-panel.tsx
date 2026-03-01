'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, LineChart, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Circle, AlertCircle } from 'lucide-react';

interface TrendData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TrendLine {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  slope: number;
  type: 'support' | 'resistance';
  touches: number;
  strength: number;
}

interface TrendAnalysisResult {
  primaryTrend: 'upward' | 'downward' | 'sideways';
  trendStrength: number;
  slope: number;
  angle: number;
  rSquared: number;
  trendLines: TrendLine[];
  trendHistory: Array<{
    timestamp: number;
    trend: 'upward' | 'downward' | 'sideways';
    strength: number;
    slope: number;
    rSquared: number;
    angle: number;
  }>;
  reversalWarning: boolean;
  reversalProbability: number;
  currentSignal: {
    signal: 'buy' | 'sell' | 'hold';
    strength: number;
    reason: string;
  };
  confidence: number;
}

interface TrendAnalysisPanelProps {
  data: TrendData[];
  onAnalysis?: (result: TrendAnalysisResult) => void;
}

export function TrendAnalysisPanel({ data, onAnalysis }: TrendAnalysisPanelProps) {
  const [analysisResult, setAnalysisResult] = useState<TrendAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');

  const runAnalysis = useCallback(async () => {
    if (!data || data.length === 0) {
      setError('No data available for analysis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/indicators/trend-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          analysisType: 'comprehensive',
          options: {
            period: 20,
            step: 5,
            trendLineLookback: 50,
            touchThreshold: 0.02,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis request failed');
      }

      const result = await response.json();
      setAnalysisResult(result.result);
      onAnalysis?.(result.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [data, onAnalysis]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'upward':
      case 'bullish':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'downward':
      case 'bearish':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'upward':
      case 'bullish':
        return 'bg-green-500';
      case 'downward':
      case 'bearish':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'buy':
        return <ArrowUpCircle className="h-5 w-5 text-green-500" />;
      case 'sell':
        return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatSlope = (slope: number) => {
    const sign = slope >= 0 ? '+' : '';
    return `${sign}${(slope * 100).toFixed(4)}%`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Trend Analysis
            </CardTitle>
            <CardDescription>
              Linear regression-based trend detection with strength and reversal analysis
            </CardDescription>
          </div>
          <Button onClick={runAnalysis} disabled={loading || !data?.length}>
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </Button>
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

        {!analysisResult && !error && (
          <div className="text-center py-8 text-muted-foreground">
            Click &quot;Run Analysis&quot; to analyze market trends
          </div>
        )}

        {analysisResult && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="trendlines">Trend Lines</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4 mt-4">
              {/* Primary Signal Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getSignalIcon(analysisResult.currentSignal.signal)}
                      <div>
                        <p className="text-sm text-muted-foreground">Current Signal</p>
                        <p className="text-2xl font-bold capitalize">
                          {analysisResult.currentSignal.signal.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-2xl font-bold">{analysisResult.confidence.toFixed(0)}%</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    {analysisResult.currentSignal.reason}
                  </p>
                </CardContent>
              </Card>

              {/* Reversal Warning */}
              {analysisResult.reversalWarning && (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertTitle>Reversal Warning</AlertTitle>
                  <AlertDescription>
                    Potential trend reversal detected with {analysisResult.reversalProbability.toFixed(0)}% probability
                  </AlertDescription>
                </Alert>
              )}

              {/* Primary Trend */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(analysisResult.primaryTrend)}
                      <div>
                        <p className="text-sm text-muted-foreground">Primary Trend</p>
                        <p className="text-xl font-bold capitalize">{analysisResult.primaryTrend}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <LineChart className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Trend Strength</p>
                        <p className="text-xl font-bold">{analysisResult.trendStrength.toFixed(0)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Bar for Strength */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Trend Strength</span>
                  <span>{analysisResult.trendStrength.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      analysisResult.trendStrength > 70
                        ? 'bg-green-500'
                        : analysisResult.trendStrength > 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${analysisResult.trendStrength}%` }}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Slope</p>
                    <p className="text-xl font-bold">{formatSlope(analysisResult.slope)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Angle</p>
                    <p className="text-xl font-bold">{analysisResult.angle.toFixed(2)}°</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">R-Squared</p>
                    <p className="text-xl font-bold">{(analysisResult.rSquared * 100).toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analysisResult.rSquared > 0.7 ? 'Strong fit' : analysisResult.rSquared > 0.4 ? 'Moderate fit' : 'Weak fit'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Reversal Probability</p>
                    <p className="text-xl font-bold">{analysisResult.reversalProbability.toFixed(0)}%</p>
                  </CardContent>
                </Card>
              </div>

              {/* Interpretation */}
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">Interpretation</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Slope:</strong> {analysisResult.slope > 0 ? 'Positive' : analysisResult.slope < 0 ? 'Negative' : 'Neutral'} - indicates {analysisResult.primaryTrend} trend</li>
                    <li>• <strong>R²:</strong> {(analysisResult.rSquared * 100).toFixed(0)}% of price movement explained by trend line</li>
                    <li>• <strong>Angle:</strong> Steeper angles ({'>'}30°) indicate stronger momentum</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trendlines" className="mt-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="font-semibold mb-2">Identified Trend Lines</h4>
                {analysisResult.trendLines.map((tl, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={tl.type === 'support' ? 'bg-green-500' : 'bg-red-500'}>
                          {tl.type.charAt(0).toUpperCase() + tl.type.slice(1)}
                        </Badge>
                        <span className="text-sm">${tl.startPrice.toFixed(2)} → ${tl.endPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {tl.touches} touches • Strength: {tl.strength.toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Slope</span>
                      <p className="text-sm font-medium">{formatSlope(tl.slope)}</p>
                    </div>
                  </div>
                ))}
                {analysisResult.trendLines.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No significant trend lines identified</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="font-semibold mb-2">Trend History</h4>
                {analysisResult.trendHistory.slice(-30).map((th, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <span className="text-sm">
                        {new Date(th.timestamp).toLocaleDateString()}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        R²: {(th.rSquared * 100).toFixed(1)}% • Angle: {th.angle.toFixed(2)}°
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(th.trend)}
                      <Badge className={getTrendColor(th.trend)}>
                        {th.trend.charAt(0).toUpperCase() + th.trend.slice(1)}
                      </Badge>
                      <span className="text-xs">{th.strength.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
                {analysisResult.trendHistory.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No trend history available</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default TrendAnalysisPanel;
