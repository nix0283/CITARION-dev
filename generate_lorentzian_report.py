#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Аналитический отчёт: ML Lorentzian Classification для системы CITARION
"""

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import os

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))

# Register font families for bold
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Define colors
TABLE_HEADER_COLOR = colors.HexColor('#1F4E79')
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = colors.HexColor('#F5F5F5')

# Create document
doc = SimpleDocTemplate(
    "/home/z/my-project/download/ML_Lorentzian_Classification_Report.pdf",
    pagesize=A4,
    rightMargin=2*cm,
    leftMargin=2*cm,
    topMargin=2*cm,
    bottomMargin=2*cm,
    title='ML Lorentzian Classification для CITARION',
    author='Z.ai',
    creator='Z.ai',
    subject='Анализ возможностей интеграции Lorentzian Classification в торговую систему CITARION'
)

# Styles
styles = getSampleStyleSheet()

# Cover page styles
cover_title_style = ParagraphStyle(
    name='CoverTitle',
    fontName='Times New Roman',
    fontSize=28,
    leading=36,
    alignment=TA_CENTER,
    spaceAfter=30
)

cover_subtitle_style = ParagraphStyle(
    name='CoverSubtitle',
    fontName='Times New Roman',
    fontSize=16,
    leading=24,
    alignment=TA_CENTER,
    spaceAfter=48
)

cover_author_style = ParagraphStyle(
    name='CoverAuthor',
    fontName='Times New Roman',
    fontSize=12,
    leading=18,
    alignment=TA_CENTER,
    spaceAfter=12
)

# Body styles
heading1_style = ParagraphStyle(
    name='Heading1Custom',
    fontName='Times New Roman',
    fontSize=18,
    leading=24,
    alignment=TA_LEFT,
    spaceBefore=18,
    spaceAfter=12,
    textColor=colors.HexColor('#1F4E79')
)

heading2_style = ParagraphStyle(
    name='Heading2Custom',
    fontName='Times New Roman',
    fontSize=14,
    leading=20,
    alignment=TA_LEFT,
    spaceBefore=12,
    spaceAfter=8,
    textColor=colors.HexColor('#2E75B6')
)

heading3_style = ParagraphStyle(
    name='Heading3Custom',
    fontName='Times New Roman',
    fontSize=12,
    leading=16,
    alignment=TA_LEFT,
    spaceBefore=8,
    spaceAfter=6,
    textColor=colors.HexColor('#5B9BD5')
)

body_style = ParagraphStyle(
    name='BodyStyle',
    fontName='Times New Roman',
    fontSize=11,
    leading=16,
    alignment=TA_JUSTIFY,
    spaceAfter=8
)

# Table styles
header_style = ParagraphStyle(
    name='TableHeader',
    fontName='Times New Roman',
    fontSize=10,
    textColor=colors.white,
    alignment=TA_CENTER
)

cell_style = ParagraphStyle(
    name='TableCell',
    fontName='Times New Roman',
    fontSize=9,
    textColor=colors.black,
    alignment=TA_LEFT
)

cell_style_center = ParagraphStyle(
    name='TableCellCenter',
    fontName='Times New Roman',
    fontSize=9,
    textColor=colors.black,
    alignment=TA_CENTER
)

story = []

# ============== COVER PAGE ==============
story.append(Spacer(1, 120))
story.append(Paragraph("<b>ML Lorentzian Classification</b>", cover_title_style))
story.append(Paragraph("Анализ возможностей интеграции<br/>в торговую систему CITARION", cover_subtitle_style))
story.append(Spacer(1, 48))
story.append(Paragraph("Аналитический отчёт", cover_author_style))
story.append(Paragraph("TradingView Premium Indicator Analysis", cover_author_style))
story.append(Spacer(1, 60))
story.append(Paragraph("2025", cover_author_style))
story.append(PageBreak())

# ============== EXECUTIVE SUMMARY ==============
story.append(Paragraph("<b>1. Резюме</b>", heading1_style))
story.append(Paragraph(
    "ML Lorentzian Classification Premium представляет собой передовой индикатор машинного обучения "
    "для платформы TradingView, разработанный Justin Dehorty (jdehorty) совместно с командой AI Edge. "
    "Данный индикатор является результатом двух лет коллаборативной разработки с участием более 1000 "
    "бета-тестеров из сообщества TradingView и получил более 14000 активаций (boosts) на платформе.",
    body_style
))
story.append(Paragraph(
    "Основная ценность данного инструмента для системы CITARION заключается в уникальном подходе "
    "к классификации рыночных состояний с использованием расстояния Лоренца (Lorentzian Distance) "
    "вместо традиционного Евклидова расстояния. Это обеспечивает значительно более высокую устойчивость "
    "к выбросам (outliers) и лучшую адаптацию к нелинейным рыночным условиям.",
    body_style
))
story.append(Spacer(1, 12))

# ============== THEORETICAL BACKGROUND ==============
story.append(Paragraph("<b>2. Теоретические основы</b>", heading1_style))

story.append(Paragraph("<b>2.1 Расстояние Лоренца в машинном обучении</b>", heading2_style))
story.append(Paragraph(
    "В физике пространство Лоренца известно своей ролью в специальной теории относительности Эйнштейна, "
    "где метрика Лоренца описывает геометрию пространства-времени. В контексте машинного обучения "
    "расстояние Лоренца предлагает альтернативную метрику, которая обладает уникальными свойствами, "
    "делающими её особенно полезной для анализа финансовых временных рядов.",
    body_style
))
story.append(Paragraph(
    "Формула расстояния Лоренца между двумя векторами признаков a и b:",
    body_style
))
story.append(Paragraph(
    "<b>d(a,b) = Σ log(1 + |a<sub>i</sub> - b<sub>i</sub>|)</b>",
    ParagraphStyle(name='Formula', fontName='Times New Roman', fontSize=11, alignment=TA_CENTER, spaceBefore=8, spaceAfter=8)
))
story.append(Paragraph(
    "Ключевое отличие от Евклидова расстояния заключается в логарифмическом преобразовании разностей. "
    "Это означает, что большие различия в отдельных признаках не доминируют над суммарным расстоянием, "
    "что критически важно при работе с зашумлёнными финансовыми данными.",
    body_style
))
story.append(Spacer(1, 8))

story.append(Paragraph("<b>2.2 k-NN классификация в пространстве Лоренца</b>", heading2_style))
story.append(Paragraph(
    "Алгоритм k ближайших соседей (k-Nearest Neighbors) является одним из фундаментальных методов "
    "машинного обучения. Lorentzian Classification адаптирует этот подход, используя Approximate Nearest "
    "Neighbors (ANN) для эффективного поиска ближайших исторических паттернов в многомерном пространстве признаков.",
    body_style
))
story.append(Paragraph(
    "Процесс классификации включает следующие этапы: извлечение признаков из текущего рыночного состояния, "
    "вычисление расстояний Лоренца до всех исторических образцов в базе данных, выбор k ближайших соседей, "
    "и взвешенное голосование для определения прогнозируемого направления движения цены.",
    body_style
))
story.append(Spacer(1, 12))

# ============== PREMIUM FEATURES ==============
story.append(Paragraph("<b>3. Функциональные возможности Premium версии</b>", heading1_style))

story.append(Paragraph("<b>3.1 Базовые возможности (Free версия)</b>", heading2_style))

# Table: Free Features
free_features_data = [
    [Paragraph('<b>Компонент</b>', header_style), Paragraph('<b>Описание</b>', header_style), Paragraph('<b>Применимость</b>', header_style)],
    [Paragraph('Lorentzian k-NN', cell_style), Paragraph('Классификация с 4 базовыми признаками', cell_style), Paragraph('Высокая', cell_style_center)],
    [Paragraph('Фильтр волатильности', cell_style), Paragraph('Базовый ATR-фильтр', cell_style), Paragraph('Средняя', cell_style_center)],
    [Paragraph('Фильтр ADX', cell_style), Paragraph('Фильтр силы тренда', cell_style), Paragraph('Высокая', cell_style_center)],
    [Paragraph('Фильтр режима', cell_style), Paragraph('Определение тренда/флета', cell_style), Paragraph('Высокая', cell_style_center)],
    [Paragraph('Бэктестинг', cell_style), Paragraph('Встроенный Backtest Adapter', cell_style), Paragraph('Высокая', cell_style_center)],
]

free_table = Table(free_features_data, colWidths=[4*cm, 8*cm, 3*cm])
free_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(free_table)
story.append(Spacer(1, 6))
story.append(Paragraph("<i>Таблица 1. Базовые возможности индикатора</i>", ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)))
story.append(Spacer(1, 18))

story.append(Paragraph("<b>3.2 Расширенные возможности Premium версии</b>", heading2_style))
story.append(Paragraph(
    "Premium версия значительно расширяет функционал базового индикатора, добавляя продвинутые "
    "возможности для профессиональной торговли и более точного анализа рынка.",
    body_style
))

# Table: Premium Features
premium_features_data = [
    [Paragraph('<b>Функция</b>', header_style), Paragraph('<b>Описание</b>', header_style), Paragraph('<b>Ценность</b>', header_style)],
    [Paragraph('Расширенные признаки', cell_style), Paragraph('До 8+ пользовательских индикаторов в пространстве признаков', cell_style), Paragraph('Высокая', cell_style_center)],
    [Paragraph('Калибровка вероятностей', cell_style), Paragraph('Platt Scaling для калибровки confidence scores', cell_style), Paragraph('Критическая', cell_style_center)],
    [Paragraph('Einstein Extension', cell_style), Paragraph('Расширение пространства признаков с 4 до N измерений', cell_style), Paragraph('Высокая', cell_style_center)],
    [Paragraph('Фильтр-economic events', cell_style), Paragraph('Интеграция с экономическим календарём', cell_style), Paragraph('Средняя', cell_style_center)],
    [Paragraph('Session filters', cell_style), Paragraph('Фильтрация по торговым сессиям', cell_style), Paragraph('Высокая', cell_style_center)],
    [Paragraph('Kernel Regression', cell_style), Paragraph('Nadaraya-Watson для сглаживания сигналов', cell_style), Paragraph('Высокая', cell_style_center)],
]

premium_table = Table(premium_features_data, colWidths=[4*cm, 8*cm, 3*cm])
premium_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(premium_table)
story.append(Spacer(1, 6))
story.append(Paragraph("<i>Таблица 2. Расширенные возможности Premium версии</i>", ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)))
story.append(Spacer(1, 18))

# ============== CITARION INTEGRATION ==============
story.append(Paragraph("<b>4. Интеграция с системой CITARION</b>", heading1_style))

story.append(Paragraph("<b>4.1 Текущая реализация Lawrence Classifier</b>", heading2_style))
story.append(Paragraph(
    "В системе CITARION уже реализован модуль Lawrence Classifier (файл /src/lib/ml/lawrence-classifier.ts), "
    "который включает основные компоненты алгоритма: расчёт расстояния Лоренца, поиск ближайших соседей, "
    "нормализованные индикаторы (RSI, CCI, WaveTrend, ADX), а также фильтры волатильности, режима и ADX.",
    body_style
))
story.append(Paragraph(
    "Текущая реализация предоставляет функционал, эквивалентный базовой (free) версии индикатора "
    "TradingView. Для достижения parity с Premium версией необходимо реализовать дополнительные модули.",
    body_style
))
story.append(Spacer(1, 8))

story.append(Paragraph("<b>4.2 Рекомендуемые улучшения</b>", heading2_style))

# Implementation priorities
impl_data = [
    [Paragraph('<b>Приоритет</b>', header_style), Paragraph('<b>Модуль</b>', header_style), Paragraph('<b>Описание</b>', header_style), Paragraph('<b>Сложность</b>', header_style)],
    [Paragraph('P0', cell_style_center), Paragraph('Калибровка вероятностей', cell_style), Paragraph('Реализация Platt Scaling для корректных confidence scores', cell_style), Paragraph('Низкая', cell_style_center)],
    [Paragraph('P0', cell_style_center), Paragraph('Расширенные признаки', cell_style), Paragraph('Добавление пользовательских индикаторов в feature space', cell_style), Paragraph('Низкая', cell_style_center)],
    [Paragraph('P1', cell_style_center), Paragraph('Kernel Regression', cell_style), Paragraph('Nadaraya-Watson kernel для сглаживания предсказаний', cell_style), Paragraph('Средняя', cell_style_center)],
    [Paragraph('P1', cell_style_center), Paragraph('Session Filtering', cell_style), Paragraph('Фильтрация сигналов по торговым сессиям', cell_style), Paragraph('Низкая', cell_style_center)],
    [Paragraph('P2', cell_style_center), Paragraph('Einstein Extension', cell_style), Paragraph('Динамическое расширение пространства признаков', cell_style), Paragraph('Высокая', cell_style_center)],
    [Paragraph('P2', cell_style_center), Paragraph('Economic Calendar', cell_style), Paragraph('Интеграция с внешним календарём событий', cell_style), Paragraph('Средняя', cell_style_center)],
]

impl_table = Table(impl_data, colWidths=[2*cm, 4*cm, 7*cm, 2.5*cm])
impl_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(impl_table)
story.append(Spacer(1, 6))
story.append(Paragraph("<i>Таблица 3. Приоритеты интеграции</i>", ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)))
story.append(Spacer(1, 18))

# ============== ARCHITECTURE ==============
story.append(Paragraph("<b>5. Архитектурные рекомендации</b>", heading1_style))

story.append(Paragraph("<b>5.1 Модульная структура</b>", heading2_style))
story.append(Paragraph(
    "Для эффективной интеграции функционала Lorentzian Classification рекомендуется расширить "
    "существующую архитектуру ML-модулей CITARION следующими компонентами.",
    body_style
))

arch_data = [
    [Paragraph('<b>Модуль</b>', header_style), Paragraph('<b>Путь</b>', header_style), Paragraph('<b>Назначение</b>', header_style)],
    [Paragraph('Probability Calibrator', cell_style), Paragraph('/src/lib/ml/probability-calibrator.ts', cell_style), Paragraph('Платт-скейлинг и изотоническая регрессия', cell_style)],
    [Paragraph('Feature Extender', cell_style), Paragraph('/src/lib/ml/feature-extender.ts', cell_style), Paragraph('Динамическое расширение пространства признаков', cell_style)],
    [Paragraph('Kernel Smoother', cell_style), Paragraph('/src/lib/indicators/advanced/kernel-smoother.ts', cell_style), Paragraph('Nadaraya-Watson kernel regression', cell_style)],
    [Paragraph('Session Filter', cell_style), Paragraph('/src/lib/bot-filters/session-filter.ts', cell_style), Paragraph('Фильтрация по торговым сессиям', cell_style)],
    [Paragraph('Economic Filter', cell_style), Paragraph('/src/lib/bot-filters/economic-filter.ts', cell_style), Paragraph('Интеграция с экономическим календарём', cell_style)],
]

arch_table = Table(arch_data, colWidths=[4*cm, 6*cm, 5*cm])
arch_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(arch_table)
story.append(Spacer(1, 6))
story.append(Paragraph("<i>Таблица 4. Рекомендуемые модули</i>", ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)))
story.append(Spacer(1, 18))

# ============== CONCLUSION ==============
story.append(Paragraph("<b>6. Заключение и рекомендации</b>", heading1_style))
story.append(Paragraph(
    "ML Lorentzian Classification представляет значительную ценность для системы CITARION благодаря "
    "уникальному подходу к классификации рыночных состояний. Текущая реализация Lawrence Classifier "
    "уже охватывает основную функциональность алгоритма, однако для достижения полного соответствия "
    "с Premium версией TradingView рекомендуется реализация дополнительных модулей.",
    body_style
))
story.append(Paragraph(
    "Наиболее критичным улучшением является реализация калибровки вероятностей (Platt Scaling), "
    "которая позволит корректно интерпретировать confidence scores и использовать их для "
    "позиционирования и risk management. Вторым приоритетом является расширение пространства "
    "признаков для повышения точности классификации в различных рыночных условиях.",
    body_style
))
story.append(Paragraph(
    "Рекомендуется также изучить ресурсы AI Edge (https://ai-edge.io/docs), которые содержат "
    "подробную документацию по продвинутым техникам машинного обучения для трейдинга, включая "
    "практические руководства по интеграции Lorentzian Classification в автоматизированные "
    "торговые системы.",
    body_style
))
story.append(Spacer(1, 18))

# ============== REFERENCES ==============
story.append(Paragraph("<b>7. Источники</b>", heading1_style))
story.append(Paragraph("1. TradingView: ML Lorentzian Classification Premium — https://www.tradingview.com/script/Ts0sn9jl/", body_style))
story.append(Paragraph("2. TradingView: Machine Learning Lorentzian Classification (Free) — https://www.tradingview.com/script/WhBzgfDu/", body_style))
story.append(Paragraph("3. AI Edge Documentation — https://ai-edge.io/docs/category/getting-started", body_style))
story.append(Paragraph("4. ResearchGate: A new classification method by using Lorentzian distance metric (2023)", body_style))
story.append(Paragraph("5. CITARION Source: /src/lib/ml/lawrence-classifier.ts", body_style))
story.append(Paragraph("6. YouTube: Machine Learning Lorentzian Classification — jdehorty & team", body_style))

# Build document
doc.build(story)
print("PDF generated successfully!")
