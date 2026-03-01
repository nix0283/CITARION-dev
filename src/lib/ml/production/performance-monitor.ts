/**
 * Performance Monitoring for ML Models
 * 
 * Real-time monitoring of model performance with alerts,
 * drift detection, and automated reporting.
 */

// ============================================================================
// Types
// ============================================================================

export interface ModelPerformanceMetrics {
  modelId: string
  modelVersion: string
  timestamp: Date
  
  // Prediction metrics
  predictionsTotal: number
  predictionsCorrect: number
  predictionsIncorrect: number
  accuracy: number
  
  // Trading metrics
  tradesTotal: number
  tradesWin: number
  tradesLoss: number
  winRate: number
  
  // Financial metrics
  totalPnL: number
  avgTradePnL: number
  profitFactor: number
  sharpeRatio: number
  maxDrawdown: number
  
  // Latency metrics
  avgLatencyMs: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  
  // Confidence metrics
  avgConfidence: number
  highConfidenceAccuracy: number  // Accuracy for high confidence predictions
  lowConfidenceAccuracy: number   // Accuracy for low confidence predictions
  
  // Drift indicators
  featureDriftScore: number
  predictionDriftScore: number
  performanceDriftScore: number
}

export interface PerformanceAlert {
  id: string
  modelId: string
  type: AlertType
  severity: AlertSeverity
  message: string
  timestamp: Date
  acknowledged: boolean
  acknowledgedAt?: Date
  acknowledgedBy?: string
  
  // Alert details
  details: {
    currentValue: number
    threshold: number
    deviation: number
    historicalAverage?: number
    trend?: 'improving' | 'declining' | 'stable'
  }
}

export type AlertType = 
  | 'accuracy_drop'
  | 'win_rate_drop'
  | 'high_latency'
  | 'prediction_drift'
  | 'feature_drift'
  | 'performance_drift'
  | 'drawdown_exceeded'
  | 'low_confidence'
  | 'anomaly_detected'

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency'

export interface AlertThreshold {
  type: AlertType
  metric: keyof ModelPerformanceMetrics
  operator: 'lt' | 'gt' | 'eq' | 'ne'
  value: number
  severity: AlertSeverity
  cooldownMinutes: number
}

export interface PerformanceReport {
  modelId: string
  period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  startDate: Date
  endDate: Date
  
  // Summary
  summary: {
    totalPredictions: number
    totalTrades: number
    totalPnL: number
    avgWinRate: number
    avgAccuracy: number
    avgSharpeRatio: number
    avgLatency: number
  }
  
  // Trends
  trends: {
    accuracy: TrendAnalysis
    winRate: TrendAnalysis
    pnl: TrendAnalysis
    latency: TrendAnalysis
    confidence: TrendAnalysis
  }
  
  // Breakdowns
  breakdowns: {
    bySymbol: Map<string, PerformanceBreakdown>
    byBotType: Map<string, PerformanceBreakdown>
    byHour: Map<number, PerformanceBreakdown>
    byDayOfWeek: Map<number, PerformanceBreakdown>
  }
  
  // Alerts
  alerts: PerformanceAlert[]
  
  // Recommendations
  recommendations: string[]
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable'
  change: number      // Percent change
  slope: number       // Linear regression slope
  r2: number          // R-squared
  forecast?: number   // Predicted next value
}

export interface PerformanceBreakdown {
  count: number
  accuracy: number
  winRate: number
  pnl: number
  avgConfidence: number
}

// ============================================================================
// Performance Monitor
// ============================================================================

export class PerformanceMonitor {
  private metrics: Map<string, ModelPerformanceMetrics[]> = new Map()
  private alerts: Map<string, PerformanceAlert[]> = new Map()
  private alertThresholds: AlertThreshold[] = []
  private lastAlertTime: Map<string, Date> = new Map()

  constructor() {
    this.initializeDefaultThresholds()
  }

  // --------------------------------------------------------------------------
  // Metrics Recording
  // --------------------------------------------------------------------------

