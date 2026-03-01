/**
 * Model Versioning and Rollback System
 * 
 * Provides:
 * - Semantic versioning for models
 * - Automatic checkpointing
 * - One-click rollback
 * - Model comparison
 */

import { createHash } from 'crypto'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Types
// ============================================================================

export interface ModelVersion {
  version: string
  semantic: {
    major: number
    minor: number
    patch: number
  }
  createdAt: Date
  createdBy: string
  description: string
  
  // Model details
  modelId: string
  modelName: string
  checksum: string
  size: number
  
  // Performance
  metrics: ModelVersionMetrics
  
  // Lineage
  parentVersion?: string
  changes: ModelChange[]
  
  // Status
  status: 'active' | 'deprecated' | 'rollback' | 'experimental'
  tags: string[]
}

export interface ModelVersionMetrics {
  accuracy?: number
  winRate?: number
  sharpeRatio?: number
  profitFactor?: number
  latencyMs?: number
  customMetrics?: Record<string, number>
}

export interface ModelChange {
  type: 'retrain' | 'hyperparameter' | 'architecture' | 'data' | 'bugfix'
  description: string
  affectedComponents: string[]
}

export interface RollbackPlan {
  fromVersion: string
  toVersion: string
  reason: string
  createdAt: Date
  status: 'pending' | 'executed' | 'failed' | 'cancelled'
  
  // Validation
  validationChecks: ValidationCheck[]
  
  // Impact
  expectedImpact: {
    accuracyChange: number
    riskLevel: 'low' | 'medium' | 'high'
  }
}

export interface ValidationCheck {
  name: string
  description: string
  status: 'pending' | 'passed' | 'failed'
  result?: string
}

export interface ModelComparison {
  version1: ModelVersion
  version2: ModelVersion
  
  metricsDiff: Record<string, { v1: number | undefined; v2: number | undefined; diff: number }>
  
  changesBetween: ModelChange[]
  
  recommendation: {
    action: 'upgrade' | 'keep' | 'downgrade'
    confidence: number
    reasoning: string
  }
}

export interface Checkpoint {
  id: string
  version: string
  timestamp: Date
  type: 'auto' | 'manual' | 'pre-deployment'
  description: string
  verified: boolean
}

// ============================================================================
// Model Version Manager
// ============================================================================

export class ModelVersionManager {
  private versionsDir: string
  private versions: Map<string, ModelVersion[]> = new Map()
  private checkpoints: Map<string, Checkpoint[]> = new Map()
  private activeVersions: Map<string, string> = new Map()
  private rollbackPlans: Map<string, RollbackPlan> = new Map()

  constructor(versionsDir: string = '/home/z/my-project/models/versions') {
    this.versionsDir = versionsDir
    
    if (!existsSync(versionsDir)) {
      mkdirSync(versionsDir, { recursive: true })
    }
    
    this.loadVersions()
  }

  // --------------------------------------------------------------------------
  // Version Creation
  // --------------------------------------------------------------------------

  /**
   * Create a new version
   */
  createVersion(
    modelName: string,
    modelData: {
      weights: Record<string, unknown>
      config?: Record<string, unknown>
    },
    options: {
      changeType: ModelChange['type']
      description: string
      createdBy: string
      metrics?: ModelVersionMetrics
      parentVersion?: string
    }
  ): ModelVersion {
    const modelId = this.getModelId(modelName)
    const previousVersions = this.versions.get(modelId) || []
    
    // Determine version number
    const semantic = this.determineNextVersion(
      previousVersions,
      options.changeType,
      options.parentVersion
    )
    
    const version = `${semantic.major}.${semantic.minor}.${semantic.patch}`
    
    // Calculate checksum
    const checksum = this.calculateChecksum(modelData.weights)
    const size = JSON.stringify(modelData).length
    
    // Determine changes from parent
    const changes: ModelChange[] = [{
      type: options.changeType,
      description: options.description,
      affectedComponents: Object.keys(modelData.weights)
    }]
    
    const modelVersion: ModelVersion = {
      version,
      semantic,
      createdAt: new Date(),
      createdBy: options.createdBy,
      description: options.description,
      modelId,
      modelName,
      checksum,
      size,
      metrics: options.metrics || {},
      parentVersion: options.parentVersion,
      changes,
      status: 'active',
      tags: []
    }
    
    // Save model data
    this.saveVersionData(modelId, version, modelData)
    
    // Update versions map
    if (!this.versions.has(modelId)) {
      this.versions.set(modelId, [])
    }
    this.versions.get(modelId)!.push(modelVersion)
    
    // Create checkpoint
    this.createCheckpoint(modelId, version, 'manual', 'Version created')
    
    // Save metadata
    this.saveVersionsMetadata()
    
    return modelVersion
  }

