/**
 * Built-in Indicators Library
 * 
 * Pre-configured indicators for CITARION platform
 * Categories: moving_average, oscillator, volatility, volume, trend, pivot, fibonacci
 */

export interface BuiltInIndicator {
  id: string;
  name: string;
  category: string;
  description: string;
  pineCode: string;
  inputSchema: Array<{
    name: string;
    type: 'int' | 'float' | 'string' | 'bool';
    default: number | string | boolean;
    min?: number;
    max?: number;
    options?: string[];
  }>;
  outputConfig: Array<{
    name: string;
    type: 'line' | 'histogram' | 'area';
    color: string;
  }>;
  overlay: boolean;
  author: string;
}

export const BUILTIN_INDICATORS: BuiltInIndicator[] = [
  // ============================================================================
  // MOVING AVERAGES (14 indicators)
  // ============================================================================
  {
    id: 'sma',
    name: 'Simple Moving Average (SMA)',
    category: 'moving_average',
    description: 'SMA - среднее арифметическое цен за период. Базовый трендовый индикатор.',
    pineCode: `ta.sma(close, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'sma', type: 'line', color: '#2962FF' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'ema',
    name: 'Exponential Moving Average (EMA)',
    category: 'moving_average',
    description: 'EMA - экспоненциальная скользящая средняя. Быстрее реагирует на последние цены.',
    pineCode: `ta.ema(close, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'ema', type: 'line', color: '#00C853' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'wma',
    name: 'Weighted Moving Average (WMA)',
    category: 'moving_average',
    description: 'WMA - взвешенная скользящая средняя. Больший вес последним ценам.',
    pineCode: `ta.wma(close, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'wma', type: 'line', color: '#7C4DFF' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'hma',
    name: 'Hull Moving Average (HMA)',
    category: 'moving_average',
    description: 'HMA - скользящая средняя Халла. Очень быстрая и сглаженная.',
    pineCode: `ta.hma(close, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'hma', type: 'line', color: '#FF6D00' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'vwma',
    name: 'Volume Weighted MA (VWMA)',
    category: 'moving_average',
    description: 'VWMA - скользящая средняя, взвешенная по объёму. Учитывает объём при расчёте.',
    pineCode: `ta.vwma(close, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'vwma', type: 'line', color: '#00BCD4' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'smma',
    name: 'Smoothed MA (SMMA/RMA)',
    category: 'moving_average',
    description: 'SMMA/RMA - сглаженная скользящая средняя. Используется в RSI и ATR.',
    pineCode: `ta.rma(close, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'smma', type: 'line', color: '#607D8B' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'dema',
    name: 'Double EMA (DEMA)',
    category: 'moving_average',
    description: 'DEMA - двойная экспоненциальная скользящая средняя. Быстрее EMA.',
    pineCode: `ta.dema(close, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'dema', type: 'line', color: '#E91E63' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'tema',
    name: 'Triple EMA (TEMA)',
    category: 'moving_average',
    description: 'TEMA - тройная экспоненциальная скользящая средняя. Ещё быстрее DEMA.',
    pineCode: `ta.tema(close, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'tema', type: 'line', color: '#9C27B0' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'kama',
    name: 'Kaufman Adaptive MA (KAMA)',
    category: 'moving_average',
    description: 'KAMA - адаптивная скользящая средняя Кауфмана. Подстраивается под волатильность.',
    pineCode: `ta.kama(close, 20, 2, 30)`,
    inputSchema: [
      { name: 'length', type: 'int', default: 20, min: 1, max: 500 },
      { name: 'fast', type: 'int', default: 2, min: 1, max: 50 },
      { name: 'slow', type: 'int', default: 30, min: 1, max: 200 },
    ],
    outputConfig: [{ name: 'kama', type: 'line', color: '#FF5722' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'vidya',
    name: 'Variable Index DYnamic Average (VIDYA)',
    category: 'moving_average',
    description: 'VIDYA - динамическая средняя Чанде. Адаптируется на основе CMO.',
    pineCode: `ta.vidya(close, 20, 10)`,
    inputSchema: [
      { name: 'length', type: 'int', default: 20, min: 1, max: 500 },
      { name: 'cmoPeriod', type: 'int', default: 10, min: 1, max: 100 },
    ],
    outputConfig: [{ name: 'vidya', type: 'line', color: '#795548' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'mcginley',
    name: 'McGinley Dynamic',
    category: 'moving_average',
    description: 'McGinley Dynamic - автоматически адаптируется к скорости рынка.',
    pineCode: `mcginley(close, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'mcginley', type: 'line', color: '#8BC34A' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'ema_cross',
    name: 'EMA Cross',
    category: 'moving_average',
    description: 'EMA Cross - пересечение двух EMA. Быстрая EMA пересекает медленную.',
    pineCode: `ta.ema(close, 9), ta.ema(close, 21)`,
    inputSchema: [
      { name: 'fastLength', type: 'int', default: 9, min: 1, max: 200 },
      { name: 'slowLength', type: 'int', default: 21, min: 1, max: 500 },
    ],
    outputConfig: [
      { name: 'fast', type: 'line', color: '#00C853' },
      { name: 'slow', type: 'line', color: '#F6465D' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'vwap',
    name: 'Volume Weighted Average Price (VWAP)',
    category: 'moving_average',
    description: 'VWAP - средневзвешенная по объёму цена. Используется институциональными трейдерами.',
    pineCode: `ta.vwap(close)`,
    inputSchema: [{ name: 'stddevBands', type: 'float', default: 1.0, min: 0.1, max: 3.0 }],
    outputConfig: [
      { name: 'vwap', type: 'line', color: '#2962FF' },
      { name: 'upper', type: 'line', color: '#2962FF50' },
      { name: 'lower', type: 'line', color: '#2962FF50' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'rolling_vwap',
    name: 'Rolling VWAP',
    category: 'moving_average',
    description: 'Rolling VWAP - VWAP за скользящий период, а не с начала сессии.',
    pineCode: `rolling_vwap(close, volume, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'rolling_vwap', type: 'line', color: '#3F51B5' }],
    overlay: true,
    author: 'CITARION',
  },

  // ============================================================================
  // MOMENTUM / OSCILLATORS (19 indicators)
  // ============================================================================
  {
    id: 'rsi',
    name: 'Relative Strength Index (RSI)',
    category: 'oscillator',
    description: 'RSI - индекс относительной силы. Значения 0-100. >70 перекупленность, <30 перепроданность.',
    pineCode: `ta.rsi(close, 14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [{ name: 'rsi', type: 'line', color: '#D500F9' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'macd',
    name: 'MACD',
    category: 'oscillator',
    description: 'MACD - схождение/расхождение скользящих средних. Трендовый осциллятор.',
    pineCode: `ta.macd(close, 12, 26, 9)`,
    inputSchema: [
      { name: 'fastLength', type: 'int', default: 12, min: 1, max: 100 },
      { name: 'slowLength', type: 'int', default: 26, min: 1, max: 200 },
      { name: 'signalLength', type: 'int', default: 9, min: 1, max: 100 },
    ],
    outputConfig: [
      { name: 'macd', type: 'line', color: '#2962FF' },
      { name: 'signal', type: 'line', color: '#FF6D00' },
      { name: 'histogram', type: 'histogram', color: '#26a69a' },
    ],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'ppo',
    name: 'Percentage Price Oscillator (PPO)',
    category: 'oscillator',
    description: 'PPO - процентный ценовой осциллятор. Похож на MACD, но в процентах.',
    pineCode: `ta.ppo(close, 12, 26, 9)`,
    inputSchema: [
      { name: 'fastLength', type: 'int', default: 12, min: 1, max: 100 },
      { name: 'slowLength', type: 'int', default: 26, min: 1, max: 200 },
      { name: 'signalLength', type: 'int', default: 9, min: 1, max: 100 },
    ],
    outputConfig: [
      { name: 'ppo', type: 'line', color: '#2196F3' },
      { name: 'signal', type: 'line', color: '#FF9800' },
      { name: 'histogram', type: 'histogram', color: '#4CAF50' },
    ],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'stochastic',
    name: 'Stochastic Oscillator',
    category: 'oscillator',
    description: 'Stochastic - позиция закрытия относительно диапазона High-Low. %K и %D линии.',
    pineCode: `ta.stoch(close, high, low, 14)`,
    inputSchema: [
      { name: 'kPeriod', type: 'int', default: 14, min: 1, max: 100 },
      { name: 'dPeriod', type: 'int', default: 3, min: 1, max: 50 },
      { name: 'smoothK', type: 'int', default: 1, min: 1, max: 10 },
    ],
    outputConfig: [
      { name: 'k', type: 'line', color: '#2962FF' },
      { name: 'd', type: 'line', color: '#FF6D00' },
    ],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'stochrsi',
    name: 'Stochastic RSI',
    category: 'oscillator',
    description: 'StochRSI - стохастик, применённый к RSI. Более чувствительный осциллятор.',
    pineCode: `ta.stochrsi(close, 14, 14, 3, 3)`,
    inputSchema: [
      { name: 'rsiPeriod', type: 'int', default: 14, min: 1, max: 100 },
      { name: 'stochPeriod', type: 'int', default: 14, min: 1, max: 100 },
      { name: 'kPeriod', type: 'int', default: 3, min: 1, max: 50 },
      { name: 'dPeriod', type: 'int', default: 3, min: 1, max: 50 },
    ],
    outputConfig: [
      { name: 'k', type: 'line', color: '#9C27B0' },
      { name: 'd', type: 'line', color: '#E91E63' },
    ],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'williams_r',
    name: 'Williams %R',
    category: 'oscillator',
    description: 'Williams %R - индикатор перекупленности/перепроданности. Диапазон от -100 до 0.',
    pineCode: `ta.wpr(14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [{ name: 'williams_r', type: 'line', color: '#FF5722' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'cci',
    name: 'Commodity Channel Index (CCI)',
    category: 'oscillator',
    description: 'CCI - индекс товарного канала. Измеряет текущую цену относительно средней.',
    pineCode: `ta.cci(close, high, low, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 200 }],
    outputConfig: [{ name: 'cci', type: 'line', color: '#00BCD4' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'mfi',
    name: 'Money Flow Index (MFI)',
    category: 'oscillator',
    description: 'MFI - индекс денежных потоков. RSI с учётом объёма. Диапазон 0-100.',
    pineCode: `ta.mfi(close, high, low, volume, 14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [{ name: 'mfi', type: 'line', color: '#FF9800' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'roc',
    name: 'Rate of Change (ROC)',
    category: 'oscillator',
    description: 'ROC - скорость изменения цены в процентах за период.',
    pineCode: `ta.roc(close, 10)`,
    inputSchema: [{ name: 'length', type: 'int', default: 10, min: 1, max: 200 }],
    outputConfig: [{ name: 'roc', type: 'line', color: '#4CAF50' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'momentum',
    name: 'Momentum',
    category: 'oscillator',
    description: 'Momentum - разница между текущей ценой и ценой N периодов назад.',
    pineCode: `ta.mom(close, 10)`,
    inputSchema: [{ name: 'length', type: 'int', default: 10, min: 1, max: 200 }],
    outputConfig: [{ name: 'momentum', type: 'line', color: '#2196F3' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'cmo',
    name: 'Chande Momentum Oscillator (CMO)',
    category: 'oscillator',
    description: 'CMO - осциллятор момента Чанде. Диапазон от -100 до +100.',
    pineCode: `ta.cmo(close, 14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 200 }],
    outputConfig: [{ name: 'cmo', type: 'line', color: '#9C27B0' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'ultimate_oscillator',
    name: 'Ultimate Oscillator',
    category: 'oscillator',
    description: 'Ultimate Oscillator - взвешенная сумма 3 осцилляторов разных периодов.',
    pineCode: `ta.ult(high, low, close, 7, 14, 28)`,
    inputSchema: [
      { name: 'period1', type: 'int', default: 7, min: 1, max: 50 },
      { name: 'period2', type: 'int', default: 14, min: 1, max: 100 },
      { name: 'period3', type: 'int', default: 28, min: 1, max: 200 },
    ],
    outputConfig: [{ name: 'ultosc', type: 'line', color: '#673AB7' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'awesome_oscillator',
    name: 'Awesome Oscillator (AO)',
    category: 'oscillator',
    description: 'AO - Awesome Oscillator Билла Вильямса. Разница 5 и 34 периодных SMA.',
    pineCode: `ta.ao(high, low, 5, 34)`,
    inputSchema: [
      { name: 'fastLength', type: 'int', default: 5, min: 1, max: 50 },
      { name: 'slowLength', type: 'int', default: 34, min: 1, max: 200 },
    ],
    outputConfig: [{ name: 'ao', type: 'histogram', color: '#26A69A' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'tsi',
    name: 'True Strength Index (TSI)',
    category: 'oscillator',
    description: 'TSI - индекс истинной силы. Сглаженный моментум.',
    pineCode: `tsi(close, 25, 13)`,
    inputSchema: [
      { name: 'longLength', type: 'int', default: 25, min: 1, max: 200 },
      { name: 'shortLength', type: 'int', default: 13, min: 1, max: 100 },
    ],
    outputConfig: [{ name: 'tsi', type: 'line', color: '#795548' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'vortex',
    name: 'Vortex Indicator',
    category: 'oscillator',
    description: 'Vortex - индикатор +VI и -VI для определения тренда и его направления.',
    pineCode: `vortex(high, low, close, 14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [
      { name: 'plusVI', type: 'line', color: '#26A69A' },
      { name: 'minusVI', type: 'line', color: '#EF5350' },
    ],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'mass_index',
    name: 'Mass Index',
    category: 'oscillator',
    description: 'Mass Index - индикатор разворота тренда. Сигнал при подъёме выше 27.',
    pineCode: `mass_index(high, low, 9, 25)`,
    inputSchema: [
      { name: 'emaPeriod', type: 'int', default: 9, min: 1, max: 50 },
      { name: 'sumPeriod', type: 'int', default: 25, min: 1, max: 100 },
    ],
    outputConfig: [{ name: 'mass_index', type: 'line', color: '#9C27B0' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'adx',
    name: 'Average Directional Index (ADX)',
    category: 'oscillator',
    description: 'ADX - сила тренда. >25 сильный тренд, +DI/-DI направление.',
    pineCode: `ta.dmi(14, 14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [
      { name: 'adx', type: 'line', color: '#2962FF' },
      { name: 'plusDI', type: 'line', color: '#26A69A' },
      { name: 'minusDI', type: 'line', color: '#EF5350' },
    ],
    overlay: false,
    author: 'CITARION',
  },

  // ============================================================================
  // VOLATILITY (12 indicators)
  // ============================================================================
  {
    id: 'bb',
    name: 'Bollinger Bands',
    category: 'volatility',
    description: 'Bollinger Bands - полосы Боллинджера. SMA ± n стандартных отклонений.',
    pineCode: `ta.bb(close, 20, 2)`,
    inputSchema: [
      { name: 'length', type: 'int', default: 20, min: 1, max: 200 },
      { name: 'mult', type: 'float', default: 2.0, min: 0.1, max: 5.0 },
    ],
    outputConfig: [
      { name: 'upper', type: 'line', color: '#2962FF' },
      { name: 'middle', type: 'line', color: '#FF6D00' },
      { name: 'lower', type: 'line', color: '#2962FF' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'bb_width',
    name: 'Bollinger Band Width',
    category: 'volatility',
    description: 'BB Width - ширина полос Боллинджера как процент от SMA. Показывает волатильность.',
    pineCode: `bb_width(close, 20, 2)`,
    inputSchema: [
      { name: 'length', type: 'int', default: 20, min: 1, max: 200 },
      { name: 'mult', type: 'float', default: 2.0, min: 0.1, max: 5.0 },
    ],
    outputConfig: [{ name: 'bb_width', type: 'line', color: '#9C27B0' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'atr',
    name: 'Average True Range (ATR)',
    category: 'volatility',
    description: 'ATR - средний истинный диапазон. Мера волатильности.',
    pineCode: `ta.atr(14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [{ name: 'atr', type: 'line', color: '#FF6D00' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'natr',
    name: 'Normalized ATR (NATR)',
    category: 'volatility',
    description: 'NATR - нормализованный ATR как процент от цены.',
    pineCode: `ta.natr(14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [{ name: 'natr', type: 'line', color: '#FF9800' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'true_range',
    name: 'True Range',
    category: 'volatility',
    description: 'True Range - истинный диапазон каждой свечи без сглаживания.',
    pineCode: `ta.tr`,
    inputSchema: [],
    outputConfig: [{ name: 'tr', type: 'histogram', color: '#607D8B' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'keltner_channel',
    name: 'Keltner Channel',
    category: 'volatility',
    description: 'Keltner Channel - канал Кельтнера. EMA ± (множитель × ATR).',
    pineCode: `ta.kc(close, high, low, 20, 10, 2)`,
    inputSchema: [
      { name: 'emaPeriod', type: 'int', default: 20, min: 1, max: 200 },
      { name: 'atrPeriod', type: 'int', default: 10, min: 1, max: 100 },
      { name: 'multiplier', type: 'float', default: 2.0, min: 0.1, max: 5.0 },
    ],
    outputConfig: [
      { name: 'upper', type: 'line', color: '#2962FF' },
      { name: 'middle', type: 'line', color: '#FF6D00' },
      { name: 'lower', type: 'line', color: '#2962FF' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'donchian_channel',
    name: 'Donchian Channel',
    category: 'volatility',
    description: 'Donchian Channel - канал Дончиана. Highest High и Lowest Low за период.',
    pineCode: `ta.donchian(high, low, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 200 }],
    outputConfig: [
      { name: 'upper', type: 'line', color: '#7C4DFF' },
      { name: 'middle', type: 'line', color: '#FF6D00' },
      { name: 'lower', type: 'line', color: '#7C4DFF' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'stddev',
    name: 'Standard Deviation',
    category: 'volatility',
    description: 'Standard Deviation - стандартное отклонение цены за период.',
    pineCode: `ta.stdev(close, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 200 }],
    outputConfig: [{ name: 'stddev', type: 'line', color: '#8BC34A' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'historical_volatility',
    name: 'Historical Volatility',
    category: 'volatility',
    description: 'Historical Volatility - годовая волатильность на основе логарифмических доходностей.',
    pineCode: `historical_volatility(close, 20, 252)`,
    inputSchema: [
      { name: 'length', type: 'int', default: 20, min: 1, max: 200 },
      { name: 'annualize', type: 'bool', default: true },
    ],
    outputConfig: [{ name: 'hv', type: 'line', color: '#CDDC39' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'supertrend',
    name: 'SuperTrend',
    category: 'volatility',
    description: 'SuperTrend - трендовый индикатор на основе ATR. Динамическая поддержка/сопротивление.',
    pineCode: `ta.supertrend(3, 10)`,
    inputSchema: [
      { name: 'period', type: 'int', default: 10, min: 1, max: 100 },
      { name: 'multiplier', type: 'float', default: 3.0, min: 0.1, max: 10.0 },
    ],
    outputConfig: [
      { name: 'supertrend', type: 'line', color: '#26A69A' },
      { name: 'direction', type: 'line', color: '#EF5350' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'parabolic_sar',
    name: 'Parabolic SAR',
    category: 'volatility',
    description: 'Parabolic SAR - Stop And Reverse. Трейлинг стоп для определения тренда.',
    pineCode: `ta.sar(0.02, 0.02, 0.2)`,
    inputSchema: [
      { name: 'start', type: 'float', default: 0.02, min: 0.01, max: 0.1 },
      { name: 'increment', type: 'float', default: 0.02, min: 0.01, max: 0.1 },
      { name: 'maximum', type: 'float', default: 0.2, min: 0.1, max: 0.5 },
    ],
    outputConfig: [{ name: 'sar', type: 'line', color: '#FF5722' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'ichimoku',
    name: 'Ichimoku Cloud',
    category: 'volatility',
    description: 'Ichimoku Kinko Hyo - комплексный индикатор: тренд, поддержка/сопротивление, сигналы.',
    pineCode: `ichimoku(high, low, close, 9, 26, 52, 26)`,
    inputSchema: [
      { name: 'tenkanPeriod', type: 'int', default: 9, min: 1, max: 100 },
      { name: 'kijunPeriod', type: 'int', default: 26, min: 1, max: 100 },
      { name: 'senkouBPeriod', type: 'int', default: 52, min: 1, max: 200 },
      { name: 'displacement', type: 'int', default: 26, min: 1, max: 100 },
    ],
    outputConfig: [
      { name: 'tenkan', type: 'line', color: '#2962FF' },
      { name: 'kijun', type: 'line', color: '#FF6D00' },
      { name: 'senkouA', type: 'line', color: '#26A69A' },
      { name: 'senkouB', type: 'line', color: '#EF5350' },
      { name: 'chikou', type: 'line', color: '#9C27B0' },
    ],
    overlay: true,
    author: 'CITARION',
  },

  // ============================================================================
  // VOLUME (9 indicators)
  // ============================================================================
  {
    id: 'obv',
    name: 'On-Balance Volume (OBV)',
    category: 'volume',
    description: 'OBV - кумулятивный индикатор объёма. Растёт при росте цены на объёме.',
    pineCode: `ta.obv`,
    inputSchema: [],
    outputConfig: [{ name: 'obv', type: 'line', color: '#2196F3' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'cmf',
    name: 'Chaikin Money Flow (CMF)',
    category: 'volume',
    description: 'CMF - денежный поток Чайкина. Диапазон от -1 до +1.',
    pineCode: `ta.cmf(close, high, low, volume, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 200 }],
    outputConfig: [{ name: 'cmf', type: 'line', color: '#9C27B0' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'adl',
    name: 'Accumulation/Distribution Line (ADL)',
    category: 'volume',
    description: 'ADL - линия накопления/распределения. Как OBV с учётом позиции закрытия.',
    pineCode: `ta.ad`,
    inputSchema: [],
    outputConfig: [{ name: 'adl', type: 'line', color: '#FF9800' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'mfi_volume',
    name: 'Money Flow Index (Volume)',
    category: 'volume',
    description: 'MFI - индекс денежных потоков. RSI с учётом объёма.',
    pineCode: `ta.mfi(14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [{ name: 'mfi', type: 'line', color: '#E91E63' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'volume_oscillator',
    name: 'Volume Oscillator',
    category: 'volume',
    description: 'Volume Oscillator - разница двух SMA объёма в процентах.',
    pineCode: `volume_oscillator(volume, 5, 10)`,
    inputSchema: [
      { name: 'fastLength', type: 'int', default: 5, min: 1, max: 100 },
      { name: 'slowLength', type: 'int', default: 10, min: 1, max: 200 },
    ],
    outputConfig: [{ name: 'vol_osc', type: 'histogram', color: '#26A69A' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'emv',
    name: 'Ease of Movement (EMV)',
    category: 'volume',
    description: 'EMV - лёгкость движения. Учитывает цену и объём.',
    pineCode: `emv(high, low, volume, 14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [{ name: 'emv', type: 'line', color: '#795548' }],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'vol_sma',
    name: 'Volume with SMA',
    category: 'volume',
    description: 'Volume with SMA - объём со скользящей средней.',
    pineCode: `volume, ta.sma(volume, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 200 }],
    outputConfig: [
      { name: 'volume', type: 'histogram', color: '#2962FF80' },
      { name: 'volSMA', type: 'line', color: '#FF6D00' },
    ],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'vwap_volume',
    name: 'VWAP (Volume)',
    category: 'volume',
    description: 'VWAP - средневзвешенная по объёму цена. Институциональный индикатор.',
    pineCode: `ta.vwap`,
    inputSchema: [{ name: 'stddevBands', type: 'float', default: 1.0, min: 0.1, max: 3.0 }],
    outputConfig: [
      { name: 'vwap', type: 'line', color: '#2962FF' },
      { name: 'upper', type: 'line', color: '#2962FF50' },
      { name: 'lower', type: 'line', color: '#2962FF50' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'rolling_vwap_vol',
    name: 'Rolling VWAP',
    category: 'volume',
    description: 'Rolling VWAP - VWAP за скользящий период.',
    pineCode: `rolling_vwap(volume, 20)`,
    inputSchema: [{ name: 'length', type: 'int', default: 20, min: 1, max: 500 }],
    outputConfig: [{ name: 'rolling_vwap', type: 'line', color: '#3F51B5' }],
    overlay: true,
    author: 'CITARION',
  },

  // ============================================================================
  // TREND (8 indicators)
  // ============================================================================
  {
    id: 'adx_trend',
    name: 'ADX - Trend Strength',
    category: 'trend',
    description: 'ADX - сила тренда без направления. >25 = сильный тренд.',
    pineCode: `ta.adx(14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [
      { name: 'adx', type: 'line', color: '#2962FF' },
      { name: 'plusDI', type: 'line', color: '#26A69A' },
      { name: 'minusDI', type: 'line', color: '#EF5350' },
    ],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'aroon',
    name: 'Aroon',
    category: 'trend',
    description: 'Aroon - индикатор начала тренда. Aroon Up и Aroon Down.',
    pineCode: `ta.aroon(14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [
      { name: 'aroon_up', type: 'line', color: '#26A69A' },
      { name: 'aroon_down', type: 'line', color: '#EF5350' },
      { name: 'oscillator', type: 'histogram', color: '#2196F3' },
    ],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'supertrend_trend',
    name: 'SuperTrend',
    category: 'trend',
    description: 'SuperTrend - определение направления тренда и точек разворота.',
    pineCode: `ta.supertrend(3, 10)`,
    inputSchema: [
      { name: 'period', type: 'int', default: 10, min: 1, max: 100 },
      { name: 'multiplier', type: 'float', default: 3.0, min: 0.1, max: 10.0 },
    ],
    outputConfig: [
      { name: 'supertrend', type: 'line', color: '#26A69A' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'ichimoku_trend',
    name: 'Ichimoku Cloud',
    category: 'trend',
    description: 'Ichimoku - комплексный трендовый индикатор.',
    pineCode: `ichimoku(9, 26, 52, 26)`,
    inputSchema: [
      { name: 'tenkanPeriod', type: 'int', default: 9, min: 1, max: 100 },
      { name: 'kijunPeriod', type: 'int', default: 26, min: 1, max: 100 },
      { name: 'senkouBPeriod', type: 'int', default: 52, min: 1, max: 200 },
      { name: 'displacement', type: 'int', default: 26, min: 1, max: 100 },
    ],
    outputConfig: [
      { name: 'tenkan', type: 'line', color: '#2962FF' },
      { name: 'kijun', type: 'line', color: '#FF6D00' },
      { name: 'senkouA', type: 'line', color: '#26A69A' },
      { name: 'senkouB', type: 'line', color: '#EF5350' },
      { name: 'chikou', type: 'line', color: '#9C27B0' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'sar_trend',
    name: 'Parabolic SAR',
    category: 'trend',
    description: 'Parabolic SAR - определение направления и разворота тренда.',
    pineCode: `ta.sar(0.02, 0.02, 0.2)`,
    inputSchema: [
      { name: 'start', type: 'float', default: 0.02, min: 0.01, max: 0.1 },
      { name: 'increment', type: 'float', default: 0.02, min: 0.01, max: 0.1 },
      { name: 'maximum', type: 'float', default: 0.2, min: 0.1, max: 0.5 },
    ],
    outputConfig: [{ name: 'sar', type: 'line', color: '#FF5722' }],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'vortex_trend',
    name: 'Vortex Indicator',
    category: 'trend',
    description: 'Vortex - +VI/-VI для определения направления тренда.',
    pineCode: `vortex(14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [
      { name: 'plusVI', type: 'line', color: '#26A69A' },
      { name: 'minusVI', type: 'line', color: '#EF5350' },
    ],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'dmi',
    name: 'Directional Movement Index (DMI)',
    category: 'trend',
    description: 'DMI - +DI и -DI для определения направления движения.',
    pineCode: `ta.dmi(14)`,
    inputSchema: [{ name: 'length', type: 'int', default: 14, min: 1, max: 100 }],
    outputConfig: [
      { name: 'plusDI', type: 'line', color: '#26A69A' },
      { name: 'minusDI', type: 'line', color: '#EF5350' },
    ],
    overlay: false,
    author: 'CITARION',
  },
  {
    id: 'kama_trend',
    name: 'Kaufman Adaptive MA',
    category: 'trend',
    description: 'KAMA - адаптивная средняя для определения тренда.',
    pineCode: `ta.kama(20)`,
    inputSchema: [
      { name: 'length', type: 'int', default: 20, min: 1, max: 500 },
      { name: 'fast', type: 'int', default: 2, min: 1, max: 50 },
      { name: 'slow', type: 'int', default: 30, min: 1, max: 200 },
    ],
    outputConfig: [{ name: 'kama', type: 'line', color: '#FF5722' }],
    overlay: true,
    author: 'CITARION',
  },

  // ============================================================================
  // PIVOT POINTS (5 types)
  // ============================================================================
  {
    id: 'pivot_standard',
    name: 'Pivot Points (Standard)',
    category: 'pivot',
    description: 'Standard Floor Pivot Points: PP = (H+L+C)/3',
    pineCode: `pivot_standard()`,
    inputSchema: [
      { name: 'useWeekly', type: 'bool', default: false },
      { name: 'useMonthly', type: 'bool', default: false },
    ],
    outputConfig: [
      { name: 'pivot', type: 'line', color: '#FFD700' },
      { name: 'r1', type: 'line', color: '#EF5350' },
      { name: 'r2', type: 'line', color: '#E91E63' },
      { name: 'r3', type: 'line', color: '#CE93D8' },
      { name: 's1', type: 'line', color: '#26A69A' },
      { name: 's2', type: 'line', color: '#66BB6A' },
      { name: 's3', type: 'line', color: '#A5D6A7' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'pivot_fibonacci',
    name: 'Pivot Points (Fibonacci)',
    category: 'pivot',
    description: 'Fibonacci Pivot Points: использует уровни 0.382, 0.618',
    pineCode: `pivot_fibonacci()`,
    inputSchema: [
      { name: 'useWeekly', type: 'bool', default: false },
      { name: 'useMonthly', type: 'bool', default: false },
    ],
    outputConfig: [
      { name: 'pivot', type: 'line', color: '#FFD700' },
      { name: 'r1', type: 'line', color: '#EF5350' },
      { name: 'r2', type: 'line', color: '#E91E63' },
      { name: 'r3', type: 'line', color: '#CE93D8' },
      { name: 's1', type: 'line', color: '#26A69A' },
      { name: 's2', type: 'line', color: '#66BB6A' },
      { name: 's3', type: 'line', color: '#A5D6A7' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'pivot_camarilla',
    name: 'Pivot Points (Camarilla)',
    category: 'pivot',
    description: 'Camarilla Pivot Points: 8 уровней (R1-R4, S1-S4)',
    pineCode: `pivot_camarilla()`,
    inputSchema: [
      { name: 'useWeekly', type: 'bool', default: false },
      { name: 'useMonthly', type: 'bool', default: false },
    ],
    outputConfig: [
      { name: 'pivot', type: 'line', color: '#FFD700' },
      { name: 'r1', type: 'line', color: '#EF5350' },
      { name: 'r2', type: 'line', color: '#E91E63' },
      { name: 'r3', type: 'line', color: '#CE93D8' },
      { name: 'r4', type: 'line', color: '#AB47BC' },
      { name: 's1', type: 'line', color: '#26A69A' },
      { name: 's2', type: 'line', color: '#66BB6A' },
      { name: 's3', type: 'line', color: '#A5D6A7' },
      { name: 's4', type: 'line', color: '#81C784' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'pivot_woodie',
    name: 'Pivot Points (Woodie)',
    category: 'pivot',
    description: 'Woodie Pivot Points: PP = (H+L+2C)/4, больший вес Close',
    pineCode: `pivot_woodie()`,
    inputSchema: [
      { name: 'useWeekly', type: 'bool', default: false },
      { name: 'useMonthly', type: 'bool', default: false },
    ],
    outputConfig: [
      { name: 'pivot', type: 'line', color: '#FFD700' },
      { name: 'r1', type: 'line', color: '#EF5350' },
      { name: 'r2', type: 'line', color: '#E91E63' },
      { name: 'r3', type: 'line', color: '#CE93D8' },
      { name: 's1', type: 'line', color: '#26A69A' },
      { name: 's2', type: 'line', color: '#66BB6A' },
      { name: 's3', type: 'line', color: '#A5D6A7' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'pivot_demark',
    name: 'Pivot Points (Demark)',
    category: 'pivot',
    description: 'Demark Pivot Points: формула зависит от Open vs Close',
    pineCode: `pivot_demark()`,
    inputSchema: [
      { name: 'useWeekly', type: 'bool', default: false },
      { name: 'useMonthly', type: 'bool', default: false },
    ],
    outputConfig: [
      { name: 'pivot', type: 'line', color: '#FFD700' },
      { name: 'r1', type: 'line', color: '#EF5350' },
      { name: 's1', type: 'line', color: '#26A69A' },
    ],
    overlay: true,
    author: 'CITARION',
  },

  // ============================================================================
  // FIBONACCI (3 indicators)
  // ============================================================================
  {
    id: 'fibonacci_retracement',
    name: 'Fibonacci Retracement',
    category: 'fibonacci',
    description: 'Fibonacci Retracement - уровни коррекции Фибоначчи: 23.6%, 38.2%, 50%, 61.8%, 78.6%',
    pineCode: `fib_retracement(high, low)`,
    inputSchema: [
      { name: 'showLevels', type: 'bool', default: true },
    ],
    outputConfig: [
      { name: 'level0', type: 'line', color: '#F44336' },
      { name: 'level236', type: 'line', color: '#E91E63' },
      { name: 'level382', type: 'line', color: '#9C27B0' },
      { name: 'level500', type: 'line', color: '#673AB7' },
      { name: 'level618', type: 'line', color: '#3F51B5' },
      { name: 'level786', type: 'line', color: '#2196F3' },
      { name: 'level1000', type: 'line', color: '#00BCD4' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'fibonacci_extension',
    name: 'Fibonacci Extension',
    category: 'fibonacci',
    description: 'Fibonacci Extension - уровни расширения: 127.2%, 161.8%, 200%, 261.8%',
    pineCode: `fib_extension(high, low, close)`,
    inputSchema: [],
    outputConfig: [
      { name: 'level1272', type: 'line', color: '#8BC34A' },
      { name: 'level1618', type: 'line', color: '#CDDC39' },
      { name: 'level2000', type: 'line', color: '#FFEB3B' },
      { name: 'level2618', type: 'line', color: '#FFC107' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'fibonacci_levels',
    name: 'Fibonacci Levels',
    category: 'fibonacci',
    description: 'Fibonacci Levels - все уровни Фибоначчи на основе High/Low диапазона',
    pineCode: `fib_levels(high, low)`,
    inputSchema: [
      { name: 'lookback', type: 'int', default: 100, min: 10, max: 500 },
    ],
    outputConfig: [
      { name: 'level0', type: 'line', color: '#F44336' },
      { name: 'level236', type: 'line', color: '#E91E63' },
      { name: 'level382', type: 'line', color: '#9C27B0' },
      { name: 'level500', type: 'line', color: '#673AB7' },
      { name: 'level618', type: 'line', color: '#3F51B5' },
      { name: 'level786', type: 'line', color: '#2196F3' },
      { name: 'level1000', type: 'line', color: '#00BCD4' },
    ],
    overlay: true,
    author: 'CITARION',
  },

  // ============================================================================
  // CHART TRANSFORMS (kept for compatibility)
  // ============================================================================
  {
    id: 'heikin_ashi',
    name: 'Heikin-Ashi',
    category: 'transform',
    description: 'Heikin-Ashi - сглаженные свечи для лучшего определения тренда.',
    pineCode: `ha_close = (o+h+l+c)/4`,
    inputSchema: [],
    outputConfig: [
      { name: 'ha_open', type: 'line', color: '#FF6D00' },
      { name: 'ha_close', type: 'line', color: '#2962FF' },
    ],
    overlay: true,
    author: 'CITARION',
  },
  {
    id: 'renko',
    name: 'Renko',
    category: 'transform',
    description: 'Renko - кирпичный график без учёта времени.',
    pineCode: `renko(brick_size)`,
    inputSchema: [
      { name: 'brickSize', type: 'float', default: 0, min: 0, max: 10000 },
      { name: 'useAtr', type: 'bool', default: true },
      { name: 'atrPeriod', type: 'int', default: 14, min: 1, max: 100 },
    ],
    outputConfig: [{ name: 'renko', type: 'line', color: '#26A69A' }],
    overlay: true,
    author: 'CITARION',
  },
];

/**
 * Get all built-in indicators
 */
export function getBuiltinIndicators(): BuiltInIndicator[] {
  return BUILTIN_INDICATORS;
}

/**
 * Get built-in indicator by ID
 */
export function getBuiltinIndicator(id: string): BuiltInIndicator | undefined {
  return BUILTIN_INDICATORS.find(ind => ind.id === id);
}

/**
 * Get indicators by category
 */
export function getIndicatorsByCategory(category: string): BuiltInIndicator[] {
  return BUILTIN_INDICATORS.filter(ind => ind.category === category);
}

/**
 * Get all categories
 */
export function getIndicatorCategories(): string[] {
  return Array.from(new Set(BUILTIN_INDICATORS.map(ind => ind.category)));
}

/**
 * Get indicator count by category
 */
export function getIndicatorCountByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};
  BUILTIN_INDICATORS.forEach(ind => {
    counts[ind.category] = (counts[ind.category] || 0) + 1;
  });
  return counts;
}

/**
 * Get total indicator count
 */
export function getTotalIndicatorCount(): number {
  return BUILTIN_INDICATORS.length;
}
