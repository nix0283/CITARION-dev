/**
 * CITARION Genetic Algorithm Framework
 * 
 * Evolutionary optimization for trading bot parameters.
 */

// Types
export type {
  Gene,
  Chromosome,
  Individual,
  Population,
  SelectionMethod,
  CrossoverMethod,
  MutationMethod,
  GeneticOperatorConfig,
  FitnessContext,
  FitnessFunction,
  MultiObjectiveFitnessFunction,
  GAConfig,
  GAResult,
  BotParameterDef,
  BotOptimizationConfig,
  TerminationCriteria,
  ParetoFront,
} from './types'

// Constants
export { DEFAULT_GA_CONFIG } from './types'

// Engine
export { GeneticEngine, chromosomeToParams, calculateDiversity } from './engine'

// Utility functions
export {
  generateId,
  clamp,
  randomInRange,
  randomInt,
  gaussianRandom,
  paramsToChromosome,
} from './types'
