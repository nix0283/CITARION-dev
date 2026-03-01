import { NextRequest, NextResponse } from 'next/server'
import { 
  getModelSerializer, 
  type ModelMetrics,
  type SerializedModel 
} from '@/lib/ml/production'

// GET /api/ml/models - List all models
export async function GET(request: NextRequest) {
  try {
    const serializer = getModelSerializer()
    const { searchParams } = new URL(request.url)
    
    const tag = searchParams.get('tag')
    const activeOnly = searchParams.get('active') === 'true'
    
    let models = serializer.listModels()
    
    if (tag) {
      models = serializer.getModelsByTag(tag)
    }
    
    if (activeOnly) {
      models = models.filter(m => m.isActive)
    }
    
    return NextResponse.json({
      success: true,
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        version: m.version,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        format: m.format,
        size: m.size,
        metrics: m.metrics,
        tags: m.tags,
        isActive: m.isActive
      })),
      total: models.length
    })
  } catch (error) {
    console.error('Failed to list models:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list models' },
      { status: 500 }
    )
  }
}

// POST /api/ml/models - Save a new model
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, weights, metrics, config, tags, format } = body
    
    if (!name || !weights) {
      return NextResponse.json(
        { success: false, error: 'Name and weights are required' },
        { status: 400 }
      )
    }
    
    const serializer = getModelSerializer()
    
    const model: SerializedModel = {
      metadata: {
        id: '',
        name,
        version: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        checksum: '',
        size: 0,
        format: format || 'json',
        metrics: metrics || {},
        config: config || {},
        tags: tags || [],
        isActive: false
      },
      weights
    }
    
    const saved = serializer.save(model, name, format || 'json', tags || [])
    
    return NextResponse.json({
      success: true,
      model: {
        id: saved.id,
        name: saved.name,
        version: saved.version,
        checksum: saved.checksum,
        size: saved.size,
        createdAt: saved.createdAt
      }
    })
  } catch (error) {
    console.error('Failed to save model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save model' },
      { status: 500 }
    )
  }
}

// PUT /api/ml/models - Set active model
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { modelId, action } = body
    
    if (!modelId) {
      return NextResponse.json(
        { success: false, error: 'Model ID is required' },
        { status: 400 }
      )
    }
    
    const serializer = getModelSerializer()
    
    if (action === 'activate') {
      const success = serializer.setActive(modelId)
      return NextResponse.json({
        success,
        message: success ? 'Model activated' : 'Failed to activate model'
      })
    }
    
    if (action === 'validate') {
      const result = serializer.validate(modelId)
      return NextResponse.json({
        success: result.valid,
        errors: result.errors
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to update model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update model' },
      { status: 500 }
    )
  }
}

// DELETE /api/ml/models - Delete a model
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('id')
    
    if (!modelId) {
      return NextResponse.json(
        { success: false, error: 'Model ID is required' },
        { status: 400 }
      )
    }
    
    const serializer = getModelSerializer()
    const success = serializer.delete(modelId)
    
    return NextResponse.json({
      success,
      message: success ? 'Model deleted' : 'Model not found'
    })
  } catch (error) {
    console.error('Failed to delete model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete model' },
      { status: 500 }
    )
  }
}
