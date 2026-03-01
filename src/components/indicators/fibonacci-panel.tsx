'use client';

/**
 * Fibonacci Panel Component
 *
 * Displays Fibonacci retracement levels with visual representation
 */

import React, { useMemo, useState } from 'react';
import {
  FibonacciRetracement,
  FibonacciLevel,
  FibonacciSignal,
  FibonacciZone,
  analyzeFibonacci,
  OHLC,
} from '@/lib/indicators/fibonacci';

interface FibonacciPanelProps {
  data: OHLC[];
  showZones?: boolean;
  showSignals?: boolean;
  showDrawdowns?: boolean;
  config?: {
    swingThreshold?: number;
    drawdownCriteria?: number;
    lookback?: number;
  };
  onLevelClick?: (level: FibonacciLevel) => void;
}

// Color scheme for Fibonacci levels
const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '0': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  '0.236': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500' },
  '0.382': { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500' },
  '0.5': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
  '0.618': { bg: 'bg-amber-500/30', text: 'text-amber-300', border: 'border-amber-400' }, // Golden ratio
  '0.786': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  '1': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
};

const EXTENSION_COLORS = {
  bg: 'bg-cyan-500/20',
  text: 'text-cyan-400',
  border: 'border-cyan-500',
};

const STRENGTH_BADGES = {
  weak: 'bg-gray-500/30 text-gray-400',
  moderate: 'bg-blue-500/30 text-blue-400',
  strong: 'bg-green-500/30 text-green-400',
  very_strong: 'bg-amber-500/30 text-amber-300',
};