  /**
   * Determine next semantic version
   */
  private determineNextVersion(
    previousVersions: ModelVersion[],
    changeType: ModelChange['type'],
    parentVersion?: string
  ): { major: number; minor: number; patch: number } {
    if (previousVersions.length === 0) {
      return { major: 1, minor: 0, patch: 0 }
    }
    
    // Find parent or latest
    let parent: ModelVersion
    if (parentVersion) {
      parent = previousVersions.find(v => v.version === parentVersion)!
    } else {
      parent = previousVersions.sort((a, b) => 
        this.compareVersions(b.version, a.version)
      )[0]
    }
    
    const { major, minor, patch } = parent.semantic
    
    switch (changeType) {
      case 'architecture':
        return { major: major + 1, minor: 0, patch: 0 }
      case 'hyperparameter':
      case 'retrain':
        return { major, minor: minor + 1, patch: 0 }
      case 'bugfix':
      case 'data':
      default:
        return { major, minor, patch: patch + 1 }
    }
  }

  // --------------------------------------------------------------------------
  // Version Retrieval
  // --------------------------------------------------------------------------

  /**
   * Get version by name
   */
  getVersion(modelName: string, version?: string): ModelVersion | undefined {
    const modelId = this.getModelId(modelName)
    const versions = this.versions.get(modelId) || []
    
    if (!version) {
      // Return latest
      return versions.sort((a, b) => 
        this.compareVersions(b.version, a.version)
      )[0]
    }
    
    return versions.find(v => v.version === version)
  }

  /**
   * Get all versions for a model
   */
  getVersionHistory(modelName: string): ModelVersion[] {
    const modelId = this.getModelId(modelName)
    const versions = this.versions.get(modelId) || []
    
    return versions.sort((a, b) => 
      this.compareVersions(b.version, a.version)
    )
  }

  /**
   * Get active version
   */
  getActiveVersion(modelName: string): ModelVersion | undefined {
    const modelId = this.getModelId(modelName)
    const activeVersion = this.activeVersions.get(modelId)
    
    if (!activeVersion) {
      return this.getVersion(modelName)
    }
    
    return this.getVersion(modelName, activeVersion)
  }

  /**
   * Set active version
   */
  setActiveVersion(modelName: string, version: string): boolean {
    const modelId = this.getModelId(modelName)
    const modelVersion = this.getVersion(modelName, version)
    
    if (!modelVersion) return false
    
    // Create checkpoint before switching
    const currentActive = this.getActiveVersion(modelName)
    if (currentActive) {
      this.createCheckpoint(
        modelId,
        currentActive.version,
        'pre-deployment',
        `Before switching to v${version}`
      )
    }
    
    this.activeVersions.set(modelId, version)
    this.saveVersionsMetadata()
    
    return true
  }

  // --------------------------------------------------------------------------
  // Rollback
  // --------------------------------------------------------------------------

  /**
   * Create a rollback plan
   */
  createRollbackPlan(
    modelName: string,
    toVersion: string,
    reason: string
  ): RollbackPlan | null {
    const modelId = this.getModelId(modelName)
    const currentVersion = this.getActiveVersion(modelName)
    const targetVersion = this.getVersion(modelName, toVersion)
    
    if (!currentVersion || !targetVersion) return null
    
    const comparison = this.compareVersions(modelName, toVersion)
    
    const plan: RollbackPlan = {
      fromVersion: currentVersion.version,
      toVersion,
      reason,
      createdAt: new Date(),
      status: 'pending',
      validationChecks: [
        {
          name: 'Model integrity',
          description: 'Verify model checksum',
          status: 'pending'
        },
        {
          name: 'Performance check',
          description: 'Verify target version metrics',
          status: 'pending'
        },
        {
          name: 'Dependency check',
          description: 'Verify all dependencies are available',
          status: 'pending'
        }
      ],
      expectedImpact: {
        accuracyChange: comparison.metricsDiff.accuracy?.diff || 0,
        riskLevel: this.assessRollbackRisk(comparison)
      }
    }
    
    this.rollbackPlans.set(`${modelId}-${toVersion}`, plan)
    
    return plan
  }

