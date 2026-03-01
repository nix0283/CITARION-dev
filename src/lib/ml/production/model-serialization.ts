/**
 * Model Serialization and Persistence
 * 
 * Handles saving, loading, and versioning of ML models
 * for production deployment.
 */

import { createHash } from 'crypto'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Types
// ============================================================================

export interface ModelMetadata {
  id: string
  name: string
  version: string
  createdAt: Date
  updatedAt: Date
  checksum: string
  size: number
  format: ModelFormat
  metrics: ModelMetrics
  config: Record<string, unknown>
  tags: string[]
  isActive: boolean
  parentModelId?: string
}

export type ModelFormat = 'json' | 'binary' | 'onnx' | 'tensorflow'

export interface ModelMetrics {
  accuracy?: number
  precision?: number
  recall?: number
  f1Score?: number
  sharpeRatio?: number
  winRate?: number
  profitFactor?: number
  maxDrawdown?: number
  customMetrics?: Record<string, number>
}

export interface SerializedModel {
  metadata: ModelMetadata
  weights: Record<string, unknown>
  architecture?: Record<string, unknown>
  preprocessing?: Record<string, unknown>
}

export interface ModelVersion {
  version: string
  timestamp: Date
  changes: string[]
  metrics: ModelMetrics
}

export interface ModelRegistry {
  models: Map<string, ModelMetadata>
  activeModel: string | null
  versions: Map<string, ModelVersion[]>
}

// ============================================================================
// Model Serializer Class
// ============================================================================

export class ModelSerializer {
  private modelsDir: string
  private registry: ModelRegistry

  constructor(modelsDir: string = '/home/z/my-project/models') {
    this.modelsDir = modelsDir
    this.registry = {
      models: new Map(),
      activeModel: null,
      versions: new Map()
    }
    
    // Ensure directory exists
    if (!existsSync(modelsDir)) {
      mkdirSync(modelsDir, { recursive: true })
    }
    
    this.loadRegistry()
  }

  // --------------------------------------------------------------------------
  // Save Operations
  // --------------------------------------------------------------------------

  /**
   * Save a model with full metadata
   */
  save(
    model: SerializedModel,
    name: string,
    format: ModelFormat = 'json',
    tags: string[] = []
  ): ModelMetadata {
    const id = this.generateModelId(name)
    const version = this.generateVersion()
    const checksum = this.calculateChecksum(model.weights)
    
    const metadata: ModelMetadata = {
      id,
      name,
      version,
      createdAt: new Date(),
      updatedAt: new Date(),
      checksum,
      size: this.calculateSize(model),
      format,
      metrics: model.metadata.metrics,
      config: model.metadata.config,
      tags,
      isActive: false
    }

    // Save model file
    const filename = this.getFilename(id, version, format)
    const filepath = join(this.modelsDir, filename)
    
    const content = format === 'json' 
      ? JSON.stringify(model, null, 2)
      : this.serializeBinary(model)
    
    writeFileSync(filepath, content, 'utf-8')

    // Update registry
    this.registry.models.set(id, metadata)
    this.addVersion(id, version, metadata.metrics)
    this.saveRegistry()

    return metadata
  }

  /**
   * Update existing model
   */
  update(
    modelId: string,
    updates: Partial<SerializedModel>,
    changes: string[] = []
  ): ModelMetadata | null {
    const existing = this.registry.models.get(modelId)
    if (!existing) return null

    const newVersion = this.generateVersion()
    const checksum = updates.weights 
      ? this.calculateChecksum(updates.weights)
      : existing.checksum

    const metadata: ModelMetadata = {
      ...existing,
      version: newVersion,
      updatedAt: new Date(),
      checksum,
      changes,
      metrics: updates.metadata?.metrics || existing.metrics,
      config: updates.metadata?.config || existing.config,
      parentModelId: modelId
    }

    // Save updated model
    const filename = this.getFilename(modelId, newVersion, existing.format)
    const filepath = join(this.modelsDir, filename)
    
    const model: SerializedModel = {
      metadata,
      weights: updates.weights || {},
      architecture: updates.architecture,
      preprocessing: updates.preprocessing
    }
    
    writeFileSync(filepath, JSON.stringify(model, null, 2), 'utf-8')

    this.registry.models.set(modelId, metadata)
    this.addVersion(modelId, newVersion, metadata.metrics, changes)
    this.saveRegistry()

    return metadata
  }

  // --------------------------------------------------------------------------
  // Load Operations
  // --------------------------------------------------------------------------

