'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Circle } from 'lucide-react';

interface DowTheoryData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PeakTrough {
  timestamp: number;
  type: 'peak' | 'trough';
  price: number;
  index: number;
}

interface DowTheorySignal {
  timestamp: number;
  signal: 'buy' | 'sell' | 'hold';
  strength: 'strong' | 'moderate' | 'weak';
  reason: string;
  price: number;
}

interface DowTheoryResult {
  primaryTrend: 'bullish' | 'bearish' | 'neutral';
  secondaryTrend: 'correction' | 'rally' | 'none';
  trendPhase: 'accumulation' | 'participation' | 'distribution' | 'unknown';
  peaksTroughs: PeakTrough[];
  trendPhases: Array<{
    startTimestamp: number;
    endTimestamp: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    confirmed: boolean;
  }>;
  signals: DowTheorySignal[];
  volumeConfirmation: boolean;
  currentSignal: {
    signal: 'buy' | 'sell' | 'hold';
    strength: number;
    reason: string;
  };
  confidence: number;
}

interface DowTheoryPanelProps {
  data: DowTheoryData[];
  indexData?: DowTheoryData[];
  onAnalysis?: (result: DowTheoryResult) => void;
}

export function DowTheoryPanel({ data, indexData, onAnalysis }: DowTheoryPanelProps) {
  const [analysisResult, setAnalysisResult] = useState<DowTheoryResult | null>(null);
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
      const response = await fetch('/api/indicators/dow-theory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          indexData,
          analysisType: 'comprehensive',
          options: {
            smaPeriod: 50,
            peakTroughLookback: 3,
            volumeLookback: 10,
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
  }, [data, indexData, onAnalysis]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return 'bg-green-500';
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

  const getPhaseDescription = (phase: string) => {
    switch (phase) {
      case 'accumulation':
        return 'Smart money accumulating positions';
      case 'participation':
        return 'Public participation, strong trend';
      case 'distribution':
        return 'Smart money distributing positions';
      default:
        return 'Phase not determined';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Dow Theory Analysis
            </CardTitle>
            <CardDescription>
              Classic Dow Theory trend analysis: peaks, troughs, and trend phases
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
            Click &quot;Run Analysis&quot; to apply Dow Theory principles
          </div>
        )}

        {analysisResult && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="peaks">Peaks/Troughs</TabsTrigger>
              <TabsTrigger value="signals">Signals</TabsTrigger>
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

              {/* Primary & Secondary Trend */}
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
                      <Activity className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Secondary Trend</p>
                        <p className="text-xl font-bold capitalize">{analysisResult.secondaryTrend || 'None'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trend Phase */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Trend Phase</p>
                      <p className="text-xl font-bold capitalize">{analysisResult.trendPhase}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getPhaseDescription(analysisResult.trendPhase)}
                      </p>
                    </div>
                    <Badge className={`${analysisResult.volumeConfirmation ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                      Volume {analysisResult.volumeConfirmation ? 'Confirmed' : 'Not Confirmed'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="mt-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="font-semibold mb-2">Trend History</h4>
                {analysisResult.trendPhases.map((phase, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <span className="text-sm">
                        {new Date(phase.startTimestamp).toLocaleDateString()} - {new Date(phase.endTimestamp).toLocaleDateString()}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        Strength: {phase.strength.toFixed(0)}%
                      </div>
                    </div>
                    <Badge className={getTrendColor(phase.trend)}>
                      {phase.trend.charAt(0).toUpperCase() + phase.trend.slice(1)}
                    </Badge>
                  </div>
                ))}
                {analysisResult.trendPhases.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No trend phases recorded</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="peaks" className="mt-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="font-semibold mb-2">Peaks & Troughs</h4>
                {analysisResult.peaksTroughs.slice(-30).map((pt, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <span className="text-sm">
                        {new Date(pt.timestamp).toLocaleDateString()}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        Price: ${pt.price.toFixed(2)}
                      </div>
                    </div>
                    <Badge className={pt.type === 'peak' ? 'bg-red-500' : 'bg-green-500'}>
                      {pt.type.charAt(0).toUpperCase() + pt.type.slice(1)}
                    </Badge>
                  </div>
                ))}
                {analysisResult.peaksTroughs.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No peaks or troughs identified</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="signals" className="mt-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="font-semibold mb-2">Trading Signals</h4>
                {analysisResult.signals.slice(-20).map((signal, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {getSignalIcon(signal.signal)}
                        <span className="font-medium capitalize">{signal.signal}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(signal.timestamp).toLocaleDateString()} @ ${signal.price.toFixed(2)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{signal.reason}</p>
                    </div>
                    <Badge className={signal.strength === 'strong' ? 'bg-green-600' : signal.strength === 'moderate' ? 'bg-yellow-500' : 'bg-gray-400'}>
                      {signal.strength}
                    </Badge>
                  </div>
                ))}
                {analysisResult.signals.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No signals generated</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default DowTheoryPanel;