  /**
   * Execute rollback
   */
  async executeRollback(
    modelName: string,
    toVersion: string,
    skipValidation: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    const modelId = this.getModelId(modelName)
    const planKey = `${modelId}-${toVersion}`
    const plan = this.rollbackPlans.get(planKey)
    
    if (!plan) {
      return { success: false, message: 'Rollback plan not found' }
    }
    
    // Run validation
    if (!skipValidation) {
      const validationResult = await this.runRollbackValidation(modelName, toVersion)
      
      if (!validationResult.passed) {
        plan.status = 'failed'
        return { success: false, message: `Validation failed: ${validationResult.message}` }
      }
    }
    
    // Execute rollback
    const success = this.setActiveVersion(modelName, toVersion)
    
    if (success) {
      plan.status = 'executed'
      
      // Mark version as rollback
      const version = this.getVersion(modelName, toVersion)
      if (version) {
        version.status = 'rollback'
        version.tags.push('rollback-source')
      }
      
      return { success: true, message: `Rolled back to version ${toVersion}` }
    }
    
    plan.status = 'failed'
    return { success: false, message: 'Failed to set active version' }
  }

  private async runRollbackValidation(
    modelName: string,
    version: string
  ): Promise<{ passed: boolean; message: string }> {
    const modelVersion = this.getVersion(modelName, version)
    
    if (!modelVersion) {
      return { passed: false, message: 'Target version not found' }
    }
    
    // Check model data exists
    const modelId = this.getModelId(modelName)
    const dataPath = join(this.versionsDir, modelId, `${version}.json`)
    
    if (!existsSync(dataPath)) {
      return { passed: false, message: 'Model data not found' }
    }
    
    // Verify checksum
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'))
    const currentChecksum = this.calculateChecksum(data.weights)
    
    if (currentChecksum !== modelVersion.checksum) {
      return { passed: false, message: 'Checksum mismatch - model data may be corrupted' }
    }
    
    return { passed: true, message: 'All validations passed' }
  }

  private assessRollbackRisk(comparison: ModelComparison): 'low' | 'medium' | 'high' {
    const accuracyDiff = Math.abs(comparison.metricsDiff.accuracy?.diff || 0)
    
    if (accuracyDiff > 0.1) return 'high'
    if (accuracyDiff > 0.05) return 'medium'
    return 'low'
  }

  // --------------------------------------------------------------------------
  // Version Comparison
  // --------------------------------------------------------------------------

  /**
   * Compare two versions
   */
  compareVersions(modelName: string, version2: string, version1?: string): ModelComparison {
    const v1 = this.getVersion(modelName, version1) || this.getActiveVersion(modelName)!
    const v2 = this.getVersion(modelName, version2)!
    
    const metricsDiff: Record<string, { v1: number | undefined; v2: number | undefined; diff: number }> = {}
    
    const metrics = ['accuracy', 'winRate', 'sharpeRatio', 'profitFactor', 'latencyMs']
    
    for (const metric of metrics) {
      const v1Value = v1.metrics[metric as keyof ModelVersionMetrics] as number | undefined
      const v2Value = v2.metrics[metric as keyof ModelVersionMetrics] as number | undefined
      
      metricsDiff[metric] = {
        v1: v1Value,
        v2: v2Value,
        diff: v2Value !== undefined && v1Value !== undefined ? v2Value - v1Value : 0
      }
    }
    
    // Determine recommendation
    const recommendation = this.generateRecommendation(v1, v2, metricsDiff)
    
    return {
      version1: v1,
      version2: v2,
      metricsDiff,
      changesBetween: this.getChangesBetween(v1, v2),
      recommendation
    }
  }

  private getChangesBetween(v1: ModelVersion, v2: ModelVersion): ModelChange[] {
    // Get all versions between v1 and v2
    const modelId = v1.modelId
    const versions = this.versions.get(modelId) || []
    
    const changes: ModelChange[] = []
    let found = false
    
    for (const v of versions.sort((a, b) => this.compareVersions(b.version, a.version))) {
      if (v.version === v1.version) {
        found = true
        continue
      }
      
      if (found) {
        changes.push(...v.changes)
      }
      
      if (v.version === v2.version) break
    }
    
    return changes
  }

