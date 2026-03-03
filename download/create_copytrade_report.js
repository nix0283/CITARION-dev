import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, 
        AlignmentType, PageNumber, BorderStyle, WidthType, HeadingLevel, ShadingType, 
        VerticalAlign, LevelFormat, TableOfContents } from 'docx';
import fs from 'fs';

// Colors - Midnight Code palette
const colors = {
  title: '#020617',
  body: '#1E293B',
  subtitle: '#64748B',
  accent: '#94A3B8',
  tableBg: '#F8FAFC',
  tableHeader: '#E2E8F0'
};

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: colors.accent };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

// Helper functions
const createHeading1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text, bold: true, size: 32, color: colors.title, font: 'Times New Roman' })]
});

const createHeading2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 150 },
  children: [new TextRun({ text, bold: true, size: 28, color: colors.title, font: 'Times New Roman' })]
});

const createParagraph = (text) => new Paragraph({
  spacing: { after: 120, line: 250 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text, size: 22, color: colors.body, font: 'Times New Roman' })]
});

const createBulletParagraph = (text, reference = 'bullet-list') => new Paragraph({
  numbering: { reference, level: 0 },
  spacing: { after: 60, line: 250 },
  children: [new TextRun({ text, size: 22, color: colors.body, font: 'Times New Roman' })]
});

// Create table
const createComparisonTable = () => {
  const headers = ['Биржа', 'API для копитрейдинга', 'Мастер-трейдер API', 'Статистика', 'Управление позициями'];
  const data = [
    ['Binance', '✅ Полное', '✅ Есть', '✅ Детальная', '✅ Полное'],
    ['Bybit', '✅ Полное', '✅ Есть', '✅ Детальная', '✅ Полное'],
    ['OKX', '✅ Полное', '✅ Есть', '✅ Детальная', '✅ Полное'],
    ['Bitget', '✅ Полное', '✅ Есть', '✅ Детальная', '✅ Полное'],
    ['BingX', '⚠️ Ограниченное', '⚠️ Частичное', '✅ Базовая', '⚠️ Через стандартный API']
  ];
  
  return new Table({
    columnWidths: [1800, 2000, 1800, 1800, 2000],
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(h => new TableCell({
          borders: cellBorders,
          shading: { fill: colors.tableHeader, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: h, bold: true, size: 20, color: colors.title, font: 'Times New Roman' })]
          })]
        }))
      }),
      ...data.map(row => new TableRow({
        children: row.map((cell, i) => new TableCell({
          borders: cellBorders,
          shading: { fill: colors.tableBg, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ 
              text: cell, 
              size: 20, 
              color: cell.startsWith('✅') ? '#16A34A' : cell.startsWith('⚠️') ? '#CA8A04' : colors.body,
              font: 'Times New Roman'
            })]
          })]
        }))
      }))
    ]
  });
};

