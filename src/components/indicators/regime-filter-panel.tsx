'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

// Types
interface RegimeFilterData {
  adx: {
    adx: number[];
    plusDI: number[];
    minusDI: number[];
    trendStrength: string;
  };
  tni: {
    tni: number[];
    tniSmoothed: number[];
    trendDirection: string;
  };
  regime: {
    regime: string;
    confidence: number;
    trendStrength: string;
    trendDirection: string;
    regimeStability: number;
    regimeDuration: number;
    transitionProbability: number;
  };
  filterScore: number;
  passFilter?: boolean;
  filterReason?: string;
  recommendation?: string;
}

interface RegimeFilterPanelProps {
  data: RegimeFilterData | null;
  loading?: boolean;
}

// Helper functions
const getRegimeColor = (regime: string): string => {
  switch (regime) {
    case 'trending_up':
      return 'text-green-500';
    case 'trending_down':
      return 'text-red-500';
    case 'ranging':
      return 'text-yellow-500';
    case 'volatile':
      return 'text-orange-500';
    case 'transitional':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
};

const getRegimeBadge = (regime: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (regime) {
    case 'trending_up':
      return 'default';
    case 'trending_down':
      return 'destructive';
    case 'ranging':
    case 'volatile':
    case 'transitional':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getRegimeIcon = (regime: string) => {
  switch (regime) {
    case 'trending_up':
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    case 'trending_down':
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    case 'ranging':
      return <Activity className="h-5 w-5 text-yellow-500" />;
    case 'volatile':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'transitional':
      return <Gauge className="h-5 w-5 text-blue-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

const getTrendStrengthLabel = (strength: string): { label: string; color: string } => {
  switch (strength) {
    case 'very_strong':
      return { label: 'Very Strong', color: 'bg-green-500' };
    case 'strong':
      return { label: 'Strong', color: 'bg-green-400' };
    case 'moderate':
      return { label: 'Moderate', color: 'bg-yellow-400' };
    case 'weak':
      return { label: 'Weak', color: 'bg-orange-400' };
    case 'none':
    default:
      return { label: 'None', color: 'bg-gray-400' };
  }
};

const formatRegime = (regime: string): string => {
  return regime
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function RegimeFilterPanel({ data, loading = false }: RegimeFilterPanelProps) {
  const [activeTab, setActiveTab] = useState('summary');

  // Get latest values
  const latestADX = useMemo(() => {
    if (!data?.adx?.adx) return null;
    const values = data.adx.adx.filter((v) => !isNaN(v));
    return values.length > 0 ? values[values.length - 1] : null;
  }, [data]);

  const latestPlusDI = useMemo(() => {
    if (!data?.adx?.plusDI) return null;
    const values = data.adx.plusDI.filter((v) => !isNaN(v));
    return values.length > 0 ? values[values.length - 1] : null;
  }, [data]);

  const latestMinusDI = useMemo(() => {
    if (!data?.adx?.minusDI) return null;
    const values = data.adx.minusDI.filter((v) => !isNaN(v));
    return values.length > 0 ? values[values.length - 1] : null;
  }, [data]);

  const latestTNI = useMemo(() => {
    if (!data?.tni?.tniSmoothed) return null;
    const values = data.tni.tniSmoothed.filter((v) => !isNaN(v));
    return values.length > 0 ? values[values.length - 1] : null;
  }, [data]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Regime Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Regime Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No regime data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const { regime, filterScore, passFilter, filterReason, recommendation } = data;
  const strengthInfo = getTrendStrengthLabel(regime.trendStrength);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Regime Filter
          </div>
          <Badge variant={getRegimeBadge(regime.regime)} className="ml-2">
            {formatRegime(regime.regime)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="adx">ADX</TabsTrigger>
            <TabsTrigger value="tni">TNI</TabsTrigger>
            <TabsTrigger value="regime">Regime</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4 mt-4">
            {/* Regime Overview */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getRegimeIcon(regime.regime)}
                <div>
                  <div className="font-medium">{formatRegime(regime.regime)}</div>
                  <div className="text-sm text-muted-foreground">
                    Confidence: {regime.confidence.toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Filter Score</div>
                <div className="text-2xl font-bold">{filterScore.toFixed(0)}</div>
              </div>
            </div>

            {/* Filter Status */}
            {passFilter !== undefined && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                passFilter ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {passFilter ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={passFilter ? 'text-green-500' : 'text-red-500'}>
                  {passFilter ? 'Signal Passes Filter' : 'Signal Blocked by Filter'}
                </span>
              </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">ADX</div>
                <div className="text-xl font-bold">
                  {latestADX !== null ? latestADX.toFixed(1) : 'N/A'}
                </div>
                <Badge variant="outline" className={strengthInfo.color + ' text-white'}>
                  {strengthInfo.label}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">TNI</div>
                <div className="text-xl font-bold">
                  {latestTNI !== null ? latestTNI.toFixed(1) : 'N/A'}
                </div>
                <Badge variant="outline">
                  {regime.trendDirection.charAt(0).toUpperCase() + regime.trendDirection.slice(1)}
                </Badge>
              </div>
            </div>

            {/* DI Comparison */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">DI Comparison</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">+DI: {latestPlusDI?.toFixed(1) ?? 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">-DI: {latestMinusDI?.toFixed(1) ?? 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            {recommendation && (
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <div className="text-sm font-medium text-blue-500 mb-1">Recommendation</div>
                <div className="text-sm">{recommendation}</div>
              </div>
            )}
          </TabsContent>

          {/* ADX Tab */}
          <TabsContent value="adx" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">ADX Value</span>
                <span className="text-lg font-bold">
                  {latestADX !== null ? latestADX.toFixed(2) : 'N/A'}
                </span>
              </div>

              {/* ADX Strength Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>20 (Weak)</span>
                  <span>25 (Strong)</span>
                  <span>50</span>
                  <span>100</span>
                </div>
                <Progress value={latestADX ?? 0} max={100} className="h-3" />
                <div className="relative h-2">
                  <div
                    className="absolute h-full w-0.5 bg-yellow-500"
                    style={{ left: '20%' }}
                  />
                  <div
                    className="absolute h-full w-0.5 bg-green-500"
                    style={{ left: '25%' }}
                  />
                </div>
              </div>

              {/* DI Lines */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <div className="text-sm text-muted-foreground">+DI (Bullish)</div>
                  <div className="text-xl font-bold text-green-500">
                    {latestPlusDI?.toFixed(2) ?? 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <div className="text-sm text-muted-foreground">-DI (Bearish)</div>
                  <div className="text-xl font-bold text-red-500">
                    {latestMinusDI?.toFixed(2) ?? 'N/A'}
                  </div>
                </div>
              </div>

              {/* ADX Interpretation */}
              <div className="space-y-2 text-sm">
                <div className="font-medium">Interpretation</div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>ADX {'<'} 20: Weak or no trend (ranging market)</li>
                  <li>ADX 20-25: Developing trend</li>
                  <li>ADX 25-50: Strong trend</li>
                  <li>ADX 50-75: Very strong trend</li>
                  <li>ADX {'>'} 75: Extremely strong trend (rare)</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* TNI Tab */}
          <TabsContent value="tni" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">TNI Value</span>
                <span className="text-lg font-bold">
                  {latestTNI !== null ? latestTNI.toFixed(2) : 'N/A'}
                </span>
              </div>

              {/* TNI Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-100 (Bearish)</span>
                  <span>0</span>
                  <span>+100 (Bullish)</span>
                </div>
                <div className="relative h-6 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded">
                  <div
                    className="absolute top-0 w-1 h-full bg-white border border-gray-300"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((latestTNI ?? 0) + 100) / 2))}%`,
                    }}
                  />
                </div>
              </div>

              {/* TNI Direction */}
              <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                {regime.trendDirection === 'bullish' && (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                )}
                {regime.trendDirection === 'bearish' && (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                {regime.trendDirection === 'neutral' && (
                  <Activity className="h-5 w-5 text-yellow-500" />
                )}
                {regime.trendDirection === 'transitional' && (
                  <Gauge className="h-5 w-5 text-blue-500" />
                )}
                <span className="font-medium capitalize">{regime.trendDirection}</span>
              </div>

              {/* TNI Interpretation */}
              <div className="space-y-2 text-sm">
                <div className="font-medium">Interpretation</div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>TNI {'>'} 30: Strong bullish trend</li>
                  <li>TNI 15-30: Moderate bullish bias</li>
                  <li>TNI -15 to +15: Neutral / transitional</li>
                  <li>TNI -30 to -15: Moderate bearish bias</li>
                  <li>TNI {'<'} -30: Strong bearish trend</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Regime Tab */}
          <TabsContent value="regime" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Current Regime */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                {getRegimeIcon(regime.regime)}
                <div>
                  <div className="font-medium text-lg">{formatRegime(regime.regime)}</div>
                  <div className="text-sm text-muted-foreground">
                    Trend: {strengthInfo.label}
                  </div>
                </div>
              </div>

              {/* Regime Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Confidence</div>
                  <Progress value={regime.confidence} className="h-2" />
                  <div className="text-xs text-right">{regime.confidence.toFixed(0)}%</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Stability</div>
                  <Progress value={regime.regimeStability} className="h-2" />
                  <div className="text-xs text-right">{regime.regimeStability.toFixed(0)}%</div>
                </div>
              </div>

              {/* Duration Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Regime Duration</div>
                  <div className="text-xl font-bold">{regime.regimeDuration} bars</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Transition Prob.</div>
                  <div className="text-xl font-bold">{regime.transitionProbability.toFixed(0)}%</div>
                </div>
              </div>

              {/* Regime Types */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Regime Types</div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Trending Up: Strong uptrend, favor long positions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span>Trending Down: Strong downtrend, favor short positions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-yellow-500" />
                    <span>Ranging: Sideways market, use range strategies</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span>Volatile: High uncertainty, reduce position size</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-blue-500" />
                    <span>Transitional: Regime change, wait for confirmation</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Filter Reason */}
        {filterReason && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-1">Filter Details</div>
            <div className="text-xs text-muted-foreground whitespace-pre-wrap">
              {filterReason}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RegimeFilterPanel;