  /**
   * Record a prediction event
   */
  recordPrediction(
    modelId: string,
    modelVersion: string,
    prediction: {
      correct: boolean
      confidence: number
      latencyMs: number
      features?: Record<string, number>
    }
  ): void {
    const metrics = this.getOrCreateMetrics(modelId, modelVersion)
    
    metrics.predictionsTotal++
    if (prediction.correct) {
      metrics.predictionsCorrect++
    } else {
      metrics.predictionsIncorrect++
    }
    metrics.accuracy = metrics.predictionsCorrect / metrics.predictionsTotal
    
    // Update confidence metrics
    const isHighConfidence = prediction.confidence >= 0.7
    const currentMetrics = this.getLatestMetrics(modelId)
    
    if (currentMetrics && isHighConfidence) {
      const highConfCorrect = Math.round(currentMetrics.highConfidenceAccuracy * (metrics.predictionsTotal * 0.6))
      const newHighConfCorrect = highConfCorrect + (prediction.correct ? 1 : 0)
      metrics.highConfidenceAccuracy = newHighConfCorrect / (metrics.predictionsTotal * 0.6 + 1)
    }
    
    // Update latency metrics
    this.updateLatencyMetrics(metrics, prediction.latencyMs)
    
    // Update confidence average
    metrics.avgConfidence = 
      (metrics.avgConfidence * (metrics.predictionsTotal - 1) + prediction.confidence) / 
      metrics.predictionsTotal
    
    // Check for alerts
    this.checkAlerts(modelId, metrics)
    
    // Store metrics
    this.storeMetrics(modelId, metrics)
  }

  /**
   * Record a trade outcome
   */
  recordTrade(
    modelId: string,
    modelVersion: string,
    trade: {
      outcome: 'win' | 'loss' | 'neutral'
      pnl: number
      confidence: number
    }
  ): void {
    const metrics = this.getOrCreateMetrics(modelId, modelVersion)
    
    metrics.tradesTotal++
    if (trade.outcome === 'win') {
      metrics.tradesWin++
    } else if (trade.outcome === 'loss') {
      metrics.tradesLoss++
    }
    
    metrics.winRate = metrics.tradesWin / metrics.tradesTotal
    
    // Update financial metrics
    metrics.totalPnL += trade.pnl
    metrics.avgTradePnL = metrics.totalPnL / metrics.tradesTotal
    
    // Calculate profit factor
    const grossProfit = trade.pnl > 0 ? trade.pnl : 0
    const grossLoss = trade.pnl < 0 ? Math.abs(trade.pnl) : 0
    // Simplified profit factor calculation
    metrics.profitFactor = metrics.tradesLoss > 0 
      ? (metrics.tradesWin * metrics.avgTradePnL) / (metrics.tradesLoss * Math.abs(metrics.avgTradePnL))
      : metrics.tradesWin > 0 ? Infinity : 0
    
    // Check for alerts
    this.checkAlerts(modelId, metrics)
    
    // Store metrics
    this.storeMetrics(modelId, metrics)
  }

  /**
   * Record drift metrics
   */
  recordDrift(
    modelId: string,
    modelVersion: string,
    drift: {
      featureDrift?: number
      predictionDrift?: number
      performanceDrift?: number
    }
  ): void {
    const metrics = this.getOrCreateMetrics(modelId, modelVersion)
    
    if (drift.featureDrift !== undefined) {
      metrics.featureDriftScore = drift.featureDrift
    }
    if (drift.predictionDrift !== undefined) {
      metrics.predictionDriftScore = drift.predictionDrift
    }
    if (drift.performanceDrift !== undefined) {
      metrics.performanceDriftScore = drift.performanceDrift
    }
    
    // Check for drift alerts
    this.checkAlerts(modelId, metrics)
    
    // Store metrics
    this.storeMetrics(modelId, metrics)
  }

  // --------------------------------------------------------------------------
  // Metrics Retrieval
  // --------------------------------------------------------------------------

  /**
   * Get latest metrics for a model
   */
  getLatestMetrics(modelId: string): ModelPerformanceMetrics | null {
    const metrics = this.metrics.get(modelId)
    if (!metrics || metrics.length === 0) return null
    return metrics[metrics.length - 1]
  }

  /**
   * Get metrics history for a model
   */
  getMetricsHistory(
    modelId: string,
    startDate?: Date,
    endDate?: Date
  ): ModelPerformanceMetrics[] {
    let metrics = this.metrics.get(modelId) || []
    
    if (startDate) {
      metrics = metrics.filter(m => m.timestamp >= startDate)
    }
    if (endDate) {
      metrics = metrics.filter(m => m.timestamp <= endDate)
    }
    
    return metrics
  }