  /**
   * Load a model by ID
   */
  load(modelId: string): SerializedModel | null {
    const metadata = this.registry.models.get(modelId)
    if (!metadata) return null

    return this.loadVersion(modelId, metadata.version)
  }

  /**
   * Load a specific version of a model
   */
  loadVersion(modelId: string, version: string): SerializedModel | null {
    const metadata = this.registry.models.get(modelId)
    if (!metadata) return null

    const filename = this.getFilename(modelId, version, metadata.format)
    const filepath = join(this.modelsDir, filename)

    if (!existsSync(filepath)) return null

    try {
      const content = readFileSync(filepath, 'utf-8')
      
      if (metadata.format === 'json') {
        return JSON.parse(content) as SerializedModel
      } else {
        return this.deserializeBinary(content)
      }
    } catch (error) {
      console.error(`Failed to load model ${modelId}@${version}:`, error)
      return null
    }
  }

  /**
   * Load the active model
   */
  loadActive(): SerializedModel | null {
    if (!this.registry.activeModel) return null
    return this.load(this.registry.activeModel)
  }

  /**
   * Load model by name (returns latest version)
   */
  loadByName(name: string): SerializedModel | null {
    for (const [id, metadata] of this.registry.models) {
      if (metadata.name === name) {
        return this.load(id)
      }
    }
    return null
  }

  // --------------------------------------------------------------------------
  // Model Management
  // --------------------------------------------------------------------------

  /**
   * Set a model as active
   */
  setActive(modelId: string): boolean {
    const metadata = this.registry.models.get(modelId)
    if (!metadata) return false

    // Deactivate previous active model
    if (this.registry.activeModel) {
      const prev = this.registry.models.get(this.registry.activeModel)
      if (prev) {
        prev.isActive = false
      }
    }

    metadata.isActive = true
    this.registry.activeModel = modelId
    this.saveRegistry()

    return true
  }

  /**
   * Get all models
   */
  listModels(): ModelMetadata[] {
    return Array.from(this.registry.models.values())
  }

  /**
   * Get models by tag
   */
  getModelsByTag(tag: string): ModelMetadata[] {
    return this.listModels().filter(m => m.tags.includes(tag))
  }

  /**
   * Get model versions
   */
  getVersions(modelId: string): ModelVersion[] {
    return this.registry.versions.get(modelId) || []
  }

  /**
   * Delete a model
   */
  delete(modelId: string): boolean {
    const metadata = this.registry.models.get(modelId)
    if (!metadata) return false

    // Delete model files
    const versions = this.registry.versions.get(modelId) || []
    for (const version of versions) {
      const filename = this.getFilename(modelId, version.version, metadata.format)
      const filepath = join(this.modelsDir, filename)
      if (existsSync(filepath)) {
        unlinkSync(filepath)
      }
    }

    this.registry.models.delete(modelId)
    this.registry.versions.delete(modelId)
    
    if (this.registry.activeModel === modelId) {
      this.registry.activeModel = null
    }
    
    this.saveRegistry()
    return true
  }

  /**
   * Clean up old versions, keeping only N most recent
   */
  cleanupOldVersions(modelId: string, keepCount: number = 5): number {
    const versions = this.registry.versions.get(modelId) || []
    if (versions.length <= keepCount) return 0

    const metadata = this.registry.models.get(modelId)
    if (!metadata) return 0

    // Sort by timestamp, newest first
    const sorted = [...versions].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    )

    let deleted = 0
    for (let i = keepCount; i < sorted.length; i++) {
      const filename = this.getFilename(modelId, sorted[i].version, metadata.format)
      const filepath = join(this.modelsDir, filename)
      if (existsSync(filepath)) {
        unlinkSync(filepath)
        deleted++
      }
    }

    // Update versions
    this.registry.versions.set(modelId, sorted.slice(0, keepCount))
    this.saveRegistry()

    return deleted
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  /**
   * Validate model integrity
   */
  validate(modelId: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const metadata = this.registry.models.get(modelId)
    
    if (!metadata) {
      return { valid: false, errors: ['Model not found'] }
    }

    // Check file exists
    const filename = this.getFilename(modelId, metadata.version, metadata.format)
    const filepath = join(this.modelsDir, filename)
    
    if (!existsSync(filepath)) {
      errors.push('Model file not found')
    }

    // Verify checksum
    const model = this.load(modelId)
    if (model) {
      const currentChecksum = this.calculateChecksum(model.weights)
      if (currentChecksum !== metadata.checksum) {
        errors.push('Checksum mismatch - model may be corrupted')
      }
    }

    // Validate metrics
    if (metadata.metrics.accuracy !== undefined && 
        (metadata.metrics.accuracy < 0 || metadata.metrics.accuracy > 1)) {
      errors.push('Invalid accuracy metric')
    }

    return { valid: errors.length === 0, errors }
  }

