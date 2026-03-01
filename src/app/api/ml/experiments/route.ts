import { NextRequest, NextResponse } from 'next/server'
import { getABTestingManager } from '@/lib/ml/production'

// GET /api/ml/experiments - List experiments
export async function GET(request: NextRequest) {
  try {
    const manager = getABTestingManager()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    
    let experiments = manager.getExperiments()
    
    if (status) {
      experiments = experiments.filter(e => e.status === status)
    }
    
    return NextResponse.json({
      success: true,
      experiments: experiments.map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        status: e.status,
        createdAt: e.createdAt,
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        trafficAllocation: e.trafficAllocation,
        control: e.control,
        treatment: e.treatment,
        results: e.results ? {
          controlSamples: e.results.controlSamples,
          treatmentSamples: e.results.treatmentSamples,
          conclusion: e.results.conclusion
        } : null
      })),
      total: experiments.length
    })
  } catch (error) {
    console.error('Failed to list experiments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list experiments' },
      { status: 500 }
    )
  }
}

// POST /api/ml/experiments - Create or control experiment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const manager = getABTestingManager()
    
    // Create new experiment
    if (body.action === 'create') {
      const { name, description, controlModelId, treatmentModelId, config } = body
      
      if (!name || !controlModelId || !treatmentModelId) {
        return NextResponse.json(
          { success: false, error: 'Name, controlModelId, and treatmentModelId are required' },
          { status: 400 }
        )
      }
      
      const experiment = manager.createExperiment(
        name,
        description || '',
        controlModelId,
        treatmentModelId,
        config || {}
      )
      
      return NextResponse.json({
        success: true,
        experiment: {
          id: experiment.id,
          name: experiment.name,
          status: experiment.status
        }
      })
    }
    
    // Start experiment
    if (body.action === 'start') {
      const success = manager.startExperiment(body.experimentId)
      return NextResponse.json({
        success,
        message: success ? 'Experiment started' : 'Failed to start experiment'
      })
    }
    
    // Pause experiment
    if (body.action === 'pause') {
      const success = manager.pauseExperiment(body.experimentId)
      return NextResponse.json({
        success,
        message: success ? 'Experiment paused' : 'Failed to pause experiment'
      })
    }
    
    // End experiment
    if (body.action === 'end') {
      const conclusion = manager.endExperiment(body.experimentId)
      return NextResponse.json({
        success: true,
        conclusion
      })
    }
    
    // Get variant assignment
    if (body.action === 'assign') {
      const { experimentId, userId, context } = body
      
      const variant = manager.getVariant(experimentId, userId, context)
      
      return NextResponse.json({
        success: true,
        variant: variant ? {
          id: variant.id,
          name: variant.name,
          modelId: variant.modelId,
          isControl: variant.isControl
        } : null
      })
    }
    
    // Record prediction
    if (body.action === 'record_prediction') {
      const { experimentId, variantId, prediction, context } = body
      
      manager.recordPrediction(experimentId, variantId, prediction, context)
      
      return NextResponse.json({ success: true })
    }
    
    // Record trade
    if (body.action === 'record_trade') {
      const { experimentId, variantId, trade, context } = body
      
      manager.recordTrade(experimentId, variantId, trade, context)
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to process experiment request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// PUT /api/ml/experiments - Get experiment details
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { experimentId } = body
    
    if (!experimentId) {
      return NextResponse.json(
        { success: false, error: 'Experiment ID is required' },
        { status: 400 }
      )
    }
    
    const manager = getABTestingManager()
    const experiment = manager.getExperiment(experimentId)
    
    if (!experiment) {
      return NextResponse.json(
        { success: false, error: 'Experiment not found' },
        { status: 404 }
      )
    }
    
    // Calculate latest results
    const results = manager.calculateResults(experimentId)
    
    return NextResponse.json({
      success: true,
      experiment: {
        ...experiment,
        results
      }
    })
  } catch (error) {
    console.error('Failed to get experiment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get experiment' },
      { status: 500 }
    )
  }
}
