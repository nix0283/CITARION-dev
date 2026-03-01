'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  BarChart3,
  Settings,
  RefreshCw,
  AlertCircle,
  Database,
  FlaskConical,
  LineChart
} from 'lucide-react'

interface ModelMetrics {
  modelId: string
  accuracy: number
  winRate: number
  totalPnL: number
  sharpeRatio: number
  avgLatencyMs: number
  avgConfidence: number
  predictionsTotal: number
  tradesTotal: number
}

interface Alert {
  id: string
  modelId: string
  type: string
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  message: string
  timestamp: string
  acknowledged: boolean
}

interface Experiment {
  id: string
  name: string
  status: string
  trafficAllocation: number
  results?: {
    controlSamples: number
    treatmentSamples: number
    conclusion?: {
      winner: string
      confidence: number
      effectSize: number
    }
  }
}

export function ProductionDashboard() {
  const [models, setModels] = useState<ModelMetrics[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = useCallback(async () => {
    try {
      // Fetch monitoring data
      const monitoringRes = await fetch('/api/ml/monitoring?action=metrics')
      const monitoringData = await monitoringRes.json()
      
      // Fetch alerts
      const alertsRes = await fetch('/api/ml/monitoring?action=alerts')
      const alertsData = await alertsRes.json()
      
      // Fetch experiments
      const experimentsRes = await fetch('/api/ml/experiments')
      const experimentsData = await experimentsRes.json()
      
      if (monitoringData.success) {
        setModels(monitoringData.models || [])
      }
      
      if (alertsData.success) {
        setAlerts(alertsData.alerts || [])
      }
      
      if (experimentsData.success) {
        setExperiments(experimentsData.experiments || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await fetch('/api/ml/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge_alert',
          alertId,
          acknowledgedBy: 'user'
        })
      })
      fetchData()
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'bg-red-500'
      case 'critical': return 'bg-red-400'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-blue-500'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'destructive'
      case 'critical': return 'destructive'
      case 'warning': return 'secondary'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Production Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time ML model performance and A/B testing dashboard
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Alerts Banner */}
      {alerts.filter(a => !a.acknowledged && a.severity === 'critical').length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Alerts</AlertTitle>
          <AlertDescription>
            {alerts.filter(a => !a.acknowledged && a.severity === 'critical').length} critical alerts require attention
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="experiments">A/B Tests</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Models</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{models.length}</div>
                <p className="text-xs text-muted-foreground">
                  Deployed in production
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {models.length > 0 
                    ? `${(models.reduce((a, m) => a + m.accuracy, 0) / models.length * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Prediction accuracy
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Experiments</CardTitle>
                <FlaskConical className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {experiments.filter(e => e.status === 'running').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  A/B tests running
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {alerts.filter(a => !a.acknowledged).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Model Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Model Performance
              </CardTitle>
              <CardDescription>
                Real-time metrics for all production models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No models deployed yet
                  </p>
                ) : (
                  models.map((model) => (
                    <div key={model.modelId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{model.modelId}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Predictions: {model.predictionsTotal}</span>
                          <span>Trades: {model.tradesTotal}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-8 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Accuracy</p>
                          <p className="font-bold">{(model.accuracy * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className="font-bold">{(model.winRate * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">PnL</p>
                          <p className={`font-bold ${model.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${model.totalPnL.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Latency</p>
                          <p className="font-bold">{model.avgLatencyMs.toFixed(0)}ms</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployed Models</CardTitle>
              <CardDescription>
                All models in production with detailed metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {models.map((model) => (
                  <div key={model.modelId} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{model.modelId}</h3>
                      <Badge variant="outline">
                        {model.predictionsTotal} predictions
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Accuracy</p>
                        <Progress value={model.accuracy * 100} className="h-2" />
                        <p className="text-xs mt-1">{(model.accuracy * 100).toFixed(1)}%</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                        <Progress value={model.winRate * 100} className="h-2" />
                        <p className="text-xs mt-1">{(model.winRate * 100).toFixed(1)}%</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                        <Progress value={model.avgConfidence * 100} className="h-2" />
                        <p className="text-xs mt-1">{(model.avgConfidence * 100).toFixed(1)}%</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Sharpe Ratio</p>
                        <p className="text-xl font-bold">{model.sharpeRatio.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experiments Tab */}
        <TabsContent value="experiments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                A/B Experiments
              </CardTitle>
              <CardDescription>
                Running experiments and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {experiments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No experiments configured
                  </p>
                ) : (
                  experiments.map((exp) => (
                    <div key={exp.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{exp.name}</h3>
                        <Badge variant={exp.status === 'running' ? 'default' : 'secondary'}>
                          {exp.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Traffic</p>
                          <p className="font-medium">{(exp.trafficAllocation * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Control Samples</p>
                          <p className="font-medium">{exp.results?.controlSamples || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Treatment Samples</p>
                          <p className="font-medium">{exp.results?.treatmentSamples || 0}</p>
                        </div>
                      </div>
                      
                      {exp.results?.conclusion && (
                        <div className="mt-4 p-3 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            {exp.results.conclusion.winner === 'treatment' ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : exp.results.conclusion.winner === 'control' ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="font-medium">
                              Winner: {exp.results.conclusion.winner}
                            </span>
                            <Badge variant="outline">
                              {(exp.results.conclusion.confidence * 100).toFixed(0)}% confidence
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Performance Alerts
              </CardTitle>
              <CardDescription>
                Model alerts requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No active alerts</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 border rounded-lg ${alert.acknowledged ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)}`} />
                            <span className="font-medium">{alert.type.replace(/_/g, ' ')}</span>
                            <Badge variant={getSeverityBadge(alert.severity) as 'default' | 'secondary' | 'destructive'}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        
                        {!alert.acknowledged && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
