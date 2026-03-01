'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Activity, BarChart3, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface VolumeData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface VolumeAnalysisResult {
  breakoutsReversals: Array<{
    timestamp: number;
    breakout: boolean;
    reversal: boolean;
  }>;
  divergences: Array<{
    timestamp: number;
    divergence: 'bullish' | 'bearish' | 'none';
  }>;
  patterns: Array<{
    timestamp: number;
    volumeChange: number;
    volumeMA: number;
    volumeSpike: boolean;
    volumeIncrease: boolean;
  }>;
  confirmations: Array<{
    timestamp: number;
    priceMovement: number;
    confirmation: 'positive' | 'negative' | 'none';
  }>;
  summary: {
    totalBreakouts: number;
    totalReversals: number;
    bullishDivergences: number;
    bearishDivergences: number;
    volumeSpikes: number;
    positiveConfirmations: number;
    negativeConfirmations: number;
    currentSignal: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  };
}

interface VolumeAnalysisPanelProps {
  data: VolumeData[];
  onAnalysis?: (result: VolumeAnalysisResult) => void;
}

export function VolumeAnalysisPanel({ data, onAnalysis }: VolumeAnalysisPanelProps) {
  const [analysisResult, setAnalysisResult] = useState<VolumeAnalysisResult | null>(null);
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
      const response = await fetch('/api/indicators/volume-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          analysisType: 'comprehensive',
          options: {
            lookbackPeriod: 5,
            maPeriod: 5,
            spikeThreshold: 2.0,
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

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish':
        return 'bg-green-500';
      case 'bearish':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDivergenceIcon = (divergence: string) => {
    switch (divergence) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConfirmationIcon = (confirmation: string) => {
    switch (confirmation) {
      case 'positive':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Volume Analysis
            </CardTitle>
            <CardDescription>
              Comprehensive volume analysis: breakouts, divergences, patterns, and confirmations
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
            Click &quot;Run Analysis&quot; to analyze volume patterns
          </div>
        )}

        {analysisResult && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="breakouts">Breakouts</TabsTrigger>
              <TabsTrigger value="divergences">Divergences</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4 mt-4">
              {/* Signal Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Signal</p>
                      <p className="text-2xl font-bold capitalize">
                        {analysisResult.summary.currentSignal}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-2xl font-bold">{analysisResult.summary.confidence.toFixed(0)}%</p>
                    </div>
                    <Badge className={`${getSignalColor(analysisResult.summary.currentSignal)} text-white px-4 py-2`}>
                      {analysisResult.summary.currentSignal.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Breakouts</p>
                    <p className="text-xl font-bold text-green-500">
                      {analysisResult.summary.totalBreakouts}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Reversals</p>
                    <p className="text-xl font-bold text-orange-500">
                      {analysisResult.summary.totalReversals}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Volume Spikes</p>
                    <p className="text-xl font-bold text-purple-500">
                      {analysisResult.summary.volumeSpikes}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Bullish Divergences</p>
                    <p className="text-xl font-bold text-blue-500">
                      {analysisResult.summary.bullishDivergences}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Confirmations */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Positive Confirmations</p>
                        <p className="text-xl font-bold">{analysisResult.summary.positiveConfirmations}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Negative Confirmations</p>
                        <p className="text-xl font-bold">{analysisResult.summary.negativeConfirmations}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="breakouts" className="mt-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analysisResult.breakoutsReversals
                  .filter(item => item.breakout || item.reversal)
                  .slice(-20)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="text-sm">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        {item.breakout && (
                          <Badge className="bg-green-500">Breakout</Badge>
                        )}
                        {item.reversal && (
                          <Badge className="bg-orange-500">Reversal</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                {analysisResult.breakoutsReversals.filter(i => i.breakout || i.reversal).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No breakouts or reversals detected</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="divergences" className="mt-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analysisResult.divergences
                  .filter(item => item.divergence !== 'none')
                  .slice(-20)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="text-sm">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {getDivergenceIcon(item.divergence)}
                        <Badge className={item.divergence === 'bullish' ? 'bg-green-500' : 'bg-red-500'}>
                          {item.divergence.charAt(0).toUpperCase() + item.divergence.slice(1)} Divergence
                        </Badge>
                      </div>
                    </div>
                  ))}
                {analysisResult.divergences.filter(i => i.divergence !== 'none').length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No divergences detected</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="patterns" className="mt-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analysisResult.patterns
                  .filter(item => item.volumeSpike || item.volumeIncrease)
                  .slice(-20)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <span className="text-sm">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                        <div className="text-xs text-muted-foreground mt-1">
                          Volume Change: {(item.volumeChange * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {item.volumeSpike && (
                          <Badge className="bg-purple-500">Spike</Badge>
                        )}
                        {item.volumeIncrease && (
                          <Badge className="bg-blue-500">Increasing</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                {analysisResult.patterns.filter(i => i.volumeSpike || i.volumeIncrease).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No significant volume patterns detected</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default VolumeAnalysisPanel;