export function FibonacciPanel({
  data,
  showZones = true,
  showSignals = true,
  showDrawdowns = false,
  config,
  onLevelClick,
}: FibonacciPanelProps) {
  const [selectedLevel, setSelectedLevel] = useState<FibonacciLevel | null>(null);
  const [activeTab, setActiveTab] = useState<'levels' | 'signals' | 'zones'>('levels');

  // Perform Fibonacci analysis
  const analysis = useMemo(() => {
    if (!data || data.length < 20) return null;
    return analyzeFibonacci(data, config);
  }, [data, config]);

  // Get current price
  const currentPrice = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[data.length - 1].close;
  }, [data]);

  // Handle level click
  const handleLevelClick = (level: FibonacciLevel) => {
    setSelectedLevel(level);
    onLevelClick?.(level);
  };

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  if (!analysis) {
    return (
      <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <p className="text-gray-400 text-sm">
          Недостаточно данных для анализа Фибоначчи (минимум 20 свечей)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Fibonacci Analysis</h3>
          <span
            className={`px-2 py-1 rounded text-sm font-medium ${
              analysis.summary.trend === 'bullish'
                ? 'bg-green-500/20 text-green-400'
                : analysis.summary.trend === 'bearish'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {analysis.summary.trend === 'bullish' ? '↑ Бычий' : analysis.summary.trend === 'bearish' ? '↓ Медвежий' : '◆ Нейтральный'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Текущий уровень:</span>
            <span className="ml-2 text-white font-medium">{analysis.summary.currentLevel}</span>
          </div>
          <div>
            <span className="text-gray-400">Сигналы:</span>
            <span className="ml-2 text-white font-medium">{analysis.summary.signalCount}</span>
          </div>
          {analysis.summary.nearestSupport && (
            <div>
              <span className="text-gray-400">Ближайшая поддержка:</span>
              <span className="ml-2 text-green-400 font-medium">
                {formatPrice(analysis.summary.nearestSupport)}
              </span>
            </div>
          )}
          {analysis.summary.nearestResistance && (
            <div>
              <span className="text-gray-400">Ближайшее сопротивление:</span>
              <span className="ml-2 text-red-400 font-medium">
                {formatPrice(analysis.summary.nearestResistance)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['levels', 'signals', 'zones'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            {tab === 'levels' && 'Уровни'}
            {tab === 'signals' && 'Сигналы'}
            {tab === 'zones' && 'Зоны'}
          </button>
        ))}
      </div>

      {/* Levels Tab */}
      {activeTab === 'levels' && analysis.retracement && (
        <div className="space-y-2">
          {/* Price Range */}
          <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700">
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-gray-400">High: </span>
                <span className="text-green-400">{formatPrice(analysis.retracement.priceRange.high)}</span>
              </div>
              <div>
                <span className="text-gray-400">Low: </span>
                <span className="text-red-400">{formatPrice(analysis.retracement.priceRange.low)}</span>
              </div>
              <div>
                <span className="text-gray-400">Range: </span>
                <span className="text-white">{formatPrice(analysis.retracement.priceRange.range)}</span>
              </div>
            </div>
          </div>

          {/* Fibonacci Levels */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {analysis.retracement.levels.map((level, index) => {
              const colors = level.type === 'retracement'
                ? LEVEL_COLORS[level.level.toString()] || { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500' }
                : EXTENSION_COLORS;

              const isSelected = selectedLevel === level;
              const isGolden = level.level === 0.618;
              const distanceFromPrice = currentPrice
                ? ((level.value - currentPrice) / currentPrice * 100).toFixed(2)
                : null;

              return (
                <div
                  key={index}
                  className={`
                    p-2.5 rounded-lg border cursor-pointer transition-all
                    ${colors.bg} ${colors.border}
                    ${isSelected ? 'ring-2 ring-white/50' : ''}
                    ${isGolden ? 'ring-1 ring-amber-400/50' : ''}
                    hover:brightness-110
                  `}
                  onClick={() => handleLevelClick(level)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${colors.text}`}>
                        {level.name}
                      </span>
                      {isGolden && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300">
                          Golden
                        </span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${STRENGTH_BADGES[level.strength]}`}>
                        {level.strength === 'very_strong' ? 'очень сильный' :
                         level.strength === 'strong' ? 'сильный' :
                         level.strength === 'moderate' ? 'умеренный' : 'слабый'}
                      </span>
                    </div>
                    <span className="text-white font-mono">
                      {formatPrice(level.value)}
                    </span>
                  </div>

                  {distanceFromPrice && (
                    <div className="mt-1 flex justify-between text-xs">
                      <span className="text-gray-400">
                        {level.type === 'retracement' ? 'Retracement' : 'Extension'}
                      </span>
                      <span className={parseFloat(distanceFromPrice) >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {parseFloat(distanceFromPrice) >= 0 ? '+' : ''}{distanceFromPrice}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Golden Ratio Highlight */}
          {analysis.retracement.goldenRatio && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2">
                <span className="text-amber-300 text-lg">★</span>
                <div>
                  <div className="text-amber-300 font-medium">Golden Ratio (61.8%)</div>
                  <div className="text-sm text-amber-400/80">
                    {formatPrice(analysis.retracement.goldenRatio)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Signals Tab */}
      {activeTab === 'signals' && (
        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {analysis.signals.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              Нет активных сигналов Фибоначчи
            </div>
          ) : (
            analysis.signals.map((signal, index) => (
              <div
                key={index}
                className={`
                  p-3 rounded-lg border
                  ${signal.type === 'support' ? 'bg-green-500/10 border-green-500/30' : ''}
                  ${signal.type === 'resistance' ? 'bg-red-500/10 border-red-500/30' : ''}
                  ${signal.type === 'golden_cross' ? 'bg-amber-500/20 border-amber-500/50' : ''}
                  ${signal.type === 'extension_target' ? 'bg-cyan-500/10 border-cyan-500/30' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{signal.description}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {signal.type === 'support' && 'Уровень поддержки'}
                      {signal.type === 'resistance' && 'Уровень сопротивления'}
                      {signal.type === 'golden_cross' && 'Зона золотого сечения'}
                      {signal.type === 'extension_target' && 'Цель расширения'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-mono">{formatPrice(signal.price)}</div>
                    <div className={`text-xs ${
                      signal.distancePercent <= 0.005 ? 'text-amber-400' : 'text-gray-400'
                    }`}>
                      {(signal.distancePercent * 100).toFixed(2)}% от цены
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Zones Tab */}
      {activeTab === 'zones' && (
        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {analysis.zones.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              Нет зон Фибоначчи
            </div>
          ) : (
            analysis.zones.map((zone, index) => (
              <div
                key={index}
                className={`
                  p-3 rounded-lg border border-gray-700
                  ${zone.priceInZone ? 'bg-blue-500/20 ring-1 ring-blue-500' : 'bg-gray-800/30'}
                `}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-medium">{zone.zoneName}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Ширина: {formatPrice(zone.zoneWidth)}
                    </div>
                  </div>
                  {zone.priceInZone && (
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/30 text-blue-300">
                      Цена в зоне
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Drawdowns (if enabled) */}
      {showDrawdowns && analysis.drawdowns.length > 0 && (
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="text-sm font-medium text-gray-300 mb-2">
            Drawdown Periods ({analysis.drawdowns.length})
          </div>
          <div className="space-y-1 text-xs">
            {analysis.drawdowns.slice(0, 3).map((dd, i) => (
              <div key={i} className="flex justify-between text-gray-400">
                <span>{(dd.drawdownPercent * 100).toFixed(1)}%</span>
                <span>{dd.recovered ? '✓ Recovered' : '⏳ Active'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Price */}
      {currentPrice && (
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Текущая цена:</span>
            <span className="text-white font-mono text-lg">{formatPrice(currentPrice)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default FibonacciPanel;
