const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign, Header, Footer, PageNumber, PageBreak, TableOfContents } = require('docx');
const fs = require('fs');

// Color scheme - "Midnight Code" for tech/AI project
const colors = {
  primary: "020617",      // Midnight Black
  body: "1E293B",         // Deep Slate Blue
  secondary: "64748B",    // Cool Blue-Gray
  accent: "94A3B8",       // Steady Silver
  tableBg: "F8FAFC",      // Glacial Blue-White
  headerBg: "E2E8F0",     // Light slate
};

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: colors.secondary };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 24 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 56, bold: true, color: colors.primary, font: "Times New Roman" },
        paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: colors.primary, font: "Times New Roman" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: colors.body, font: "Times New Roman" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: colors.secondary, font: "Times New Roman" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  sections: [
    // Cover Page
    {
      properties: { page: { margin: { top: 0, right: 0, bottom: 0, left: 0 } } },
      children: [
        new Paragraph({ spacing: { before: 6000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "CITARION TRADING PLATFORM", size: 72, bold: true, color: colors.primary })]
        }),
        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "АРХИТЕКТУРНЫЙ ПЛАН МОДЕРНИЗАЦИИ", size: 48, color: colors.body })]
        }),
        new Paragraph({ spacing: { before: 200 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Институциональный уровень", size: 32, color: colors.secondary })]
        }),
        new Paragraph({ spacing: { before: 800 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Версия 2.0", size: 28, color: colors.accent })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: new Date().toLocaleDateString('ru-RU'), size: 24, color: colors.accent })]
        }),
      ]
    },
    // TOC Page
    {
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("СОДЕРЖАНИЕ")] }),
        new TableOfContents("Содержание", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "Для обновления номеров страниц нажмите правой кнопкой на содержание и выберите «Обновить поле»", size: 18, color: "999999" })]
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ]
    },
    // Main Content
    {
      properties: { page: { margin: { top: 1800, right: 1440, bottom: 1440, left: 1440 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "CITARION — Архитектурный план модернизации", size: 20, color: colors.secondary })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "— ", size: 20 }), new TextRun({ children: [PageNumber.CURRENT], size: 20 }), new TextRun({ text: " —", size: 20 })]
          })]
        })
      },
      children: [
        // ===== EXECUTIVE SUMMARY =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("EXECUTIVE SUMMARY")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Данный документ представляет комплексный архитектурный план модернизации торговой платформы CITARION до институционального уровня. План разделён на два стратегических этапа, обеспечивающих постепенную трансформацию системы с минимизацией рисков и максимизцией эффективности. Этап 1 фокусируется на создании единой оркестрационной инфраструктуры и интеграции всех компонентов в централизованную шину данных. Этап 2 посвящён глубокой модернизации алгоритмических ядер с внедрением механизмов самообучения на основе классического машинного обучения и генетических алгоритмов.", size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Ключевые цели модернизации включают: унификацию взаимодействия между всеми ботами через событийно-ориентированную архитектуру, создание механизмов самооптимизации параметров без использования нейронных сетей, поддержку мультивалютного и мультибиржевого режима работы, а также разработку интеллектуального аналитического модуля LOGOS для автономного принятия торговых решений. Реализация плана рассчитана на 12-18 месяцев с промежуточными контрольными точками каждые 6 недель.", size: 24 })]
        }),

        // ===== SECTION 1: BOT CLASSIFICATION =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. КЛАССИФИКАЦИЯ БОТОВ")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 Операционные боты (Operational Bots)")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Операционные боты представляют собой основу торговой инфраструктуры, реализующую стандартные стратегии автоматической торговли. Каждый бот специализируется на определённом рыночном сценарии и временной горизонте. Данная категория ботов полностью реализована в текущей системе и требует интеграции в оркестрационный слой. Все операционные боты используют трёхбуквенные коды для идентификации в UI и системе логирования.", size: 24 })]
        }),
        
        // Operational Bots Table
        new Table({
          columnWidths: [2000, 1200, 3000, 3160],
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Имя бота", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Код", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Стратегия", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Файлы", bold: true, size: 22 })] })] }),
              ]
            }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MESH", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "GRD", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Grid Trading", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "grid-bot/adaptive-grid.ts", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SCALE", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DCA", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Dollar Cost Averaging", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "dca-bot/safety-orders.ts", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BAND", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BBB", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bollinger Bands", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "bb-bot/mtf-confirmation.ts", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "EDGE", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "RNG", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Range Trading", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "range-bot/engine.ts", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Argus", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PND", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Pump & Dump Detection", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "argus-bot/whale-tracker.ts", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Vision", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "FCS", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Forecasting / Price Prediction", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "vision-bot/forecast-model.ts", size: 20 })] })] }),
            ]}),
          ]
        }),
        new Paragraph({ spacing: { before: 100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Таблица 1.1 — Операционные боты", size: 20, italics: true, color: colors.secondary })] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 Институциональные боты (Institutional Bots)")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Институциональные боты реализуют продвинутые стратегии, характерные для профессиональных участников рынка: маркет-мейкинг, статистический арбитраж, парный трейдинг, управление портфельным риском. Данные боты требуют более глубокой интеграции с рыночными данными и механизмами исполнения ордеров. Каждый институциональный бот использует модели, принятые в количественных хедж-фондах и проп-трейдинговых фирмах.", size: 24 })]
        }),

        // Institutional Bots Table
        new Table({
          columnWidths: [2000, 1200, 3200, 2960],
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Имя бота", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Код", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Стратегия", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Модель", bold: true, size: 22 })] })] }),
              ]
            }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Orion", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ARB", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Cross-Exchange Arbitrage", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Latency Arbitrage", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Spectrum", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PAR", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Pairs Trading / Statistical Arb", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Cointegration + Kalman", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Reed", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "STA", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Statistical Trading", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ornstein-Uhlenbeck", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Architect", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MMK", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Market Making", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Avellaneda-Stoikov", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Equilibrist", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MRB", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Mean Reversion Basket", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Multi-Asset OU", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Kron", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TRF", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Transfer / Rebalancing", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TWAP/VWAP Execution", size: 22 })] })] }),
            ]}),
          ]
        }),
        new Paragraph({ spacing: { before: 100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Таблица 1.2 — Институциональные боты", size: 20, italics: true, color: colors.secondary })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.3 Частотные боты (Frequency Bots) — НОВЫЕ ИМЕНА")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Частотные боты классифицируются по временному горизонту удержания позиций и частоте торговых операций. Предлагаются следующие имена и коды, отражающие функциональное назначение каждого бота. Имена выбраны в соответствии с мифологической и астрономической тематикой платформы, сохраняя консистентность с существующими ботами (Orion, Argus, Kron).", size: 24 })]
        }),

        // Frequency Bots Table
        new Table({
          columnWidths: [2200, 1200, 2400, 3560],
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Имя бота", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Код", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Частота", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Холдинг период", bold: true, size: 22 })] })] }),
              ]
            }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Helios", size: 22, bold: true })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "HFT", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "High Frequency", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "секунды — минуты", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Selene", size: 22, bold: true })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MFT", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Medium Frequency", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "15 мин — 4 часа", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Atlas", size: 22, bold: true })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "LFT", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Low Frequency", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1 день — 2 недели", size: 22 })] })] }),
            ]}),
          ]
        }),
        new Paragraph({ spacing: { before: 100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Таблица 1.3 — Частотные боты (предлагаемые имена)", size: 20, italics: true, color: colors.secondary })] }),
        
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [
            new TextRun({ text: "Обоснование имён:", bold: true, size: 24 }),
            new TextRun({ text: " Helios (Гелиос) — греческий бог солнца, символизирует максимальную скорость и интенсивность, соответствует высокочастотной торговле с молниеносным исполнением. Selene (Селена) — греческая богиня луны, представляет средний цикл между днём и ночью, отражая промежуточный временной горизонт MFT-бота. Atlas (Атлас) — титан, держащий небесный свод, символизирует долгосрочные позиции и устойчивость, что соответствует LFT-стратегиям с длительным удержанием.", size: 24 })
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.4 Интеграционные боты (Integration Bots)")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Интеграционные боты обеспечивают связь между торговой системой и внешними сервисами: чат-интерфейсами, системами уведомлений, внешними источниками данных. Oracle функционирует как интеллектуальный чат-бот для взаимодействия с пользователем. Lumi и Wolf представляют собой интеграционные модули для специфических внешних систем.", size: 24 })]
        }),

        // Integration Bots Table
        new Table({
          columnWidths: [2000, 1200, 6160],
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Имя бота", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Код", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Назначение", bold: true, size: 22 })] })] }),
              ]
            }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Oracle", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ORA", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Чат-бот интерфейс, AI-ассистент пользователя", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Lumi", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "LUM", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Интеграция с внешними источниками данных", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Wolf", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "WLF", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Алертная система, мониторинг рисков", size: 22 })] })] }),
            ]}),
          ]
        }),
        new Paragraph({ spacing: { before: 100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Таблица 1.4 — Интеграционные боты", size: 20, italics: true, color: colors.secondary })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.5 Аналитический бот LOGOS — НОВЫЙ")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "LOGOS — это новый интеллектуальный модуль, объединяющий функции аналитика и автономного трейдера. Название происходит от греческого «логос» (слово, разум, закон), символизируя рациональный подход к анализу рынка. LOGOS использует комбинацию классических статистических методов, генетических алгоритмов и машинного обучения для формирования торговых решений и рекомендаций.", size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Ключевые характеристики LOGOS: агрегация сигналов от всех ботов через оркестрационный слой, взвешивание сигналов на основе исторической точности, генерация мета-сигналов для других ботов, автономная торговля в режиме «paper trading» с последующим переходом в реальный режим после достижения целевых метрик. Код бота: LOG.", size: 24 })]
        }),

        // ===== SECTION 2: ETAP 1 =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. ЭТАП 1: ИНТЕГРАЦИОННАЯ АРХИТЕКТУРА")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 Оркестрационный слой")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Центральным элементом модернизации является создание оркестрационного слоя (Orchestration Layer), обеспечивающего единообразное взаимодействие между всеми компонентами системы. Оркестрационный слой реализует паттерн Message Broker, обеспечивая асинхронную коммуникацию через событийно-ориентированную модель. Каждый бот выступает как независимый микросервис, публикующий события и подписывающийся на релевантные топики.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("2.1.1 Выбор Message Broker")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Сравнительный анализ технологий message broker для оркестрационного слоя. Ключевыми критериями являются: пропускная способность, latency, надёжность доставки, поддержка сложной маршрутизации, простота интеграции с существующим стеком (Next.js, TypeScript, Node.js).", size: 24 })]
        }),

        // Message Broker Comparison Table
        new Table({
          columnWidths: [1800, 2100, 1800, 1800, 1860],
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Технология", bold: true, size: 20 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Latency", bold: true, size: 20 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Throughput", bold: true, size: 20 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Node.js SDK", bold: true, size: 20 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Рекомендация", bold: true, size: 20 })] })] }),
              ]
            }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NATS JetStream", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "< 100μs", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "> 10M msg/s", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Отличный", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "РЕКОМЕНДУЕТСЯ", bold: true, size: 20, color: "059669" })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "RabbitMQ", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "~ 1ms", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "> 1M msg/s", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Хороший", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Альтернатива", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Apache Kafka", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "~ 5ms", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "> 5M msg/s", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Хороший", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Избыточен", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Aeron", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "< 10μs", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "> 20M msg/s", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Сложный", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "HFT-оптимум", size: 20 })] })] }),
            ]}),
          ]
        }),
        new Paragraph({ spacing: { before: 100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Таблица 2.1 — Сравнение технологий Message Broker", size: 20, italics: true, color: colors.secondary })] }),
        
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Рекомендация: NATS JetStream является оптимальным выбором для институциональной торговой платформы. Сочетание ультранизкого latency (< 100μs), высокой пропускной способности и отличной интеграции с Node.js/TypeScript делает NATS идеальным решением. Для HFT-бота Helios возможно рассмотрение Aeron при необходимости субмикросекундного latency.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("2.1.2 Архитектура Event Bus")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Event Bus организован в виде иерархии топиков, отражающих функциональные домены системы. Каждый топик следует naming convention: <domain>.<entity>.<action>. Например: trading.btcusdt.signal.generated, risk.portfolio.drawdown.warning. Подписка осуществляется через wildcard паттерны: trading.*.signal.* для получения всех торговых сигналов.", size: 24 })]
        }),

        // Event Bus Topology Table
        new Table({
          columnWidths: [2800, 2600, 3960],
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Домен", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Пример топика", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Подписчики", bold: true, size: 22 })] })] }),
              ]
            }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "trading", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "trading.*.signal.*", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Все боты, LOGOS, Risk Manager", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "market", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "market.*.orderbook.update", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Helios, Architect, Argus", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "risk", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "risk.portfolio.*", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Wolf, Kron, все боты", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "execution", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "execution.order.filled", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Все активные боты, History", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "analytics", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "analytics.forecast.*", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Vision, LOGOS, UI Dashboard", size: 22 })] })] }),
            ]}),
          ]
        }),
        new Paragraph({ spacing: { before: 100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Таблица 2.2 — Топология Event Bus", size: 20, italics: true, color: colors.secondary })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 Унификация биржевых подключений")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Текущая система поддерживает 5 бирж: Binance, Bybit, OKX, Biteget, Bingx. Каждая биржа имеет уникальный API, что требует дублирования логики для каждой интеграции. Предлагается создание Unified Exchange Adapter (UEA), абстрагирующего различия между биржами и предоставляющего единый интерфейс для всех ботов.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("2.2.1 Unified Exchange Adapter")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "UEA реализует паттерн Abstract Factory, предоставляя фабрику адаптеров для каждой поддерживаемой биржи. Все адаптеры реализуют общий интерфейс IExchangeAdapter с методами: subscribeOrderbook, placeOrder, cancelOrder, getPositions, getBalance. Внутренняя реализация скрывает особенности REST/WebSocket API каждой биржи, нормализуя форматы данных в единую модель.", size: 24 })]
        }),

        // UEA Methods Table
        new Table({
          columnWidths: [2500, 3000, 3860],
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Метод", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Параметры", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Возвращаемое значение", bold: true, size: 22 })] })] }),
              ]
            }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "subscribeOrderbook", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "symbol, depth", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Observable<OrderbookSnapshot>", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "placeOrder", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "order: OrderRequest", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Promise<OrderResult>", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "cancelOrder", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "orderId, symbol", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Promise<boolean>", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "getPositions", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "symbol?", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Promise<Position[]>", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "getBalance", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "asset?", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Promise<Balance[]>", size: 20 })] })] }),
            ]}),
          ]
        }),
        new Paragraph({ spacing: { before: 100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Таблица 2.3 — Интерфейс IExchangeAdapter", size: 20, italics: true, color: colors.secondary })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 Мультибиржевой режим")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Мультибиржевой режим позволяет ботам одновременно торговать на нескольких биржах. Ключевые сценарии включают: арбитраж между биржами (Orion), агрегацию ликвидности для крупных ордеров (Kron), распределение позиций по биржам для снижения контрагентского риска (все боты). Реализация требует синхронизации балансов и позиций через единый Portfolio Manager.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.4 UI редизайн с трёхбуквенными кодами")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Пользовательский интерфейс требует унификации отображения ботов. Вместо длинных описательных имён предлагается использовать компактные трёхбуквенные коды, что обеспечит консистентность UI, ускорит визуальное сканирование списка ботов, упростит логирование и мониторинг. Sidebar должен отражать актуальную классификацию ботов по категориям.", size: 24 })]
        }),

        // UI Sidebar Structure
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("2.4.1 Структура Sidebar")] }),
        new Paragraph({
          spacing: { after: 100, line: 276 },
          children: [new TextRun({ text: "Предлагаемая иерархическая структура навигации:", size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 50, line: 276 },
          children: [new TextRun({ text: "Операционные боты:", bold: true, size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• MESH (GRD) — Grid Trading", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• SCALE (DCA) — Dollar Cost Averaging", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• BAND (BBB) — Bollinger Bands", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• EDGE (RNG) — Range Trading", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Argus (PND) — Pump & Dump Detection", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Vision (FCS) — Forecasting", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 50, line: 276 },
          children: [new TextRun({ text: "Институциональные боты:", bold: true, size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Orion (ARB) — Arbitrage", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Spectrum (PAR) — Pairs Trading", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Reed (STA) — Statistical Trading", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Architect (MMK) — Market Making", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Equilibrist (MRB) — Mean Reversion Basket", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Kron (TRF) — Transfer/Rebalancing", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 50, line: 276 },
          children: [new TextRun({ text: "Частотные боты:", bold: true, size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Helios (HFT) — High Frequency Trading", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Selene (MFT) — Medium Frequency Trading", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• Atlas (LFT) — Low Frequency Trading", size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 50, line: 276 },
          children: [new TextRun({ text: "Аналитический модуль:", bold: true, size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 30, line: 276 },
          indent: { left: 400 },
          children: [new TextRun({ text: "• LOGOS (LOG) — Analyst & Autonomous Trader", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.5 Выявление недостающих компонентов")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Анализ текущей архитектуры выявляет следующие отсутствующие компоненты, критичные для институционального уровня:", size: 24 })]
        }),

        // Missing Components Table
        new Table({
          columnWidths: [2500, 4500, 2360],
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Компонент", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Назначение", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Приоритет", bold: true, size: 22 })] })] }),
              ]
            }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Risk Manager", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Централизованное управление рисками портфеля", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "КРИТИЧЕСКИЙ", bold: true, size: 22, color: "DC2626" })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Compliance Module", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Соответствие регуляторным требованиям", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ВЫСОКИЙ", bold: true, size: 22, color: "D97706" })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Audit Logger", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Неизменяемый журнал всех торговых операций", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ВЫСОКИЙ", bold: true, size: 22, color: "D97706" })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Portfolio Manager", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Агрегация позиций и балансов со всех бирж", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ВЫСОКИЙ", bold: true, size: 22, color: "D97706" })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Notification Hub", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Централизованная система уведомлений", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "СРЕДНИЙ", bold: true, size: 22, color: "059669" })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Performance Analytics", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Расчёт метрик эффективности ботов", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "СРЕДНИЙ", bold: true, size: 22, color: "059669" })] })] }),
            ]}),
          ]
        }),
        new Paragraph({ spacing: { before: 100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Таблица 2.4 — Недостающие компоненты", size: 20, italics: true, color: colors.secondary })] }),

        // ===== SECTION 3: ETAP 2 =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. ЭТАП 2: МОДЕРНИЗАЦИЯ АЛГОРИТМОВ")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 Самообучаемые боты без нейронных сетей")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Ключевой принцип модернизации — создание самообучаемых ботов без использования нейронных сетей и глубокого обучения. Такой подход обеспечивает прозрачность принимаемых решений, воспроизводимость результатов, минимальные вычислительные требования и возможность интерпретации моделей. Для самообучения применяются методы классического машинного обучения и эволюционных алгоритмов.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("3.1.1 Генетические алгоритмы оптимизации параметров")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Каждый бот имеет множество параметров, влияющих на эффективность: размеры сетки для MESH (GRD), пороги RSI для BAND (BBB), периоды скользящих средних для Vision (FCS), и так далее. Генетический алгоритм автоматически оптимизирует эти параметры на основе исторических данных, постоянно адаптируясь к изменяющимся рыночным условиям.", size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Процесс эволюции параметров включает: инициализацию популяции случайных комбинаций параметров, оценку fitness-функции (Sharpe ratio, win rate, max drawdown) для каждой особи на backtest, селекцию лучших особей, кроссовер и мутацию для создания нового поколения, повторение цикла до сходимости. Оптимальные параметры автоматически применяются к боту после достижения целевых метрик.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("3.1.2 Классические ML-модели")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Для предсказания рыночных движений и классификации сигналов применяются интерпретируемые ML-модели без использования нейронных сетей:", size: 24 })]
        }),

        // ML Models Table
        new Table({
          columnWidths: [2200, 3000, 4160],
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Модель", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Применение", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Интеграция", bold: true, size: 22 })] })] }),
              ]
            }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "XGBoost", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Классификация сигналов BUY/SELL/HOLD", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Vision, LOGOS, все боты", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "GARCH", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Моделирование волатильности", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Risk Manager, Helios, Architect", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "k-means / DBSCAN", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Кластеризация рыночных режимов", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Reed, Spectrum, LOGOS", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "HMM", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Скрытые марковские модели", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Regime Detection, Atlas", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Kalman Filter", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Фильтрация шумов, оценка состояния", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Spectrum, Reed, Architect", size: 22 })] })] }),
            ]}),
          ]
        }),
        new Paragraph({ spacing: { before: 100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Таблица 3.1 — Классические ML-модели для самообучения", size: 20, italics: true, color: colors.secondary })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("3.1.3 Динамическое программирование")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Методы динамического программирования применяются для оптимизации последовательности торговых решений. В частности, Value Iteration и Policy Iteration используются для определения оптимальной стратегии управления позицией в зависимости от текущего состояния рынка. Q-learning (без нейронных сетей, табличный) применяется для обучения оптимальным действиям в дискретном пространстве состояний.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 Режим Demo/Paper Trading для обучения")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Все боты перед переходом в реальный режим должны пройти период обучения на демо-счёте. В течение этого периода собирается статистика, рассчитываются метрики эффективности, оптимизируются параметры. Переход в реальный режим осуществляется автоматически при достижении целевых показателей: Sharpe Ratio > 1.5, Win Rate > 55%, Max Drawdown < 10% за период не менее 30 календарных дней.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.3 LOGOS: Архитектура аналитического модуля")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "LOGOS представляет собой мета-бота, агрегирующего сигналы от всех остальных ботов и принимающего взвешенные решения на основе их качества. Архитектура LOGOS включает следующие компоненты:", size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 100, line: 276 },
          children: [new TextRun({ text: "Signal Aggregator — собирает сигналы от всех ботов через Event Bus, нормализует их в едином формате, рассчитывает веса на основе исторической точности каждого бота для данного рыночного режима.", size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 100, line: 276 },
          children: [new TextRun({ text: "Conflict Resolver — разрешает конфликты между противоречивыми сигналами, используя Bayesian Model Averaging для объединения распределений вероятностей.", size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 100, line: 276 },
          children: [new TextRun({ text: "Meta-Signal Generator — генерирует мета-сигналы более высокого порядка, учитывая корреляции между ботами и рыночными условиями.", size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 100, line: 276 },
          children: [new TextRun({ text: "Autonomous Executor — исполняет сигналы в автономном режиме с настраиваемым риск-менеджментом и ограничениями.", size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 100, line: 276 },
          children: [new TextRun({ text: "Performance Tracker — отслеживает эффективность собственных решений и решений других ботов, обновляет веса динамически.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.4 Развитие частотных ботов")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("3.4.1 Helios (HFT)")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Helios требует максимальной оптимизации для достижения субмиллисекундного latency. Текущая реализация на TypeScript/Node.js может быть дополнена Rust-модулями для критичных участков: парсинг WebSocket-сообщений, расчёт microstructure metrics, генерация сигналов. Альтернативно — использование Aeron для ультранизколатентного взаимодействия между компонентами.", size: 24 })]
        }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Ключевые алгоритмы Helios: 10-layer Confirmation Engine для фильтрации сигналов, Microstructure Analyzer для детекции iceberg orders и spoofing, VWAP/TWAP execution algorithms. Механизм самообучения: онлайн-оптимизация параметров confirmation engine на основе feedback от исполненных сделок.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("3.4.2 Selene (MFT)")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Selene реализует стратегии среднего временного горизонта с использованием Volume Profile, VWAP, и регис-детекции. Самообучение включает: адаптивную настройку VWAP deviation thresholds на основе волатильности, оптимизацию параметров Volume Profile (POC weight, Value Area), динамический выбор стратегии в зависимости от market regime.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("3.4.3 Atlas (LFT)")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Atlas фокусируется на долгосрочных позициях с использованием multi-timeframe analysis, trend following, и macro momentum. Самообучение включает: оптимизацию параметров trend confirmation (SMA periods, ADX thresholds), адаптацию pyramiding strategy на основе correlation analysis, интеграцию macro indicators (fear/greed, funding rates) с динамическими весами.", size: 24 })]
        }),

        // ===== SECTION 4: IMPLEMENTATION PLAN =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. ПЛАН РЕАЛИЗАЦИИ")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 Временные рамки")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Общий горизонт реализации: 12-18 месяцев с промежуточными milestone каждые 6 недель. Этап 1 занимает 6-9 месяцев, Этап 2 — 6-9 месяцев с возможностью параллельного выполнения некоторых задач.", size: 24 })]
        }),

        // Timeline Table
        new Table({
          columnWidths: [2000, 2500, 4860],
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Период", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Этап", bold: true, size: 22 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ключевые задачи", bold: true, size: 22 })] })] }),
              ]
            }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Недели 1-6", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Этап 1.1", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NATS JetStream интеграция, Event Bus", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Недели 7-12", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Этап 1.2", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Unified Exchange Adapter", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Недели 13-18", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Этап 1.3", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Risk Manager, Portfolio Manager", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Недели 19-24", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Этап 1.4", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "UI редизайн, интеграция ботов", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Недели 25-36", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Этап 2.1", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Генетические алгоритмы, ML pipeline", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Недели 37-48", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Этап 2.2", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "LOGOS, частотные боты, самообучение", size: 22 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Недели 49-72", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Этап 2.3", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Тестирование, оптимизация, продакшн", size: 22 })] })] }),
            ]}),
          ]
        }),
        new Paragraph({ spacing: { before: 100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Таблица 4.1 — План реализации", size: 20, italics: true, color: colors.secondary })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 Технологический стек")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Frontend сохраняется на Next.js 15 с TypeScript. Backend дополняется следующими технологиями: NATS JetStream (message broker), Python 3.11 (ML pipeline, генетические алгоритмы), Rust (опционально для HFT-компонентов), TimescaleDB (time-series данные), Redis (кэширование, real-time агрегации). Такое разделение обеспечивает оптимальное соотношение производительности и удобства разработки.", size: 24 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.3 Критерии успеха")] }),
        new Paragraph({
          spacing: { after: 150, line: 276 },
          children: [new TextRun({ text: "Критерии успеха для каждого этапа включают количественные метрики. Этап 1 считается успешным при: latency событий через Event Bus < 10ms, 100% интеграция всех ботов в Event Bus, успешное подключение всех 5 бирж через UEA, корректное отображение всех ботов в UI с трёхбуквенными кодами. Этап 2 считается успешным при: Sharpe Ratio каждого бота > 1.5 на backtest за 90 дней, автоматическая оптимизация параметров функционирует, LOGOS демонстрирует положительный PnL в paper trading режиме в течение 30 дней.", size: 24 })]
        }),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/z/my-project/download/CITARION_Architecture_Plan_v2.docx", buffer);
  console.log("Document created successfully!");
});