// API endpoints table for each exchange
const createEndpointsTable = (title, endpoints) => {
  return new Table({
    columnWidths: [4500, 4900],
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            borders: cellBorders,
            shading: { fill: colors.tableHeader, type: ShadingType.CLEAR },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Endpoint', bold: true, size: 20, color: colors.title, font: 'Times New Roman' })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            shading: { fill: colors.tableHeader, type: ShadingType.CLEAR },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Описание', bold: true, size: 20, color: colors.title, font: 'Times New Roman' })]
            })]
          })
        ]
      }),
      ...endpoints.map(([endpoint, desc]) => new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            shading: { fill: colors.tableBg, type: ShadingType.CLEAR },
            children: [new Paragraph({
              children: [new TextRun({ text: endpoint, size: 18, color: colors.body, font: 'Courier New' })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            shading: { fill: colors.tableBg, type: ShadingType.CLEAR },
            children: [new Paragraph({
              children: [new TextRun({ text: desc, size: 20, color: colors.body, font: 'Times New Roman' })]
            })]
          })
        ]
      }))
    ]
  });
};

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Times New Roman', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: colors.title, font: 'Times New Roman' },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, color: colors.title, font: 'Times New Roman' },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } }
    ]
  },
  numbering: {
    config: [
      { reference: 'bullet-list', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbered-list', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'CITARION - Исследование Copy Trading API', size: 18, color: colors.subtitle, font: 'Times New Roman' })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Страница ', size: 18, color: colors.subtitle }), 
                   new TextRun({ children: [PageNumber.CURRENT], size: 18, color: colors.subtitle }),
                   new TextRun({ text: ' из ', size: 18, color: colors.subtitle }),
                   new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: colors.subtitle })]
      })] })
    },
    children: [
      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: 'Исследование Copy Trading API', bold: true, size: 48, color: colors.title, font: 'Times New Roman' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [new TextRun({ text: 'Binance | Bybit | OKX | Bitget | BingX', size: 28, color: colors.subtitle, font: 'Times New Roman' })]
      }),

      // TOC
      new TableOfContents('Содержание', { hyperlink: true, headingStyleRange: '1-2' }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 400 },
        children: [new TextRun({ text: 'Примечание: Обновите оглавление (правый клик → Update Field)', size: 18, color: '999999', font: 'Times New Roman', italics: true })]
      }),

      // Introduction
      createHeading1('1. Введение'),
      createParagraph('Копитрейдинг (Copy Trading) — это механизм, позволяющий трейдерам автоматически копировать сделки опытных участников рынка (Master Trader / Lead Trader). Данный функционал предоставляется большинством крупных криптобирж и является важным инструментом как для начинающих трейдеров, так и для профессионалов, желающих monetизировать свои стратегии.'),
      createParagraph('В рамках исследования были изучены API возможности пяти бирж: Binance, Bybit, OKX, Bitget и BingX. Рассматривались вопросы доступа к данным о мастер-трейдерах, статистике их торговли, управлении позициями через приватный API, а также ограничения и требования к использованию данных функций.'),

      // Comparison table
      createHeading1('2. Сравнительная таблица'),
      createParagraph('Ниже представлена сводная таблица возможностей копитрейдинга через API для каждой биржи:'),
      createComparisonTable(),
      new Paragraph({ spacing: { after: 200 } }),

      // Binance
      createHeading1('3. Binance Copy Trading API'),
      createParagraph('Binance предоставляет полноценный API для работы с копитрейдингом через отдельный модуль Copy Trading. Официальная документация доступна на developers.binance.com, а также существует официальный npm-пакет @binance/copy-trading.'),
      
      createHeading2('3.1 Доступные endpoints'),
      createEndpointsTable('Binance API Endpoints', [
        ['GET /sapi/v1/copyTrading/futures/userStatus', 'Получить статус Lead Trader'],
        ['GET /sapi/v1/copyTrading/futures/leadSymbol', 'Получить whitelist торговых пар'],
        ['POST /sapi/v1/copyTrading/futures/...', 'Управление настройками копитрейдинга']
      ]),
      new Paragraph({ spacing: { after: 200 } }),

      createHeading2('3.2 Возможности'),
      createBulletParagraph('Получение статуса Lead Trader (isLeadTrader, time)'),
      createBulletParagraph('Получение списка разрешённых торговых пар для копитрейдинга'),
      createBulletParagraph('Управление настройками портфеля копитрейдинга'),
      createBulletParagraph('Интеграция через официальный npm-пакет @binance/copy-trading'),
      createBulletParagraph('Поддержка RSA и ED25519 аутентификации'),

      createHeading2('3.3 Ограничения'),
      createParagraph('API требует прав TRADE для выполнения операций. Weight: 20 для основных endpoints. Для статуса Lead Trader необходимо пройти верификацию и соответствовать требованиям биржи.'),

      // Bybit
      createHeading1('4. Bybit Copy Trading API'),
      createParagraph('Bybit реализует копитрейдинг через V5 API. Мастер-трейдеры могут использовать стандартные торговые endpoints, и сделки автоматически копируются подписчиками. Для копитрейдинга требуется API ключ с правами "Contract - Orders & Positions".'),

      createHeading2('4.1 Особенности реализации'),
      createBulletParagraph('Копитрейдинг работает через стандартный V5 API'),
      createBulletParagraph('Сделки мастер-трейдера автоматически реплицируются followers'),
      createBulletParagraph('Поддержка Unified Trading Account (UTA Pro)'),
      createBulletParagraph('Возможность копирования торговых ботов'),

      createHeading2('4.2 Документация'),
      createParagraph('Официальная документация: bybit-exchange.github.io/docs/v5/copytrade. Подробная информация о настройке мастер-трейдерского аккаунта доступна в Help Center Bybit.'),

      // OKX
      createHeading1('5. OKX Copy Trading API'),
      createParagraph('OKX предоставляет расширенные возможности для копитрейдинга через V5 API. Существует отдельный раздел Copy Trading API с endpoints для получения статистики трейдеров и управления подписками.'),

      createHeading2('5.1 Возможности'),
      createBulletParagraph('Получение рейтинга и статистики мастер-трейдеров'),
      createBulletParagraph('Просмотр текущих позиций и истории сделок'),
      createBulletParagraph('Пропорциональный копитрейдинг (proportional copy trading)'),
      createBulletParagraph('Фильтрация API-трейдеров (quantitative trading)'),
      createBulletParagraph('Оценка рисков и распределение активов'),

      createHeading2('5.2 Особенности'),
      createParagraph('OKX выделяется наличием отдельной "API Zone" для копитрейдеров, использующих алгоритмическую торговлю. Это позволяет followers выбирать именно количественных трейдеров.'),

      // Bitget
      createHeading1('6. Bitget Copy Trading API'),
      createParagraph('Bitget имеет наиболее развитый API для копитрейдинга с отдельным разделом документации. Поддерживаются как Futures, так и Spot CopyTrading с полным набором endpoints для управления.'),

      createHeading2('6.1 Future CopyTrading Endpoints'),
      createEndpointsTable('Bitget Future CopyTrading', [
        ['GET /api/mix/v1/trace/currentTrack', 'Текущие позиции трейдера'],
        ['GET /api/mix/v1/trace/followerOrder', 'Ордера followers'],
        ['GET /api/mix/v1/trace/traderList', 'Список трейдеров'],
        ['POST /api/mix/v1/trace/closeTrackOrder', 'Закрыть позицию'],
        ['POST /api/mix/v1/trace/modifyTPSL', 'Изменить TP/SL'],
        ['GET /api/mix/v1/trace/profitDateGroupList', 'Статистика прибыли по датам'],
        ['GET /api/mix/v1/trace/myFollowerList', 'Список followers'],
        ['POST /api/mix/v1/trace/removeFollower', 'Удалить follower']
      ]),
      new Paragraph({ spacing: { after: 200 } }),

      createHeading2('6.2 Spot CopyTrading Endpoints'),
      createBulletParagraph('/api/spot/v1/trace/order/orderHistoryList - История ордеров'),
      createBulletParagraph('/api/spot/v1/trace/config/getFollowerSettings - Настройки follower'),
      createBulletParagraph('/api/spot/v1/trace/user/myTraders - Список моих трейдеров'),
      createBulletParagraph('/api/spot/v1/trace/config/setFollowerConfig - Установить настройки'),

      createHeading2('6.3 Rate Limits'),
      createParagraph('Большинство endpoints имеют лимит 5 req/sec/UID (снижено с 10 req/sec в августе 2024).'),

      // BingX
      createHeading1('7. BingX Copy Trading'),
      createParagraph('BingX предоставляет копитрейдинг через Copy Trading 2.0. Однако API для копитрейдинга имеет ограничения по сравнению с другими биржами.'),

      createHeading2('7.1 Режимы копитрейдинга'),
      createBulletParagraph('Copy-by-position mode (Perpetual Futures) — поддерживает API торговлю'),
      createBulletParagraph('CopyTrade Pro — кросс-биржевое копирование через Binance API'),

      createHeading2('7.2 Особенности и ограничения'),
      createBulletParagraph('Управление позициями через стандартный Perpetual Futures API'),
      createBulletParagraph('Нет отдельных endpoints для копитрейдинга в публичной документации'),
      createBulletParagraph('CopyTrade Pro использует подключение к Binance API для мониторинга'),
      createBulletParagraph('Поддержка sub-accounts для followers'),

      createParagraph('BingX фокусируется на пользовательском интерфейсе для копитрейдинга, предоставляя меньше API-инструментов для программного управления.'),

      // Summary
      createHeading1('8. Выводы и рекомендации'),
      
      createHeading2('8.1 Лучшие практики'),
      createBulletParagraph('Bitget — наиболее полное API с отдельной документацией по копитрейдингу'),
      createBulletParagraph('Binance — официальная библиотека @binance/copy-trading для Node.js'),
      createBulletParagraph('OKX — расширенная статистика и фильтрация API-трейдеров'),
      createBulletParagraph('Bybit — интеграция через стандартный V5 API'),
      createBulletParagraph('BingX — ограниченные API возможности, подходит для UI-based копитрейдинга'),

      createHeading2('8.2 Рекомендации для интеграции'),
      createParagraph('Для платформы CITARION рекомендуется использовать Bitget и Binance как основные источники данных о мастер-трейдерах, так как они предоставляют наиболее полное API. OKX и Bybit могут быть добавлены для расширения覆盖. BingX рекомендуется использовать только для базовых операций копитрейдинга через UI.'),

      createHeading2('8.3 Требования к API ключам'),
      createParagraph('Для работы с копитрейдингом API ключи должны иметь права: READ (для получения статистики), TRADE (для управления позициями). Некоторые биржи требуют дополнительные права для копитрейдинга (например, Bybit требует "Contract - Orders & Positions"). Всегда рекомендуется привязка IP-адресов для безопасности.'),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/home/z/my-project/download/CopyTrading_API_Research.docx', buffer);
  console.log('Document created: CopyTrading_API_Research.docx');
});