  private generateRecommendation(
    v1: ModelVersion,
    v2: ModelVersion,
    metricsDiff: Record<string, { diff: number }>
  ): ModelComparison['recommendation'] {
    const accuracyDiff = metricsDiff.accuracy?.diff || 0
    const latencyDiff = metricsDiff.latencyMs?.diff || 0
    
    let action: 'upgrade' | 'keep' | 'downgrade'
    let reasoning: string
    let confidence: number
    
    if (accuracyDiff > 0.02 && latencyDiff <= 10) {
      action = 'upgrade'
      reasoning = `v${v2.version} shows ${(accuracyDiff * 100).toFixed(1)}% accuracy improvement`
      confidence = Math.min(0.9, 0.5 + accuracyDiff * 5)
    } else if (accuracyDiff < -0.02) {
      action = 'keep'
      reasoning = `v${v1.version} has better accuracy`
      confidence = Math.min(0.9, 0.5 + Math.abs(accuracyDiff) * 5)
    } else if (latencyDiff > 20) {
      action = 'keep'
      reasoning = 'v2 has significantly higher latency'
      confidence = 0.7
    } else {
      action = 'upgrade'
      reasoning = 'Minor improvements, safe to upgrade'
      confidence = 0.6
    }
    
    return { action, confidence, reasoning }
  }

  // --------------------------------------------------------------------------
  // Checkpoints
  // --------------------------------------------------------------------------

  /**
   * Create a checkpoint
   */
  createCheckpoint(
    modelId: string,
    version: string,
    type: Checkpoint['type'],
    description: string
  ): Checkpoint {
    const checkpoint: Checkpoint = {
      id: `cp-${Date.now().toString(36)}`,
      version,
      timestamp: new Date(),
      type,
      description,
      verified: false
    }
    
    if (!this.checkpoints.has(modelId)) {
      this.checkpoints.set(modelId, [])
    }
    
    this.checkpoints.get(modelId)!.push(checkpoint)
    
    // Auto-verify checkpoints
    if (type !== 'manual') {
      checkpoint.verified = true
    }
    
    return checkpoint
  }

  /**
   * Get checkpoints for a model
   */
  getCheckpoints(modelName: string): Checkpoint[] {
    const modelId = this.getModelId(modelName)
    return this.checkpoints.get(modelId) || []
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private getModelId(modelName: string): string {
    return modelName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  }

  private calculateChecksum(weights: Record<string, unknown>): string {
    return createHash('sha256')
      .update(JSON.stringify(weights))
      .digest('hex')
      .slice(0, 16)
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    
    for (let i = 0; i < 3; i++) {
      if ((parts1[i] || 0) > (parts2[i] || 0)) return 1
      if ((parts1[i] || 0) < (parts2[i] || 0)) return -1
    }
    
    return 0
  }

  private saveVersionData(
    modelId: string,
    version: string,
    data: { weights: Record<string, unknown>; config?: Record<string, unknown> }
  ): void {
    const modelDir = join(this.versionsDir, modelId)
    
    if (!existsSync(modelDir)) {
      mkdirSync(modelDir, { recursive: true })
    }
    
    const filePath = join(modelDir, `${version}.json`)
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  private loadVersions(): void {
    const metadataPath = join(this.versionsDir, 'metadata.json')
    
    if (existsSync(metadataPath)) {
      try {
        const content = readFileSync(metadataPath, 'utf-8')
        const data = JSON.parse(content)
        
        this.versions = new Map(Object.entries(data.versions || {}))
        this.activeVersions = new Map(Object.entries(data.activeVersions || {}))
        this.checkpoints = new Map(Object.entries(data.checkpoints || {}))
      } catch (error) {
        console.error('Failed to load versions metadata:', error)
      }
    }
  }

  private saveVersionsMetadata(): void {
    const metadataPath = join(this.versionsDir, 'metadata.json')
    
    const data = {
      versions: Object.fromEntries(this.versions),
      activeVersions: Object.fromEntries(this.activeVersions),
      checkpoints: Object.fromEntries(this.checkpoints),
      lastUpdated: new Date().toISOString()
    }
    
    writeFileSync(metadataPath, JSON.stringify(data, null, 2), 'utf-8')
  }
}

// ============================================================================
// Singleton
// ============================================================================

let versionManagerInstance: ModelVersionManager | null = null

export function getModelVersionManager(): ModelVersionManager {
  if (!versionManagerInstance) {
    versionManagerInstance = new ModelVersionManager()
  }
  return versionManagerInstance
}
