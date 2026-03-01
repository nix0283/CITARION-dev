'use client'

/**
 * ML Evaluation Dashboard
 * 
 * Dashboard for monitoring model performance metrics
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'

// Types
interface EvaluationData {
  timestamp: number
  period: string
  classifier: {
    totalSamples: number
    longCount: number
    shortCount: number
    neutralCount: number
    winRate: number
    avgConfidence: number
  }
  filter: {
    totalSignals: number
    passedSignals: number
    rejectedSignals: number
    avgQualityScore: number
  }
  historical: {
    totalSamples: number
    wins: number
    losses: number
    winRate: number
    avgPnlPercent: number
  }
  featureImportance: Record<string, number>
  performanceByBot: Record<string, { total: number; wins: number; winRate: number; avgPnl: number }>
  performanceBySymbol: Record<string, { total: number; wins: number; winRate: number; avgPnl: number }>
}

export function MLEvaluationDashboard() {
  const [data, setData] = useState<EvaluationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')
  
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/ml/evaluation?period=${period}`)
      const result = await response.json()
      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch evaluation data:', error)
    } finally {
      setLoading(false)
    }
  }, [period])
  
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [fetchData])
  
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }
  
  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No evaluation data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Model Evaluation Dashboard</CardTitle>
                <CardDescription>Performance metrics and feature analysis</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">24 Hours</SelectItem>
                  <SelectItem value="week">7 Days</SelectItem>
                  <SelectItem value="month">30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Feature Importance</TabsTrigger>
          <TabsTrigger value="bots">By Bot</TabsTrigger>
          <TabsTrigger value="symbols">By Symbol</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{(data.classifier.winRate * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Win Rate</div>
                <Progress 
                  value={data.classifier.winRate * 100} 
                  className="mt-2 h-1"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{data.classifier.totalSamples}</div>
                <div className="text-sm text-muted-foreground">Total Samples</div>
                <Badge variant="outline" className="mt-2">
                  {data.classifier.longCount}L / {data.classifier.shortCount}S
                </Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-500">
                  {data.historical.avgPnlPercent > 0 ? '+' : ''}
                  {data.historical.avgPnlPercent.toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg PnL</div>
                <div className="flex items-center gap-1 mt-2">
                  {data.historical.avgPnlPercent > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {data.historical.wins}W / {data.historical.losses}L
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {(data.filter.avgQualityScore * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Quality</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {data.filter.passedSignals}/{data.filter.totalSignals} passed
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Classifier Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Lawrence Classifier Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Long Samples</div>
                  <div className="text-xl font-semibold">{data.classifier.longCount}</div>
                  <Progress 
                    value={data.classifier.totalSamples > 0 ? 
                      (data.classifier.longCount / data.classifier.totalSamples) * 100 : 0
                    } 
                    className="h-2 bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Short Samples</div>
                  <div className="text-xl font-semibold">{data.classifier.shortCount}</div>
                  <Progress 
                    value={data.classifier.totalSamples > 0 ? 
                      (data.classifier.shortCount / data.classifier.totalSamples) * 100 : 0
                    } 
                    className="h-2 bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Avg Confidence</div>
                  <div className="text-xl font-semibold">
                    {(data.classifier.avgConfidence * 100).toFixed(1)}%
                  </div>
                  <Progress 
                    value={data.classifier.avgConfidence * 100}
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Filter Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Signal Filter Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.filter.totalSignals}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{data.filter.passedSignals}</div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{data.filter.rejectedSignals}</div>
                  <div className="text-sm text-muted-foreground">Rejected</div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-muted-foreground mb-2">Pass Rate</div>
                <Progress 
                  value={data.filter.totalSignals > 0 ? 
                    (data.filter.passedSignals / data.filter.totalSignals) * 100 : 0
                  }
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Feature Importance Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Feature Importance
              </CardTitle>
              <CardDescription>
                How much each feature affects model predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.featureImportance)
                  .sort((a, b) => b[1] - a[1])
                  .map(([feature, importance]) => (
                    <div key={feature} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">{feature}</span>
                        <span className="text-sm text-muted-foreground">
                          {(importance * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={importance * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* By Bot Tab */}
        <TabsContent value="bots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Performance by Bot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.performanceByBot).length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No bot performance data available
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(data.performanceByBot)
                    .sort((a, b) => b[1].winRate - a[1].winRate)
                    .map(([bot, stats]: [string, any]) => (
                      <div key={bot} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-mono font-semibold">{bot}</div>
                          <div className="text-sm text-muted-foreground">
                            {stats.total} signals • {stats.wins} wins
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            {stats.winRate >= 0.5 ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="font-semibold">
                              {(stats.winRate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Avg: {stats.avgPnl > 0 ? '+' : ''}{stats.avgPnl.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* By Symbol Tab */}
        <TabsContent value="symbols" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                Performance by Symbol
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.performanceBySymbol).length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No symbol performance data available
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(data.performanceBySymbol)
                    .sort((a, b) => b[1].winRate - a[1].winRate)
                    .map(([symbol, stats]: [string, any]) => (
                      <div key={symbol} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-mono font-semibold">{symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {stats.total} signals • {stats.wins} wins
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            {stats.winRate >= 0.5 ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="font-semibold">
                              {(stats.winRate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Avg: {stats.avgPnl > 0 ? '+' : ''}{stats.avgPnl.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MLEvaluationDashboard
