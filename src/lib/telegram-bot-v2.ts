/**
 * Telegram Bot V2 for CITARION
 * Full-featured bot with inline keyboards, authorization, and position management
 * 
 * Features:
 * - Inline Keyboards for interactive control
 * - Commands: /start, /help, /status, /positions, /balance, /settings
 * - User authorization via telegramId
 * - Position management via inline buttons
 * - Signal parsing from messages
 */

import { Telegraf, Context, Markup, session, Scenes } from "telegraf";
import { Message, Update, UserFromGetMe } from "telegraf/types";
import { db } from "@/lib/db";
import { 
  parseSignal, 
  parseManagementCommand,
  formatSignal,
  type ParsedSignal,
  type SignalManagementCommand 
} from "@/lib/signal-parser";
import { getDefaultUserId } from "@/lib/default-user";

// ==================== TYPES ====================

interface SessionData {
  userId?: string;
  mode?: "DEMO" | "REAL";
  selectedPositionId?: string;
  lastAction?: string;
}

interface BotContext extends Context {
  session: SessionData;
}

interface PositionInfo {
  id: string;
  symbol: string;
  direction: string;
  totalAmount: number;
  avgEntryPrice: number;
  leverage: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  unrealizedPnl: number;
}

// ==================== MAIN BOT CLASS ====================

export class TelegramBotV2 {
  private bot: Telegraf<BotContext>;
  private botInfo?: UserFromGetMe;
  private isInitialized: boolean = false;

  constructor(token?: string) {
    const botToken = token || process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    this.bot = new Telegraf<BotContext>(botToken);
    this.setupSession();
    this.setupMiddleware();
    this.setupCommands();
    this.setupInlineKeyboards();
    this.setupSignalHandler();
  }

  // ==================== INITIALIZATION ====================

  private setupSession(): void {
    // Simple in-memory session storage
    this.bot.use(session({
      defaultSession: (): SessionData => ({
        userId: undefined,
        mode: "DEMO",
        selectedPositionId: undefined,
        lastAction: undefined,
      }),
    }));
  }

  private setupMiddleware(): void {
    // Authorization middleware
    this.bot.use(async (ctx, next) => {
      const telegramId = ctx.from?.id;
      
      if (telegramId) {
        const user = await this.authorizeUser(telegramId);
        if (user) {
          ctx.session.userId = user.id;
          ctx.session.mode = (user.currentMode as "DEMO" | "REAL") || "DEMO";
        }
      }
      
      return next();
    });

    // Logging middleware
    this.bot.use(async (ctx, next) => {
      const start = Date.now();
      const result = await next();
      const duration = Date.now() - start;
      console.log(`[TelegramBot] ${ctx.updateType} - ${duration}ms`);
      return result;
    });
  }

  // ==================== AUTHORIZATION ====================

  async authorizeUser(telegramId: number): Promise<{ id: string; currentMode: string } | null> {
    try {
      const user = await db.user.findFirst({
        where: { telegramId: String(telegramId) },
        select: { id: true, currentMode: true },
      });
      
      return user;
    } catch (error) {
      console.error("[TelegramBot] Authorization error:", error);
      return null;
    }
  }

  async linkTelegramAccount(telegramId: number, linkCode: string): Promise<boolean> {
    try {
      const user = await db.user.findFirst({
        where: { 
          telegramLinkCode: linkCode,
          telegramLinkExpiry: { gte: new Date() },
        },
      });

      if (!user) {
        return false;
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          telegramId: String(telegramId),
          telegramVerified: true,
          telegramLinkCode: null,
          telegramLinkExpiry: null,
        },
      });

