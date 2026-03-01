'use client';

/**
 * Chart Pattern Panel Component
 *
 * Displays detected chart patterns with visual representation
 */

import React, { useMemo, useState } from 'react';
import {
  PatternResult,
  PatternType,
  PATTERN_DESCRIPTIONS,
  detectAllChartPatterns,
  OHLC,
} from '@/lib/indicators/chart-patterns';

interface ChartPatternPanelProps {
  data: OHLC[];
  onSelectPattern?: (pattern: PatternResult) => void;
  showPivots?: boolean;
  minConfidence?: number;
  filterDirection?: 'bullish' | 'bearish' | 'neutral' | 'all';
  filterType?: PatternType[];
}

// Color scheme for pattern directions
const DIRECTION_COLORS = {
  bullish: {
    bg: 'bg-green-500/20',
    border: 'border-green-500',
    text: 'text-green-400',
    badge: 'bg-green-500/30 text-green-300',
  },
  bearish: {
    bg: 'bg-red-500/20',
    border: 'border-red-500',
    text: 'text-red-400',
    badge: 'bg-red-500/30 text-red-300',
  },
  neutral: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/30 text-yellow-300',
  },
};

// Pattern type icons (using Unicode symbols)
const PATTERN_ICONS: Record<PatternType, string> = {
  head_and_shoulders: '↯',
  inverse_head_and_shoulders: '⤴',
  double_top: '⏺⏺',
  double_bottom: '⏹⏹',
  triple_top: '⏺⏺⏺',
  triple_bottom: '⏹⏹⏹',
  ascending_triangle: '📈',
  descending_triangle: '📉',
  symmetrical_triangle: '◈',
  rising_wedge: '⬊',
  falling_wedge: '⬈',
  bull_flag: '🚩↑',
  bear_flag: '🚩↓',
  pennant: '⚑',
  rectangle: '▭',
};

export function ChartPatternPanel({
  data,
  onSelectPattern,
  showPivots = false,
  minConfidence = 0.5,
  filterDirection = 'all',
  filterType,
}: ChartPatternPanelProps) {
  const [selectedPattern, setSelectedPattern] = useState<PatternResult | null>(null);
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  // Detect patterns
  const detectionResult = useMemo(() => {
    if (!data || data.length < 20) return null;
    return detectAllChartPatterns(data);
  }, [data]);

  // Filter patterns
  const filteredPatterns = useMemo(() => {
    if (!detectionResult) return [];

    let patterns = detectionResult.patterns;

    // Filter by confidence
    patterns = patterns.filter(p => p.confidence >= minConfidence);

    // Filter by direction
    if (filterDirection !== 'all') {
      patterns = patterns.filter(p => p.direction === filterDirection);
    }

    // Filter by type
    if (filterType && filterType.length > 0) {
      patterns = patterns.filter(p => filterType.includes(p.type));
    }

    return patterns;
  }, [detectionResult, minConfidence, filterDirection, filterType]);

  // Handle pattern selection
  const handlePatternClick = (pattern: PatternResult) => {
    setSelectedPattern(pattern);
    onSelectPattern?.(pattern);
  };

  // Toggle expanded pattern details
  const toggleExpand = (patternKey: string) => {
    setExpandedPattern(expandedPattern === patternKey ? null : patternKey);
  };

  if (!detectionResult) {
    return (
      <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <p className="text-gray-400 text-sm">
          Недостаточно данных для обнаружения паттернов (минимум 20 свечей)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Всего паттернов</div>
          <div className="text-xl font-bold text-white">{filteredPatterns.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="text-xs text-green-400 mb-1">Бычьи</div>
          <div className="text-xl font-bold text-green-400">
            {filteredPatterns.filter(p => p.direction === 'bullish').length}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="text-xs text-red-400 mb-1">Медвежьи</div>
          <div className="text-xl font-bold text-red-400">
            {filteredPatterns.filter(p => p.direction === 'bearish').length}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="text-xs text-yellow-400 mb-1">Нейтральные</div>
          <div className="text-xl font-bold text-yellow-400">
            {filteredPatterns.filter(p => p.direction === 'neutral').length}
          </div>
        </div>
      </div>

      {/* Pattern List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {filteredPatterns.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            Паттерны не обнаружены с текущими фильтрами
          </div>
        ) : (
          filteredPatterns.map((pattern, index) => {
            const colors = DIRECTION_COLORS[pattern.direction];
            const description = PATTERN_DESCRIPTIONS[pattern.type];
            const patternKey = `${pattern.type}-${index}`;
            const isExpanded = expandedPattern === patternKey;
            const isSelected = selectedPattern === pattern;

            return (
              <div
                key={patternKey}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all
                  ${colors.bg} ${colors.border}
                  ${isSelected ? 'ring-2 ring-white/50' : ''}
                  hover:brightness-110
                `}
                onClick={() => handlePatternClick(pattern)}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PATTERN_ICONS[pattern.type]}</span>
                    <div>
                      <div className={`font-medium ${colors.text}`}>
                        {description.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {description.type === 'reversal' ? 'Разворот' : 'Продолжение'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${colors.badge}`}>
                      {pattern.direction === 'bullish' ? '↑' : pattern.direction === 'bearish' ? '↓' : '◆'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(pattern.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Expandable Details */}
                <button
                  className="w-full text-left text-xs text-gray-400 mt-2 flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(patternKey);
                  }}
                >
                  <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  Детали ({pattern.points.length} точек)
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-600/50 space-y-2">
                    {/* Pattern Description */}
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {description.description}
                    </p>

                    {/* Pattern Points */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400 font-medium">Точки паттерна:</div>
                      {pattern.points.map((point, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs bg-black/20 p-1.5 rounded"
                        >
                          <span className="text-gray-400">{point.label}</span>
                          <span className="text-white font-mono">
                            {point.value.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Pattern Metrics */}
                    {pattern.rSquared && (
                      <div className="text-xs text-gray-400">
                        R²: {pattern.rSquared.toFixed(4)}
                      </div>
                    )}

                    {/* Index Range */}
                    <div className="text-xs text-gray-400">
                      Свечи: {pattern.startIndex} → {pattern.endIndex}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pivot Points (if enabled) */}
      {showPivots && detectionResult.pivots.length > 0 && (
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="text-sm font-medium text-gray-300 mb-2">
            Pivot Points ({detectionResult.pivots.length})
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-green-400">
              Highs: {detectionResult.pivots.filter(p => p.type === 'high').length}
            </div>
            <div className="text-red-400">
              Lows: {detectionResult.pivots.filter(p => p.type === 'low').length}
            </div>
          </div>
        </div>
      )}

      {/* Pattern Type Summary */}
      <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
        <div className="text-sm font-medium text-gray-300 mb-2">По типам</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries(detectionResult.byType).map(([type, patterns]) => {
            const count = (patterns as PatternResult[]).length;
            if (count === 0) return null;
            return (
              <div key={type} className="flex justify-between text-gray-400">
                <span>{PATTERN_DESCRIPTIONS[type as PatternType]?.name || type}</span>
                <span className="text-white">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ChartPatternPanel;