  // --------------------------------------------------------------------------
  // Export/Import
  // --------------------------------------------------------------------------

  /**
   * Export model for deployment
   */
  exportForDeployment(modelId: string): {
    model: SerializedModel
    deploymentConfig: {
      version: string
      checksum: string
      createdAt: Date
      environment: string
    }
  } | null {
    const model = this.load(modelId)
    if (!model) return null

    const metadata = this.registry.models.get(modelId)!
    
    return {
      model,
      deploymentConfig: {
        version: metadata.version,
        checksum: metadata.checksum,
        createdAt: metadata.updatedAt,
        environment: 'production'
      }
    }
  }

  /**
   * Import model from external source
   */
  import(
    exported: { model: SerializedModel; deploymentConfig: { version: string; checksum: string } },
    name: string,
    tags: string[] = ['imported']
  ): ModelMetadata {
    // Verify checksum
    const currentChecksum = this.calculateChecksum(exported.model.weights)
    if (currentChecksum !== exported.deploymentConfig.checksum) {
      throw new Error('Model checksum mismatch during import')
    }

    return this.save(exported.model, name, 'json', tags)
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private generateModelId(name: string): string {
    const timestamp = Date.now().toString(36)
    const hash = createHash('md5').update(name).digest('hex').slice(0, 8)
    return `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}-${hash}`
  }

  private generateVersion(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 6)
    return `v${timestamp}-${random}`
  }

  private calculateChecksum(weights: Record<string, unknown>): string {
    return createHash('sha256')
      .update(JSON.stringify(weights))
      .digest('hex')
      .slice(0, 16)
  }

  private calculateSize(model: SerializedModel): number {
    return JSON.stringify(model).length
  }

  private getFilename(id: string, version: string, format: ModelFormat): string {
    return `${id}-${version}.${format}`
  }

  private serializeBinary(model: SerializedModel): string {
    // Simplified binary serialization
    return Buffer.from(JSON.stringify(model)).toString('base64')
  }

  private deserializeBinary(content: string): SerializedModel {
    return JSON.parse(Buffer.from(content, 'base64').toString('utf-8'))
  }

  private addVersion(
    modelId: string, 
    version: string, 
    metrics: ModelMetrics,
    changes: string[] = []
  ): void {
    if (!this.registry.versions.has(modelId)) {
      this.registry.versions.set(modelId, [])
    }
    
    this.registry.versions.get(modelId)!.push({
      version,
      timestamp: new Date(),
      changes,
      metrics
    })
  }

  private loadRegistry(): void {
    const registryPath = join(this.modelsDir, 'registry.json')
    
    if (existsSync(registryPath)) {
      try {
        const content = readFileSync(registryPath, 'utf-8')
        const data = JSON.parse(content)
        
        this.registry.models = new Map(Object.entries(data.models || {}))
        this.registry.activeModel = data.activeModel || null
        this.registry.versions = new Map(Object.entries(data.versions || {}))
      } catch (error) {
        console.error('Failed to load model registry:', error)
      }
    }
  }

  private saveRegistry(): void {
    const registryPath = join(this.modelsDir, 'registry.json')
    
    const data = {
      models: Object.fromEntries(this.registry.models),
      activeModel: this.registry.activeModel,
      versions: Object.fromEntries(this.registry.versions),
      lastUpdated: new Date().toISOString()
    }
    
    writeFileSync(registryPath, JSON.stringify(data, null, 2), 'utf-8')
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serializerInstance: ModelSerializer | null = null

export function getModelSerializer(): ModelSerializer {
  if (!serializerInstance) {
    serializerInstance = new ModelSerializer()
  }
  return serializerInstance
}

// ============================================================================
// Quick Functions
// ============================================================================

export function saveModel(
  weights: Record<string, unknown>,
  name: string,
  metrics: ModelMetrics = {},
  config: Record<string, unknown> = {}
): ModelMetadata {
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
      format: 'json',
      metrics,
      config,
      tags: [],
      isActive: false
    },
    weights
  }
  
  return serializer.save(model, name)
}

export function loadModel(nameOrId: string): SerializedModel | null {
  const serializer = getModelSerializer()
  
  // Try by ID first
  let model = serializer.load(nameOrId)
  if (model) return model
  
  // Try by name
  return serializer.loadByName(nameOrId)
}

export function getActiveModel(): SerializedModel | null {
  return getModelSerializer().loadActive()
}
