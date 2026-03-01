import { NextRequest, NextResponse } from 'next/server'
import { getPerformanceMonitor } from '@/lib/ml/production'

// GET /api/ml/monitoring - Get monitoring data
export async function GET(request: NextRequest) {
  try {
    const monitor = getPerformanceMonitor()
    const { searchParams } = new URL(request.url)
    
    const modelId = searchParams.get('modelId')
    const action = searchParams.get('action') || 'metrics'
    
    // Get latest metrics
    if (action === 'metrics') {
      if (modelId) {
        const metrics = monitor.getLatestMetrics(modelId)
        return NextResponse.json({
          success: true,
          metrics
        })
      } else {
        // Get all active models
        const models = monitor.getActiveModels()
        const allMetrics = models.map(id => ({
          modelId: id,
          ...monitor.getLatestMetrics(id)
        }))
        
        return NextResponse.json({
          success: true,
          models: allMetrics
        })
      }
    }
    
    // Get metrics history
    if (action === 'history') {
      if (!modelId) {
        return NextResponse.json(
          { success: false, error: 'modelId is required for history' },
          { status: 400 }
        )
      }
      
      const startDate = searchParams.get('startDate') 
        ? new Date(searchParams.get('startDate')!) 
        : undefined
      const endDate = searchParams.get('endDate') 
        ? new Date(searchParams.get('endDate')!) 
        : undefined
      
      const history = monitor.getMetricsHistory(modelId, startDate, endDate)
      
      return NextResponse.json({
        success: true,
        history,
        total: history.length
      })
    }
    
    // Get alerts
    if (action === 'alerts') {
      const alerts = monitor.getActiveAlerts(modelId || undefined)
      
      return NextResponse.json({
        success: true,
        alerts: alerts.map(a => ({
          id: a.id,
          modelId: a.modelId,
          type: a.type,
          severity: a.severity,
          message: a.message,
          timestamp: a.timestamp,
          acknowledged: a.acknowledged,
          details: a.details
        })),
        total: alerts.length
      })
    }
    
    // Get report
    if (action === 'report') {
      if (!modelId) {
        return NextResponse.json(
          { success: false, error: 'modelId is required for report' },
          { status: 400 }
        )
      }
      
      const period = (searchParams.get('period') || 'daily') as 'hourly' | 'daily' | 'weekly' | 'monthly'
      const report = monitor.generateReport(modelId, period)
      
      return NextResponse.json({
        success: true,
        report
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to get monitoring data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get monitoring data' },
      { status: 500 }
    )
  }
}

// POST /api/ml/monitoring - Record metrics or acknowledge alerts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const monitor = getPerformanceMonitor()
    
    // Record prediction
    if (body.action === 'record_prediction') {
      const { modelId, modelVersion, prediction } = body
      
      monitor.recordPrediction(modelId, modelVersion, prediction)
      
      return NextResponse.json({ success: true })
    }
    
    // Record trade
    if (body.action === 'record_trade') {
      const { modelId, modelVersion, trade } = body
      
      monitor.recordTrade(modelId, modelVersion, trade)
      
      return NextResponse.json({ success: true })
    }
    
    // Record drift
    if (body.action === 'record_drift') {
      const { modelId, modelVersion, drift } = body
      
      monitor.recordDrift(modelId, modelVersion, drift)
      
      return NextResponse.json({ success: true })
    }
    
    // Acknowledge alert
    if (body.action === 'acknowledge_alert') {
      const { alertId, acknowledgedBy } = body
      
      const success = monitor.acknowledgeAlert(alertId, acknowledgedBy)
      
      return NextResponse.json({
        success,
        message: success ? 'Alert acknowledged' : 'Alert not found'
      })
    }
    
    // Add custom threshold
    if (body.action === 'add_threshold') {
      monitor.addAlertThreshold(body.threshold)
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to process monitoring request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
