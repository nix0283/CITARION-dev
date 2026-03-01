'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CANDLESTICK_PATTERNS,
  scanPatterns,
  getPatternStatistics,
  filterByType,
  type OHLCVCandle,
  type PatternResult,
  type PatternSignal,
  generateSignal,
} from '@/lib/indicators/candlestick-patterns';

interface CandlestickPatternPanelProps {
  candles: OHLCVCandle[];
  onPatternSelect?: (pattern: PatternResult) => void;
  maxHeight?: number;
}

const PATTERN_TYPE_COLORS = {
  bullish: 'bg-green-500/20 text-green-400 border-green-500/30',
  bearish: 'bg-red-500/20 text-red-400 border-red-500/30',
  neutral: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const RELIABILITY_COLORS = {
  high: 'bg-emerald-500/30 text-emerald-300',
  medium: 'bg-amber-500/30 text-amber-300',
  low: 'bg-slate-500/30 text-slate-300',
};

export function CandlestickPatternPanel({
  candles,
  onPatternSelect,
  maxHeight = 400,
}: CandlestickPatternPanelProps) {
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish'>('all');
  const [selectedPattern, setSelectedPattern] = useState<PatternResult | null>(null);

  // Scan candles for patterns
  const patterns = useMemo(() => {
    if (!candles || candles.length < 3) return [];
    return scanPatterns(candles);
  }, [candles]);

  // Get statistics
  const stats = useMemo(() => getPatternStatistics(patterns), [patterns]);

  // Filter patterns
  const filteredPatterns = useMemo(() => {
    if (filter === 'all') return patterns;
    return filterByType(patterns, filter);
  }, [patterns, filter]);

  // Get latest signals
  const latestSignals = useMemo(() => {
    const recent = patterns.slice(-5);
    return recent.map(generateSignal);
  }, [patterns]);

  const handlePatternClick = (pattern: PatternResult) => {
    setSelectedPattern(pattern);
    onPatternSelect?.(pattern);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (!candles || candles.length < 3) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Свечные паттерны</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">Недостаточно данных для анализа (минимум 3 свечи)</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">Свечные паттерны</CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'ghost'}
              onClick={() => setFilter('all')}
              className="h-6 px-2 text-xs"
            >
              Все ({patterns.length})
            </Button>
            <Button
              size="sm"
              variant={filter === 'bullish' ? 'default' : 'ghost'}
              onClick={() => setFilter('bullish')}
              className="h-6 px-2 text-xs text-green-400"
            >
              📈 {stats.BLLHRM + (stats.GRNHM || 0) + (stats.RDHM || 0) + (stats.BLLKCK || 0) + (stats.MRNSTR || 0)}
            </Button>
            <Button
              size="sm"
              variant={filter === 'bearish' ? 'default' : 'ghost'}
              onClick={() => setFilter('bearish')}
              className="h-6 px-2 text-xs text-red-400"
            >
              📉 {(stats.BERHRM || 0) + (stats.BERKCK || 0) + (stats.EVNSTR || 0) + (stats.GRNSSTR || 0) + (stats.RDSSTR || 0)}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Statistics */}
        <div className="grid grid-cols-5 gap-2 mb-4 text-center">
          {Object.entries(stats).slice(0, 5).map(([code, count]) => {
            const pattern = CANDLESTICK_PATTERNS[code];
            if (!pattern) return null;
            return (
              <div
                key={code}
                className="bg-slate-800 rounded p-2 cursor-pointer hover:bg-slate-700 transition-colors"
                title={pattern.description}
              >
                <div className={`text-xs font-medium ${pattern.type === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                  {count}
                </div>
                <div className="text-xs text-slate-400 truncate">{code}</div>
              </div>
            );
          })}
        </div>

        {/* Latest Patterns */}
        <div className="mb-4">
          <h4 className="text-xs text-slate-400 mb-2">Последние обнаруженные:</h4>
          <ScrollArea style={{ height: maxHeight }}>
            <div className="space-y-2">
              {filteredPatterns.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  Паттерны не обнаружены
                </p>
              ) : (
                filteredPatterns.map((result, index) => {
                  const { pattern, timestamp, price, confidence } = result;
                  const signal = generateSignal(result);
                  
                  return (
                    <div
                      key={`${timestamp}-${index}`}
                      className={`
                        p-2 rounded border cursor-pointer transition-colors
                        ${selectedPattern === result ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800/50'}
                        hover:border-slate-500
                      `}
                      onClick={() => handlePatternClick(result)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge className={PATTERN_TYPE_COLORS[pattern.type]}>
                            {pattern.type === 'bullish' ? '📈' : '📉'}
                          </Badge>
                          <span className="text-white text-sm font-medium">{pattern.name}</span>
                        </div>
                        <Badge className={RELIABILITY_COLORS[pattern.reliability]}>
                          {pattern.reliability}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{formatTime(timestamp)}</span>
                        <span>Цена: {price.toFixed(2)}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {pattern.description.slice(0, 60)}...
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Selected Pattern Details */}
        {selectedPattern && (
          <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-600">
            <h4 className="text-white font-medium mb-2">
              {selectedPattern.pattern.name}
              <Badge className={`ml-2 ${PATTERN_TYPE_COLORS[selectedPattern.pattern.type]}`}>
                {selectedPattern.pattern.type}
              </Badge>
            </h4>
            <p className="text-slate-300 text-sm mb-2">
              {selectedPattern.pattern.description}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Надёжность:</span>{' '}
                <Badge className={RELIABILITY_COLORS[selectedPattern.pattern.reliability]}>
                  {selectedPattern.pattern.reliability}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400">Уверенность:</span>{' '}
                <span className="text-white">{(selectedPattern.confidence * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-slate-400">Свечей:</span>{' '}
                <span className="text-white">{selectedPattern.pattern.candlesRequired}</span>
              </div>
              <div>
                <span className="text-slate-400">Цена:</span>{' '}
                <span className="text-white">{selectedPattern.price.toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Signal Summary */}
        {latestSignals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <h4 className="text-xs text-slate-400 mb-2">Сигналы:</h4>
            <div className="flex gap-2">
              {latestSignals.slice(-3).map((signal, i) => (
                <Badge
                  key={i}
                  className={`
                    ${signal.type === 'buy' ? 'bg-green-500/20 text-green-400' : ''}
                    ${signal.type === 'sell' ? 'bg-red-500/20 text-red-400' : ''}
                    ${signal.type === 'hold' ? 'bg-slate-500/20 text-slate-400' : ''}
                  `}
                >
                  {signal.type.toUpperCase()} ({signal.strength})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CandlestickPatternPanel;
