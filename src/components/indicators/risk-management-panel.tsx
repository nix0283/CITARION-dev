'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  PieChart,
  Target,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface Position {
  symbol: string;
  quantity: number;
  marketValue: number;
  side: 'long' | 'short';
  sector?: string;
}

interface Portfolio {
  totalValue: number;
  cash: number;
  positions: Position[];
  unrealizedPnL: number;
}

interface RiskMetrics {
  currentDrawdown: number;
  maxDrawdown: number;
  portfolioVolatility: number;
  var95: number;
  cvar95: number;
  grossExposure: number;
  netExposure: number;
  leverage: number;
  top3Concentration: number;
  herfindahlIndex: number;
  effectiveN: number;
}

interface RiskAction {
  type: string;
  symbol?: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface RiskCheckResult {
  timestamp: number;
  metrics: RiskMetrics;
  actions: RiskAction[];
  riskScore: number;
  status: 'safe' | 'warning' | 'danger' | 'critical';
}

interface RiskManagementPanelProps {
  portfolio?: Portfolio;
  historicalValues?: number[];
  returns?: number[];
  onRiskCheck?: (result: RiskCheckResult) => void;
}

export function RiskManagementPanel({
  portfolio,
  historicalValues,
  returns,
  onRiskCheck,
}: RiskManagementPanelProps) {
  const [result, setResult] = useState<RiskCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');

  const runRiskCheck = useCallback(async () => {
    if (!portfolio || !historicalValues) {
      setError('Portfolio and historical values required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/risk/management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType: 'comprehensive',
          data: {
            portfolio,
            historicalValues,
            returns: returns || [],
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Risk check request failed');
      }

      const data = await response.json();
      setResult(data.result);
      onRiskCheck?.(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Risk check failed');
    } finally {
      setLoading(false);
    }
  }, [portfolio, historicalValues, returns, onRiskCheck]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'danger':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Management
            </CardTitle>
            <CardDescription>
              Comprehensive portfolio risk analysis and monitoring
            </CardDescription>
          </div>
          <Button onClick={runRiskCheck} disabled={loading || !portfolio}>
            {loading ? 'Analyzing...' : 'Check Risk'}
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

        {!result && !error && (
          <div className="text-center py-8 text-muted-foreground">
            Click &quot;Check Risk&quot; to analyze portfolio risk
          </div>
        )}

        {result && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
              <TabsTrigger value="exposure">Exposure</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4 mt-4">
              {/* Risk Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Risk Score</p>
                        <p className={`text-3xl font-bold ${getRiskScoreColor(result.riskScore)}`}>
                          {result.riskScore.toFixed(0)}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(result.status)} text-white px-4 py-2`}>
                      {result.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Risk Score Bar */}
                  <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        result.riskScore >= 80
                          ? 'bg-red-500'
                          : result.riskScore >= 60
                          ? 'bg-orange-500'
                          : result.riskScore >= 40
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${result.riskScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">VaR 95%</p>
                    <p className="text-xl font-bold text-red-500">
                      {(result.metrics.var95 * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">CVaR 95%</p>
                    <p className="text-xl font-bold text-orange-500">
                      {(result.metrics.cvar95 * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Leverage</p>
                    <p className="text-xl font-bold">
                      {result.metrics.leverage.toFixed(2)}x
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Effective N</p>
                    <p className="text-xl font-bold text-blue-500">
                      {result.metrics.effectiveN.toFixed(1)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Volatility & Concentration */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Annual Volatility</p>
                        <p className="text-xl font-bold">
                          {(result.metrics.portfolioVolatility * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Top 3 Concentration</p>
                        <p className="text-xl font-bold">
                          {(result.metrics.top3Concentration * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="drawdown" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Current Drawdown</p>
                      <p className="text-2xl font-bold text-red-500">
                        {(result.metrics.currentDrawdown * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Max Drawdown</p>
                      <p className="text-2xl font-bold text-orange-500">
                        {(result.metrics.maxDrawdown * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Herfindahl Index</p>
                      <p className="text-2xl font-bold">
                        {result.metrics.herfindahlIndex.toFixed(3)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Drawdown Visualization */}
              <div className="h-32 bg-gradient-to-b from-green-50 to-red-50 rounded-lg relative overflow-hidden">
                <div className="absolute inset-x-0 bottom-0 bg-red-200" style={{ height: `${result.metrics.currentDrawdown * 100}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-red-500/50 to-transparent" />
                </div>
                <div className="absolute inset-x-0 top-2 left-2 text-sm text-muted-foreground">
                  Drawdown Level
                </div>
              </div>
            </TabsContent>

            <TabsContent value="exposure" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Gross Exposure</p>
                    <p className="text-xl font-bold">
                      {(result.metrics.grossExposure * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Net Exposure</p>
                    <p className="text-xl font-bold">
                      {(result.metrics.netExposure * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Exposure Bars */}
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">Exposure Breakdown</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-sm">Long</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${result.metrics.grossExposure > 0 ? (result.metrics.netExposure / result.metrics.grossExposure) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-16 text-sm text-right">
                        {((result.metrics.grossExposure + result.metrics.netExposure) / 2 * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-sm">Short</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${result.metrics.grossExposure > 0 ? ((result.metrics.grossExposure - result.metrics.netExposure) / 2 / result.metrics.grossExposure) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-16 text-sm text-right">
                        {((result.metrics.grossExposure - result.metrics.netExposure) / 2 * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="mt-4">
              <div className="space-y-2">
                {result.actions.length === 0 ? (
                  <Card>
                    <CardContent className="pt-4 text-center text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No risk actions required
                    </CardContent>
                  </Card>
                ) : (
                  result.actions.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted rounded-lg"
                    >
                      {getUrgencyIcon(action.urgency)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{action.type}</Badge>
                          {action.symbol && (
                            <Badge variant="secondary">{action.symbol}</Badge>
                          )}
                        </div>
                        <p className="text-sm mt-1">{action.reason}</p>
                      </div>
                      <Badge
                        className={
                          action.urgency === 'critical'
                            ? 'bg-red-500'
                            : action.urgency === 'high'
                            ? 'bg-orange-500'
                            : action.urgency === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }
                      >
                        {action.urgency}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default RiskManagementPanel;