  /**
   * Get all active models
   */
  getActiveModels(): string[] {
    return Array.from(this.metrics.keys())
  }

  // --------------------------------------------------------------------------
  // Alerts
  // --------------------------------------------------------------------------

  /**
   * Get active alerts for a model
   */
  getActiveAlerts(modelId?: string): PerformanceAlert[] {
    const allAlerts: PerformanceAlert[] = []
    
    for (const [id, alerts] of this.alerts) {
      if (!modelId || id === modelId) {
        allAlerts.push(...alerts.filter(a => !a.acknowledged))
      }
    }
    
    return allAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    for (const [, alerts] of this.alerts) {
      const alert = alerts.find(a => a.id === alertId)
      if (alert) {
        alert.acknowledged = true
        alert.acknowledgedAt = new Date()
        alert.acknowledgedBy = acknowledgedBy
        return true
      }
    }
    return false
  }

  /**
   * Add custom alert threshold
   */
  addAlertThreshold(threshold: AlertThreshold): void {
    this.alertThresholds.push(threshold)
  }

  // --------------------------------------------------------------------------
  // Reports
  // --------------------------------------------------------------------------

  /**
   * Generate performance report
   */
  generateReport(
    modelId: string,
    period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): PerformanceReport | null {
    const now = new Date()
    const startDate = this.getPeriodStart(now, period)
    const metrics = this.getMetricsHistory(modelId, startDate, now)
    
    if (metrics.length === 0) return null
    
    const alerts = this.alerts.get(modelId)?.filter(a => a.timestamp >= startDate) || []
    
    return {
      modelId,
      period,
      startDate,
      endDate: now,
      
      summary: this.calculateSummary(metrics),
      trends: this.calculateTrends(metrics),
      breakdowns: this.calculateBreakdowns(metrics),
      alerts,
      recommendations: this.generateRecommendations(metrics, alerts)
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private getOrCreateMetrics(modelId: string, modelVersion: string): ModelPerformanceMetrics {
    const existing = this.getLatestMetrics(modelId)
    
    if (existing) {
      return { ...existing, timestamp: new Date() }
    }
    
    return {
      modelId,
      modelVersion,
      timestamp: new Date(),
      predictionsTotal: 0,
      predictionsCorrect: 0,
      predictionsIncorrect: 0,
      accuracy: 0,
      tradesTotal: 0,
      tradesWin: 0,
      tradesLoss: 0,
      winRate: 0,
      totalPnL: 0,
      avgTradePnL: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      avgConfidence: 0,
      highConfidenceAccuracy: 0,
      lowConfidenceAccuracy: 0,
      featureDriftScore: 0,
      predictionDriftScore: 0,
      performanceDriftScore: 0
    }
  }

  private storeMetrics(modelId: string, metrics: ModelPerformanceMetrics): void {
    if (!this.metrics.has(modelId)) {
      this.metrics.set(modelId, [])
    }
    
    this.metrics.get(modelId)!.push(metrics)
    
    // Keep only last 10000 metrics per model
    const history = this.metrics.get(modelId)!
    if (history.length > 10000) {
      this.metrics.set(modelId, history.slice(-10000))
    }
  }

  private updateLatencyMetrics(metrics: ModelPerformanceMetrics, latencyMs: number): void {
    // Exponential moving average
    const alpha = 0.1
    metrics.avgLatencyMs = alpha * latencyMs + (1 - alpha) * metrics.avgLatencyMs
    
    // Simplified percentile estimation
    metrics.p50LatencyMs = metrics.avgLatencyMs
    metrics.p95LatencyMs = metrics.avgLatencyMs * 1.5
    metrics.p99LatencyMs = metrics.avgLatencyMs * 2
  }

  private initializeDefaultThresholds(): void {
    this.alertThresholds = [
      {
        type: 'accuracy_drop',
        metric: 'accuracy',
        operator: 'lt',
        value: 0.5,
        severity: 'warning',
        cooldownMinutes: 60
      },
      {
        type: 'accuracy_drop',
        metric: 'accuracy',
        operator: 'lt',
        value: 0.4,
        severity: 'critical',
        cooldownMinutes: 30
      },
      {
        type: 'win_rate_drop',
        metric: 'winRate',
        operator: 'lt',
        value: 0.4,
        severity: 'warning',
        cooldownMinutes: 60
      },
      {
        type: 'high_latency',
        metric: 'p99LatencyMs',
        operator: 'gt',
        value: 1000,
        severity: 'warning',
        cooldownMinutes: 15
      },
      {
        type: 'prediction_drift',
        metric: 'predictionDriftScore',
        operator: 'gt',
        value: 0.3,
        severity: 'warning',
        cooldownMinutes: 120
      },
      {
        type: 'feature_drift',
        metric: 'featureDriftScore',
        operator: 'gt',
        value: 0.3,
        severity: 'warning',
        cooldownMinutes: 120
      },
      {
        type: 'drawdown_exceeded',
        metric: 'maxDrawdown',
        operator: 'gt',
        value: 0.2,
        severity: 'critical',
        cooldownMinutes: 30
      }
    ]
  }

  private checkAlerts(modelId: string, metrics: ModelPerformanceMetrics): void {
    const alertKey = (type: AlertType) => `${modelId}-${type}`
    
    for (const threshold of this.alertThresholds) {
      const value = metrics[threshold.metric] as number
      let triggered = false
      
      switch (threshold.operator) {
        case 'lt':
          triggered = value < threshold.value
          break
        case 'gt':
          triggered = value > threshold.value
          break
        case 'eq':
          triggered = value === threshold.value
          break
        case 'ne':
          triggered = value !== threshold.value
          break
      }
      
      if (triggered) {
        // Check cooldown
        const lastAlert = this.lastAlertTime.get(alertKey(threshold.type))
        if (lastAlert) {
          const minutesSince = (Date.now() - lastAlert.getTime()) / (1000 * 60)
          if (minutesSince < threshold.cooldownMinutes) {
            continue
          }
        }
        
        // Create alert
        this.createAlert(modelId, threshold, value)
        this.lastAlertTime.set(alertKey(threshold.type), new Date())
      }
    }
  }

  private createAlert(
    modelId: string,
    threshold: AlertThreshold,
    currentValue: number
  ): void {
    const alert: PerformanceAlert = {
      id: `${modelId}-${threshold.type}-${Date.now()}`,
      modelId,
      type: threshold.type,
      severity: threshold.severity,
      message: this.getAlertMessage(threshold.type, currentValue, threshold.value),
      timestamp: new Date(),
      acknowledged: false,
      details: {
        currentValue,
        threshold: threshold.value,
        deviation: Math.abs(currentValue - threshold.value)
      }
    }
    
    if (!this.alerts.has(modelId)) {
      this.alerts.set(modelId, [])
    }
    
    this.alerts.get(modelId)!.push(alert)
    
    // Keep only last 1000 alerts per model
    const alerts = this.alerts.get(modelId)!
    if (alerts.length > 1000) {
      this.alerts.set(modelId, alerts.slice(-1000))
    }
  }

  private getAlertMessage(type: AlertType, current: number, threshold: number): string {
    const messages: Record<AlertType, string> = {
      accuracy_drop: `Model accuracy dropped to ${(current * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`,
      win_rate_drop: `Win rate dropped to ${(current * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`,
      high_latency: `P99 latency is ${current.toFixed(0)}ms (threshold: ${threshold.toFixed(0)}ms)`,
      prediction_drift: `Prediction drift detected: ${current.toFixed(3)} (threshold: ${threshold.toFixed(3)})`,
      feature_drift: `Feature drift detected: ${current.toFixed(3)} (threshold: ${threshold.toFixed(3)})`,
      performance_drift: `Performance drift detected: ${current.toFixed(3)}`,
      drawdown_exceeded: `Max drawdown exceeded: ${(current * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`,
      low_confidence: `Average confidence is low: ${(current * 100).toFixed(1)}%`,
      anomaly_detected: `Anomaly detected in model behavior`
    }
    
    return messages[type]
  }

  private getPeriodStart(now: Date, period: 'hourly' | 'daily' | 'weekly' | 'monthly'): Date {
    const start = new Date(now)
    
    switch (period) {
      case 'hourly':
        start.setHours(start.getHours() - 1)
        break
      case 'daily':
        start.setDate(start.getDate() - 1)
        break
      case 'weekly':
        start.setDate(start.getDate() - 7)
        break
      case 'monthly':
        start.setMonth(start.getMonth() - 1)
        break
    }
    
    return start
  }

  private calculateSummary(metrics: ModelPerformanceMetrics[]): PerformanceReport['summary'] {
    const latest = metrics[metrics.length - 1]
    
    return {
      totalPredictions: metrics.reduce((a, m) => a + m.predictionsTotal, 0),
      totalTrades: metrics.reduce((a, m) => a + m.tradesTotal, 0),
      totalPnL: latest.totalPnL,
      avgWinRate: metrics.reduce((a, m) => a + m.winRate, 0) / metrics.length,
      avgAccuracy: metrics.reduce((a, m) => a + m.accuracy, 0) / metrics.length,
      avgSharpeRatio: metrics.reduce((a, m) => a + m.sharpeRatio, 0) / metrics.length,
      avgLatency: metrics.reduce((a, m) => a + m.avgLatencyMs, 0) / metrics.length
    }
  }

  private calculateTrends(metrics: ModelPerformanceMetrics[]): PerformanceReport['trends'] {
    return {
      accuracy: this.calculateTrend(metrics.map(m => m.accuracy)),
      winRate: this.calculateTrend(metrics.map(m => m.winRate)),
      pnl: this.calculateTrend(metrics.map(m => m.totalPnL)),
      latency: this.calculateTrend(metrics.map(m => m.avgLatencyMs)),
      confidence: this.calculateTrend(metrics.map(m => m.avgConfidence))
    }
  }

  private calculateTrend(values: number[]): TrendAnalysis {
    if (values.length < 2) {
      return { direction: 'stable', change: 0, slope: 0, r2: 0 }
    }
    
    // Linear regression
    const n = values.length
    const xMean = (n - 1) / 2
    const yMean = values.reduce((a, b) => a + b, 0) / n
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean)
      denominator += Math.pow(i - xMean, 2)
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0
    
    // R-squared
    const yPred = values.map((_, i) => slope * i + yMean)
    const ssRes = values.reduce((a, y, i) => a + Math.pow(y - yPred[i], 2), 0)
    const ssTot = values.reduce((a, y) => a + Math.pow(y - yMean, 2), 0)
    const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0
    
    // Change
    const change = values.length > 1 
      ? ((values[values.length - 1] - values[0]) / Math.abs(values[0] || 1)) * 100
      : 0
    
    return {
      direction: slope > 0.001 ? 'up' : slope < -0.001 ? 'down' : 'stable',
      change,
      slope,
      r2,
      forecast: slope * n + yMean
    }
  }

  private calculateBreakdowns(metrics: ModelPerformanceMetrics[]): PerformanceReport['breakdowns'] {
    // Simplified breakdowns - would need actual symbol/bot data
    return {
      bySymbol: new Map(),
      byBotType: new Map(),
      byHour: new Map(),
      byDayOfWeek: new Map()
    }
  }

  private generateRecommendations(
    metrics: ModelPerformanceMetrics[],
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = []
    const latest = metrics[metrics.length - 1]
    
    // Accuracy recommendations
    if (latest.accuracy < 0.5) {
      recommendations.push('Consider retraining the model - accuracy below 50%')
    }
    
    // Drift recommendations
    if (latest.featureDriftScore > 0.2) {
      recommendations.push('Feature drift detected - review feature engineering')
    }
    
    if (latest.predictionDriftScore > 0.2) {
      recommendations.push('Prediction drift detected - consider model retraining')
    }
    
    // Latency recommendations
    if (latest.p99LatencyMs > 500) {
      recommendations.push('High latency detected - optimize model inference')
    }
    
    // Alert-based recommendations
    const criticalAlerts = alerts.filter(a => a.severity === 'critical')
    if (criticalAlerts.length > 0) {
      recommendations.push(`${criticalAlerts.length} critical alerts require immediate attention`)
    }
    
    return recommendations
  }
}

// ============================================================================
// Singleton
// ============================================================================

let monitorInstance: PerformanceMonitor | null = null

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor()
  }
  return monitorInstance
}