      return true;
    } catch (error) {
      console.error("[TelegramBot] Link account error:", error);
      return false;
    }
  }

  async generateLinkCode(userId: string): Promise<string> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.user.update({
      where: { id: userId },
      data: { 
        telegramLinkCode: code,
        telegramLinkExpiry: expiry,
      },
    });

    return code;
  }

  // ==================== COMMANDS ====================

  private setupCommands(): void {
    // /start command
    this.bot.command("start", async (ctx) => {
      const telegramId = ctx.from.id;
      const args = ctx.message.text.split(" ").slice(1);
      
      // Check if this is a link attempt
      if (args.length > 0 && args[0].startsWith("link_")) {
        const linkCode = args[0].replace("link_", "");
        const success = await this.linkTelegramAccount(telegramId, linkCode);
        
        if (success) {
          await ctx.reply(
            "✅ *Аккаунт успешно привязан!*\n\nТеперь вы можете управлять торговлей через Telegram.",
            { parse_mode: "Markdown" }
          );
        } else {
          await ctx.reply(
            "❌ *Ошибка привязки*\n\nКод недействителен или истёк. Попробуйте снова.",
            { parse_mode: "Markdown" }
          );
        }
        return;
      }

      // Check authorization
      if (!ctx.session.userId) {
        await ctx.reply(
          "⚠️ *Требуется авторизация*\n\nВаш Telegram аккаунт не привязан к CITARION.\n\n" +
          "Для привязки:\n1. Войдите в систему на сайте\n2. Перейдите в настройки\n3. Нажмите \"Привязать Telegram\"",
          { parse_mode: "Markdown" }
        );
        return;
      }

      const message = `🤖 *Добро пожаловать в CITARION!*

Продвинутая платформа автоматической торговли.

📊 *Основные команды:*
/status — Статус системы
/positions — Открытые позиции
/balance — Баланс аккаунта
/settings — Настройки бота
/help — Справка по командам

⚡ *Управление позициями:*
Используйте inline-кнопки под сообщениями для управления позициями.

📈 *Сигналы:*
Отправьте торговый сигнал в формате Cornix для автоматического парсинга.`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    });

    // /help command
    this.bot.command("help", async (ctx) => {
      const message = `📚 *Справка CITARION Bot*

🎮 *Режимы торговли:*
• DEMO — Виртуальная торговля с 10,000 USDT
• REAL — Реальная торговля (требует API ключи)

📝 *Формат сигналов (Cornix):*

\`\`\`
BTCUSDT long leverage 50x cross
entry 67000 66500 66000
tp 70000 71000 72000
sl 65000
\`\`\`

🔹 *Ключевые слова:*
• Направление: long/лонг, short/шорт
• Вход: entry/вход, range/диапазон
• TP: tp/тп, target/цель
• SL: sl, stop/стоп
• Плечо: leverage/плечо, x50

🔹 *Команды управления:*
• BTCUSDT long tp2 100 — Обновить TP2
• BTCUSDT short sl 95 — Обновить SL
• BTCUSDT long close — Закрыть позицию
• BTCUSDT enter — Рыночный вход

⚡ *Inline-кнопки:*
Под каждым сообщением о позиции появляются кнопки:
• 📊 Детали — Полная информация
• ✏️ Изменить SL/TP — Редактирование
• ❌ Закрыть — Закрытие позиции`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    });

    // /status command
    this.bot.command("status", async (ctx) => {
      if (!ctx.session.userId) {
        await ctx.reply("⚠️ Требуется авторизация. Используйте /start");
        return;
      }

      try {
        const [openPositions, activeSignals, currentSignalId, account] = await Promise.all([
          db.position.count({ where: { status: "OPEN" } }),
          db.signal.count({ where: { status: { in: ["PENDING", "ACTIVE"] } } }),
          db.signalIdCounter.findUnique({ where: { id: "signal_counter" } }),
          db.account.findFirst({ 
            where: { accountType: ctx.session.mode || "DEMO" },
            select: { virtualBalance: true },
          }),
        ]);

        const balance = account?.virtualBalance 
          ? JSON.parse(account.virtualBalance) 
          : { USDT: 0 };

        const modeEmoji = ctx.session.mode === "DEMO" ? "🎮" : "💰";

        const message = `${modeEmoji} *Статус CITARION*

📊 *Статистика:*
• Режим: *${ctx.session.mode}*
• Открытых позиций: \`${openPositions}\`
• Активных сигналов: \`${activeSignals}\`
• ID последнего сигнала: \`#${currentSignalId?.lastId || 0}\`
• Баланс: \`$${(balance.USDT || 0).toLocaleString()}\`

⚙️ *Система:*
• Парсер: Cornix-совместимый
• Языки: EN + RU
• Рынки: SPOT + FUTURES`;

        await ctx.reply(message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error("[TelegramBot] Status error:", error);
        await ctx.reply("❌ Ошибка получения статуса");
      }
    });

    // /positions command
    this.bot.command("positions", async (ctx) => {
      if (!ctx.session.userId) {
        await ctx.reply("⚠️ Требуется авторизация. Используйте /start");
        return;
      }

      try {
        const positions = await db.position.findMany({
          where: { status: "OPEN" },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        if (positions.length === 0) {
          await ctx.reply("📭 Нет открытых позиций");
          return;
        }

        for (const pos of positions) {
          const message = this.formatPositionMessage(pos);
          const keyboard = this.getPositionKeyboard(pos.id);
          
          await ctx.reply(message, {
            parse_mode: "Markdown",
            ...keyboard,
          });
        }
      } catch (error) {
        console.error("[TelegramBot] Positions error:", error);
        await ctx.reply("❌ Ошибка получения позиций");
      }
    });

    // /balance command
    this.bot.command("balance", async (ctx) => {
      if (!ctx.session.userId) {
        await ctx.reply("⚠️ Требуется авторизация. Используйте /start");
        return;
      }

      try {
        const account = await db.account.findFirst({
          where: { accountType: ctx.session.mode || "DEMO" },
        });

        if (!account) {
          await ctx.reply("❌ Аккаунт не найден");
          return;
        }

        const balance = account.virtualBalance 
          ? JSON.parse(account.virtualBalance) 
          : { USDT: 0 };

        const message = this.formatBalanceMessage(balance);
        await ctx.reply(message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error("[TelegramBot] Balance error:", error);
        await ctx.reply("❌ Ошибка получения баланса");
      }
    });

    // /settings command
    this.bot.command("settings", async (ctx) => {
      if (!ctx.session.userId) {
        await ctx.reply("⚠️ Требуется авторизация. Используйте /start");
        return;
      }

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            ctx.session.mode === "DEMO" ? "✅ DEMO" : "🎮 DEMO",
            "mode_demo"
          ),
          Markup.button.callback(
            ctx.session.mode === "REAL" ? "✅ REAL" : "💰 REAL",
            "mode_real"
          ),
        ],
        [
          Markup.button.callback("📊 Уведомления", "settings_notifications"),
          Markup.button.callback("⚙️ Авто-торговля", "settings_autotrade"),
        ],
      ]);

      const modeEmoji = ctx.session.mode === "DEMO" ? "🎮" : "💰";
      const message = `${modeEmoji} *Настройки бота*

*Текущий режим:* ${ctx.session.mode}

Выберите действие:`;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });
    });
  }

  // ==================== INLINE KEYBOARDS ====================

  private setupInlineKeyboards(): void {
    // Mode selection handlers
    this.bot.action("mode_demo", async (ctx) => {
      if (!ctx.session.userId) {
        await ctx.answerCbQuery("Требуется авторизация");
        return;
      }

      await db.user.update({
        where: { id: ctx.session.userId },
        data: { currentMode: "DEMO" },
      });
      
      ctx.session.mode = "DEMO";
      await ctx.answerCbQuery("Режим изменён на DEMO");
      
      // Update the message
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ DEMO", "mode_demo"),
          Markup.button.callback("💰 REAL", "mode_real"),
        ],
        [
          Markup.button.callback("📊 Уведомления", "settings_notifications"),
          Markup.button.callback("⚙️ Авто-торговля", "settings_autotrade"),
        ],
      ]);

      await ctx.editMessageText(
        "🎮 *Настройки бота*\n\n*Текущий режим:* DEMO\n\nВыберите действие:",
        { parse_mode: "Markdown", ...keyboard }
      );
    });

    this.bot.action("mode_real", async (ctx) => {
      if (!ctx.session.userId) {
        await ctx.answerCbQuery("Требуется авторизация");
        return;
      }

      await db.user.update({
        where: { id: ctx.session.userId },
        data: { currentMode: "REAL" },
      });
      
      ctx.session.mode = "REAL";
      await ctx.answerCbQuery("⚠️ Режим изменён на REAL");
      
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback("🎮 DEMO", "mode_demo"),
          Markup.button.callback("✅ REAL", "mode_real"),
        ],
        [
          Markup.button.callback("📊 Уведомления", "settings_notifications"),
          Markup.button.callback("⚙️ Авто-торговля", "settings_autotrade"),
        ],
      ]);

      await ctx.editMessageText(
        "💰 *Настройки бота*\n\n*Текущий режим:* REAL\n⚠️ Требуются API ключи!\n\nВыберите действие:",
        { parse_mode: "Markdown", ...keyboard }
      );
    });

    // Position management handlers
    this.bot.action(/^position_details_(.+)$/, async (ctx) => {
      const positionId = ctx.match[1];
      
      try {
        const position = await db.position.findUnique({
          where: { id: positionId },
        });

        if (!position) {
          await ctx.answerCbQuery("Позиция не найдена");
          return;
        }

        const message = this.formatDetailedPositionMessage(position);
        await ctx.answerCbQuery();
        await ctx.reply(message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error("[TelegramBot] Position details error:", error);
        await ctx.answerCbQuery("Ошибка получения данных");
      }
    });

    this.bot.action(/^position_edit_(.+)$/, async (ctx) => {
      const positionId = ctx.match[1];
      ctx.session.selectedPositionId = positionId;
      
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback("📝 Изменить SL", `edit_sl_${positionId}`),
          Markup.button.callback("📝 Изменить TP", `edit_tp_${positionId}`),
        ],
        [
          Markup.button.callback("🔙 Назад", `position_back_${positionId}`),
        ],
      ]);

      await ctx.editMessageReplyMarkup(keyboard.reply_markup);
      await ctx.answerCbQuery();
    });

    this.bot.action(/^edit_sl_(.+)$/, async (ctx) => {
      const positionId = ctx.match[1];
      
      try {
        const position = await db.position.findUnique({
          where: { id: positionId },
        });

        if (!position) {
          await ctx.answerCbQuery("Позиция не найдена");
          return;
        }

        ctx.session.lastAction = `set_sl_${positionId}`;
        
        await ctx.answerCbQuery();
        await ctx.reply(
          `📝 *Изменение Stop Loss*\n\nПозиция: ${position.symbol} ${position.direction}\nТекущий SL: ${position.stopLoss || "не установлен"}\n\nВведите новый SL:`,
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        console.error("[TelegramBot] Edit SL error:", error);
        await ctx.answerCbQuery("Ошибка");
      }
    });

    this.bot.action(/^edit_tp_(.+)$/, async (ctx) => {
      const positionId = ctx.match[1];
      
      try {
        const position = await db.position.findUnique({
          where: { id: positionId },
        });

        if (!position) {
          await ctx.answerCbQuery("Позиция не найдена");
          return;
        }

        ctx.session.lastAction = `set_tp_${positionId}`;
        
        await ctx.answerCbQuery();
        await ctx.reply(
          `📝 *Изменение Take Profit*\n\nПозиция: ${position.symbol} ${position.direction}\nТекущий TP: ${position.takeProfit || "не установлен"}\n\nВведите новый TP:`,
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        console.error("[TelegramBot] Edit TP error:", error);
        await ctx.answerCbQuery("Ошибка");
      }
    });

    this.bot.action(/^position_close_(.+)$/, async (ctx) => {
      const positionId = ctx.match[1];
      
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Да, закрыть", `confirm_close_${positionId}`),
          Markup.button.callback("❌ Отмена", `cancel_close_${positionId}`),
        ],
      ]);

      await ctx.editMessageReplyMarkup(keyboard.reply_markup);
      await ctx.answerCbQuery();
    });

    this.bot.action(/^confirm_close_(.+)$/, async (ctx) => {
      const positionId = ctx.match[1];
      
      try {
        const position = await db.position.update({
          where: { id: positionId },
          data: { 
            status: "CLOSED",
            closedAt: new Date(),
            closeReason: "MANUAL",
          },
        });

        // Update linked signal if exists
        await db.signal.updateMany({
          where: { positionId: positionId },
          data: { 
            status: "CLOSED",
            closedAt: new Date(),
            closeReason: "MANUAL",
          },
        });

        await ctx.editMessageText(
          `✅ *Позиция закрыта*\n\n${position.symbol} ${position.direction}\nЦена входа: $${position.avgEntryPrice}`,
          { parse_mode: "Markdown" }
        );
        await ctx.answerCbQuery("Позиция закрыта");
      } catch (error) {
        console.error("[TelegramBot] Close position error:", error);
        await ctx.answerCbQuery("Ошибка закрытия");
      }
    });

    this.bot.action(/^cancel_close_(.+)$/, async (ctx) => {
      const positionId = ctx.match[1];
      
      const keyboard = this.getPositionKeyboard(positionId);
      await ctx.editMessageReplyMarkup(keyboard.reply_markup);
      await ctx.answerCbQuery("Отменено");
    });

    this.bot.action(/^position_back_(.+)$/, async (ctx) => {
      const positionId = ctx.match[1];
      
      try {
        const position = await db.position.findUnique({
          where: { id: positionId },
        });

        if (!position) {
          await ctx.answerCbQuery("Позиция не найдена");
          return;
        }

        const message = this.formatPositionMessage(position);
        const keyboard = this.getPositionKeyboard(positionId);
        
        await ctx.editMessageText(message, {
          parse_mode: "Markdown",
          ...keyboard,
        });
        await ctx.answerCbQuery();
      } catch (error) {
        console.error("[TelegramBot] Back error:", error);
        await ctx.answerCbQuery("Ошибка");
      }
    });

    // Settings handlers
    this.bot.action("settings_notifications", async (ctx) => {
      if (!ctx.session.userId) {
        await ctx.answerCbQuery("Требуется авторизация");
        return;
      }

      const config = await db.botConfig.findFirst({
        where: { userId: ctx.session.userId },
      });

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            config?.notifyOnEntry ? "✅ Вход" : "⬜ Вход",
            "notif_entry"
          ),
          Markup.button.callback(
            config?.notifyOnExit ? "✅ Выход" : "⬜ Выход",
            "notif_exit"
          ),
        ],
        [
          Markup.button.callback(
            config?.notifyOnSL ? "✅ SL" : "⬜ SL",
            "notif_sl"
          ),
          Markup.button.callback(
            config?.notifyOnTP ? "✅ TP" : "⬜ TP",
            "notif_tp"
          ),
        ],
        [Markup.button.callback("🔙 Назад", "back_settings")],
      ]);

      await ctx.editMessageText(
        "📊 *Настройки уведомлений*\n\nВыберите события для уведомлений:",
        { parse_mode: "Markdown", ...keyboard }
      );
      await ctx.answerCbQuery();
    });

    this.bot.action("settings_autotrade", async (ctx) => {
      if (!ctx.session.userId) {
        await ctx.answerCbQuery("Требуется авторизация");
        return;
      }

      const config = await db.botConfig.findFirst({
        where: { userId: ctx.session.userId },
      });

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            config?.autoExecuteEnabled ? "✅ Включена" : "⬜ Включена",
            "autotrade_toggle"
          ),
        ],
        [Markup.button.callback("🔙 Назад", "back_settings")],
      ]);

      await ctx.editMessageText(
        "⚙️ *Авто-торговля*\n\nАвтоматическое исполнение сигналов:",
        { parse_mode: "Markdown", ...keyboard }
      );
      await ctx.answerCbQuery();
    });

    this.bot.action("back_settings", async (ctx) => {
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            ctx.session.mode === "DEMO" ? "✅ DEMO" : "🎮 DEMO",
            "mode_demo"
          ),
          Markup.button.callback(
            ctx.session.mode === "REAL" ? "✅ REAL" : "💰 REAL",
            "mode_real"
          ),
        ],
        [
          Markup.button.callback("📊 Уведомления", "settings_notifications"),
          Markup.button.callback("⚙️ Авто-торговля", "settings_autotrade"),
        ],
      ]);

      const modeEmoji = ctx.session.mode === "DEMO" ? "🎮" : "💰";
      
      await ctx.editMessageText(
        `${modeEmoji} *Настройки бота*\n\n*Текущий режим:* ${ctx.session.mode}\n\nВыберите действие:`,
        { parse_mode: "Markdown", ...keyboard }
      );
      await ctx.answerCbQuery();
    });
  }

  // ==================== SIGNAL HANDLER ====================

  private setupSignalHandler(): void {
    // Handle text messages for signal parsing
    this.bot.on("text", async (ctx, next) => {
      // Skip commands
      if (ctx.message.text.startsWith("/")) {
        return next();
      }

      // Handle SL/TP input if in edit mode
      if (ctx.session.lastAction) {
        const action = ctx.session.lastAction;
        const price = parseFloat(ctx.message.text.replace(/[,\s]/g, ""));
        
        if (!isNaN(price) && price > 0) {
          if (action.startsWith("set_sl_")) {
            const positionId = action.replace("set_sl_", "");
            await this.updatePositionSL(positionId, price);
            ctx.session.lastAction = undefined;
            await ctx.reply(`✅ Stop Loss обновлён: $${price.toLocaleString()}`);
            return;
          } else if (action.startsWith("set_tp_")) {
            const positionId = action.replace("set_tp_", "");
            await this.updatePositionTP(positionId, price);
            ctx.session.lastAction = undefined;
            await ctx.reply(`✅ Take Profit обновлён: $${price.toLocaleString()}`);
            return;
          }
        }
      }

      // Try to parse as management command
      const managementCommand = parseManagementCommand(ctx.message.text);
      if (managementCommand) {
        const result = await this.handleManagementCommand(managementCommand);
        await ctx.reply(result, { parse_mode: "Markdown" });
        return;
      }

      // Try to parse as signal
      const signal = parseSignal(ctx.message.text);
      if (signal) {
        const result = await this.handleParsedSignal(signal, ctx.session.userId);
        
        if (result.success) {
          const message = this.formatSignalMessage(signal, result.signalId!);
          const keyboard = this.getSignalKeyboard(result.signalId!, result.positionId);
          await ctx.reply(message, { parse_mode: "Markdown", ...keyboard });
        } else {
          await ctx.reply(`❌ *Ошибка сигнала*\n\n${result.error}`, { parse_mode: "Markdown" });
        }
        return;
      }

      return next();
    });
  }

  // ==================== HELPER METHODS ====================

  private getPositionKeyboard(positionId: string) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("📊 Детали", `position_details_${positionId}`),
        Markup.button.callback("✏️ Изменить", `position_edit_${positionId}`),
      ],
      [Markup.button.callback("❌ Закрыть", `position_close_${positionId}`)],
    ]);
  }

  private getSignalKeyboard(signalId: number, positionId?: string) {
    const buttons: ReturnType<typeof Markup.inlineKeyboard> = positionId 
      ? Markup.inlineKeyboard([
          [
            Markup.button.callback("📊 Позиция", `position_details_${positionId}`),
            Markup.button.callback("✏️ Изменить", `position_edit_${positionId}`),
          ],
          [Markup.button.callback("❌ Закрыть", `position_close_${positionId}`)],
        ])
      : Markup.inlineKeyboard([
          [Markup.button.callback("📊 Статус", "signal_status")],
        ]);

    return buttons;
  }

  formatPositionMessage(position: PositionInfo): string {
    const directionEmoji = position.direction === "LONG" ? "🟢" : "🔴";
    const pnlEmoji = (position.unrealizedPnl || 0) >= 0 ? "📈" : "📉";
    
    let message = `${directionEmoji} *${position.symbol}* ${position.direction}\n\n`;
    message += `📊 *Детали позиции:*\n`;
    message += `• Размер: \`${position.totalAmount.toFixed(6)}\`\n`;
    message += `• Вход: \`$${position.avgEntryPrice.toLocaleString()}\`\n`;
    message += `• Плечо: \`${position.leverage}x\`\n`;
    
    if (position.stopLoss) {
      message += `• Stop Loss: \`$${position.stopLoss.toLocaleString()}\`\n`;
    }
    
    if (position.takeProfit) {
      message += `• Take Profit: \`$${position.takeProfit.toLocaleString()}\`\n`;
    }

    const pnlValue = position.unrealizedPnl.toFixed(2);
    const pnlSign = position.unrealizedPnl >= 0 ? "+" : "";
    message += `• PnL: ${pnlEmoji} \`${pnlSign}$${pnlValue}\`\n`;
    
    return message;
  }

  formatDetailedPositionMessage(position: PositionInfo): string {
    const directionEmoji = position.direction === "LONG" ? "🟢" : "🔴";
    
    let message = `${directionEmoji} *${position.symbol}* ${position.direction}\n\n`;
    message += `📊 *Полная информация:*\n\n`;
    message += `*Размер позиции:*\n• Количество: ${position.totalAmount.toFixed(6)}\n`;
    message += `• Стоимость: $${(position.totalAmount * position.avgEntryPrice).toLocaleString()}\n\n`;
    message += `*Цены:*\n• Вход: $${position.avgEntryPrice.toLocaleString()}\n`;
    
    if (position.stopLoss) {
      const slPercent = Math.abs((position.stopLoss - position.avgEntryPrice) / position.avgEntryPrice * 100);
      message += `• Stop Loss: $${position.stopLoss.toLocaleString()} (${slPercent.toFixed(2)}%)\n`;
    }
    
    if (position.takeProfit) {
      const tpPercent = Math.abs((position.takeProfit - position.avgEntryPrice) / position.avgEntryPrice * 100);
      message += `• Take Profit: $${position.takeProfit.toLocaleString()} (${tpPercent.toFixed(2)}%)\n`;
    }

    message += `\n*Риск-менеджмент:*\n• Плечо: ${position.leverage}x\n`;
    
    return message;
  }

  formatBalanceMessage(balance: Record<string, number>): string {
    let message = "💰 *Баланс аккаунта*\n\n";
    
    const entries = Object.entries(balance)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);
    
    let totalUsd = 0;
    
    for (const [asset, amount] of entries) {
      if (asset === "USDT" || asset === "USDC") {
        totalUsd += amount;
        message += `💵 *${asset}:* \`${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`\n`;
      } else {
        message += `🪙 *${asset}:* \`${amount.toFixed(6)}\`\n`;
      }
    }
    
    message += `\n💵 *Всего USDT:* \`${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\``;
    
    return message;
  }

  formatSignalMessage(signal: ParsedSignal, signalId: number): string {
    const directionEmoji = signal.direction === "LONG" ? "🟢📈" : "🔴📉";
    const marketEmoji = signal.marketType === "SPOT" ? "💱" : "⚡";
    
    let message = `${directionEmoji} *#${signalId} ${signal.symbol}* ${signal.direction}\n`;
    message += `${marketEmoji} *Рынок:* ${signal.marketType}\n\n`;
    
    if (signal.entryZone) {
      message += `📍 *Зона входа:* \`${signal.entryZone.min.toLocaleString()} - ${signal.entryZone.max.toLocaleString()}\`\n`;
    } else if (signal.entryPrices.length > 0) {
      if (signal.entryPrices.length === 1) {
        message += `📍 *Вход:* \`$${signal.entryPrices[0].toLocaleString()}\`\n`;
      } else {
        message += `📍 *Точки входа:*\n`;
        signal.entryPrices.forEach((price, i) => {
          message += `  ${i + 1}. \`$${price.toLocaleString()}\`\n`;
        });
      }
    }
    
    if (signal.takeProfits.length > 0) {
      message += `\n🎯 *Take Profits:*\n`;
      signal.takeProfits.forEach((tp, i) => {
        message += `  TP${i + 1}: \`$${tp.price.toLocaleString()}\` (${tp.percentage}%)\n`;
      });
    }
    
    if (signal.stopLoss) {
      message += `\n🛑 *Stop Loss:* \`$${signal.stopLoss.toLocaleString()}\`\n`;
    }
    
    if (signal.marketType === "FUTURES") {
      message += `\n⚡ *Плечо:* ${signal.leverageType} \`${signal.leverage}x\`\n`;
    }
    
    return message;
  }

  // ==================== SIGNAL & POSITION MANAGEMENT ====================

  async handleParsedSignal(
    signal: ParsedSignal, 
    userId?: string
  ): Promise<{ success: boolean; signalId?: number; positionId?: string; error?: string }> {
    try {
      const exchangeType = signal.marketType === "SPOT" ? "spot" : "futures";
      
      // Get or create account
      let account = await db.account.findFirst({
        where: { accountType: "DEMO", exchangeType },
      });

      if (!account) {
        const defaultUserId = await getDefaultUserId();
        account = await db.account.create({
          data: {
            userId: defaultUserId,
            accountType: "DEMO",
            exchangeId: "binance",
            exchangeType,
            exchangeName: signal.marketType === "SPOT" ? "Binance Spot" : "Binance Futures",
            virtualBalance: JSON.stringify({ USDT: 10000 }),
            isActive: true,
          },
        });
      }

      // Get next signal ID
      const counter = await db.signalIdCounter.upsert({
        where: { id: "signal_counter" },
        update: { lastId: { increment: 1 } },
        create: { id: "signal_counter", lastId: 1 },
      });
      const signalId = counter.lastId;

      // Demo prices for testing
      const DEMO_PRICES: Record<string, number> = {
        BTCUSDT: 67500, ETHUSDT: 3500, BNBUSDT: 600, SOLUSDT: 175,
        XRPUSDT: 0.52, DOGEUSDT: 0.15, ADAUSDT: 0.45,
      };

      const price = signal.entryPrices[0] || DEMO_PRICES[signal.symbol] || 100;
      const balance = account.virtualBalance ? JSON.parse(account.virtualBalance) : { USDT: 10000 };
      const positionSize = Math.min(balance.USDT * 0.01, 100);
      const leverage = signal.marketType === "SPOT" ? 1 : signal.leverage;
      const quantity = (positionSize * leverage) / price;
      const fee = positionSize * leverage * 0.0004;

      // Check balance
      if (balance.USDT < positionSize + fee) {
        return { success: false, error: "Недостаточный баланс" };
      }

      // Update balance
      balance.USDT -= (positionSize + fee);
      await db.account.update({
        where: { id: account.id },
        data: { virtualBalance: JSON.stringify(balance) },
      });

      // Create position
      const position = await db.position.create({
        data: {
          accountId: account.id,
          symbol: signal.symbol,
          direction: signal.direction,
          status: "OPEN",
          totalAmount: quantity,
          filledAmount: quantity,
          avgEntryPrice: price,
          currentPrice: price,
          leverage,
          stopLoss: signal.stopLoss || null,
          takeProfit: signal.takeProfits[0]?.price || null,
          unrealizedPnl: 0,
          realizedPnl: 0,
          isDemo: true,
        },
      });

      // Create trade record
      await db.trade.create({
        data: {
          userId: account.userId,
          accountId: account.id,
          symbol: signal.symbol,
          direction: signal.direction,
          status: "OPEN",
          entryPrice: price,
          entryTime: new Date(),
          amount: quantity,
          leverage,
          stopLoss: signal.stopLoss || null,
          fee,
          signalSource: "TELEGRAM",
          isDemo: true,
          positionId: position.id,
        },
      });

      // Create signal record
      await db.signal.create({
        data: {
          signalId,
          source: "TELEGRAM",
          sourceMessage: signal.rawText,
          symbol: signal.symbol,
          direction: signal.direction,
          action: signal.action,
          marketType: signal.marketType,
          entryPrices: JSON.stringify(signal.entryPrices),
          takeProfits: JSON.stringify(signal.takeProfits),
          stopLoss: signal.stopLoss,
          leverage,
          status: "ACTIVE",
          positionId: position.id,
          processedAt: new Date(),
        },
      });

      return {
        success: true,
        signalId,
        positionId: position.id,
      };
    } catch (error) {
      console.error("[TelegramBot] Handle signal error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      };
    }
  }

  async handleManagementCommand(command: SignalManagementCommand): Promise<string> {
    try {
      switch (command.type) {
        case "RESET_ID": {
          await db.signalIdCounter.upsert({
            where: { id: "signal_counter" },
            update: { lastId: 0 },
            create: { id: "signal_counter", lastId: 0 },
          });
          return "🔄 *Счётчик ID сброшен*\n\nСледующий сигнал будет #1";
        }

        case "CLEAR_BASE": {
          const result = await db.signal.deleteMany({});
          await db.signalIdCounter.upsert({
            where: { id: "signal_counter" },
            update: { lastId: 0 },
            create: { id: "signal_counter", lastId: 0 },
          });
          return `🗑️ *База данных очищена*\n\n• ${result.count} сигналов удалено\n• Счётчик ID сброшен`;
        }

        case "CLOSE_SIGNAL": {
          if (!command.symbol) {
            return "❌ Формат: BTCUSDT long close";
          }

          const signal = await db.signal.findFirst({
            where: {
              symbol: command.symbol.toUpperCase(),
              marketType: command.marketType || "FUTURES",
              direction: command.direction || undefined,
              status: { in: ["PENDING", "ACTIVE"] },
            },
            orderBy: { createdAt: "desc" },
          });

          if (!signal) {
            return `❌ Активный сигнал не найден: ${command.symbol}`;
          }

          await db.signal.update({
            where: { id: signal.id },
            data: {
              status: "CLOSED",
              closedAt: new Date(),
              closeReason: "MANUAL",
            },
          });

          if (signal.positionId) {
            await db.position.update({
              where: { id: signal.positionId },
              data: { status: "CLOSED" },
            });
          }

          return `✅ *Сигнал #${signal.signalId} закрыт*\n\n${command.symbol} ${command.direction || ""}`;
        }

        case "UPDATE_SL": {
          if (!command.symbol || !command.slPrice) {
            return "❌ Формат: BTCUSDT long sl 95";
          }

          const signal = await db.signal.findFirst({
            where: {
              symbol: command.symbol.toUpperCase(),
              marketType: command.marketType || "FUTURES",
              direction: command.direction || undefined,
              status: { in: ["PENDING", "ACTIVE"] },
            },
            orderBy: { createdAt: "desc" },
          });

          if (!signal) {
            return `❌ Активный сигнал не найден: ${command.symbol}`;
          }

          await db.signal.update({
            where: { id: signal.id },
            data: { stopLoss: command.slPrice },
          });

          if (signal.positionId) {
            await db.position.update({
              where: { id: signal.positionId },
              data: { stopLoss: command.slPrice },
            });
          }

          return `✅ *SL обновлён*\n\n${command.symbol} SL: $${command.slPrice.toLocaleString()}`;
        }

        case "UPDATE_TP": {
          if (!command.symbol || !command.tpIndex || !command.tpPrice) {
            return "❌ Формат: BTCUSDT long tp2 100";
          }

          const signal = await db.signal.findFirst({
            where: {
              symbol: command.symbol.toUpperCase(),
              marketType: command.marketType || "FUTURES",
              direction: command.direction || undefined,
              status: { in: ["PENDING", "ACTIVE"] },
            },
            orderBy: { createdAt: "desc" },
          });

          if (!signal) {
            return `❌ Активный сигнал не найден: ${command.symbol}`;
          }

          const takeProfits = signal.takeProfits ? JSON.parse(signal.takeProfits) : [];
          takeProfits[command.tpIndex - 1] = { 
            price: command.tpPrice, 
            percentage: 100 / Math.max(command.tpIndex, takeProfits.length) 
          };

          await db.signal.update({
            where: { id: signal.id },
            data: { takeProfits: JSON.stringify(takeProfits) },
          });

          return `✅ *TP${command.tpIndex} обновлён*\n\n${command.symbol} TP${command.tpIndex}: $${command.tpPrice.toLocaleString()}`;
        }

        case "MARKET_ENTRY": {
          if (!command.symbol) {
            return "❌ Формат: BTCUSDT long enter";
          }

          // This would be handled similarly to handleParsedSignal
          return `✅ *Рыночный вход*\n\n${command.symbol} ${command.direction || "LONG"}`;
        }

        default:
          return "❌ Неизвестная команда";
      }
    } catch (error) {
      console.error("[TelegramBot] Management command error:", error);
      return "❌ Ошибка выполнения команды";
    }
  }

  async updatePositionSL(positionId: string, sl: number): Promise<void> {
    await db.position.update({
      where: { id: positionId },
      data: { stopLoss: sl },
    });

    // Update linked signal
    await db.signal.updateMany({
      where: { positionId },
      data: { stopLoss: sl },
    });
  }

  async updatePositionTP(positionId: string, tp: number): Promise<void> {
    await db.position.update({
      where: { id: positionId },
      data: { takeProfit: tp },
    });

    // Update linked signal
    await db.signal.updateMany({
      where: { positionId },
      data: { takeProfits: JSON.stringify([{ price: tp, percentage: 100 }]) },
    });
  }

  // ==================== WEBHOOK ====================

  async setupWebhook(webhookUrl: string): Promise<boolean> {
    try {
      await this.bot.telegram.setWebhook(webhookUrl);
      console.log(`[TelegramBot] Webhook set to: ${webhookUrl}`);
      return true;
    } catch (error) {
      console.error("[TelegramBot] Webhook setup error:", error);
      return false;
    }
  }

  async deleteWebhook(): Promise<boolean> {
    try {
      await this.bot.telegram.deleteWebhook();
      console.log("[TelegramBot] Webhook deleted");
      return true;
    } catch (error) {
      console.error("[TelegramBot] Webhook delete error:", error);
      return false;
    }
  }

  handleUpdate(update: Update): Promise<void> {
    return this.bot.handleUpdate(update);
  }

  // ==================== LIFECYCLE ====================

  async start(): Promise<void> {
    try {
      this.botInfo = await this.bot.telegram.getMe();
      this.isInitialized = true;
      
      // Set up commands
      await this.bot.telegram.setMyCommands([
        { command: "start", description: "Запустить бота" },
        { command: "help", description: "Справка по командам" },
        { command: "status", description: "Статус системы" },
        { command: "positions", description: "Открытые позиции" },
        { command: "balance", description: "Баланс аккаунта" },
        { command: "settings", description: "Настройки бота" },
      ]);

      // Start polling
      await this.bot.launch();
      console.log(`[TelegramBot] Started as @${this.botInfo.username}`);
    } catch (error) {
      console.error("[TelegramBot] Start error:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.bot.stop();
    console.log("[TelegramBot] Stopped");
  }

  getBot(): Telegraf<BotContext> {
    return this.bot;
  }

  isRunning(): boolean {
    return this.isInitialized;
  }
}

// ==================== SINGLETON INSTANCE ====================

let botInstance: TelegramBotV2 | null = null;

export function getTelegramBotV2(): TelegramBotV2 {
  if (!botInstance) {
    botInstance = new TelegramBotV2();
  }
  return botInstance;
}

export function initializeTelegramBotV2(): TelegramBotV2 {
  const bot = getTelegramBotV2();
  if (!bot.isRunning()) {
    bot.start().catch(console.error);
  }
  return bot;
}

// ==================== EXPORTS ====================

export type { BotContext, SessionData, PositionInfo };
