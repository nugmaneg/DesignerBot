// src/bot/bot.update.ts
import {
    Update,        // помечает класс как контроллер Telegraf
    Start,
    Help,
    Command,
    On,
    Action,
    Hears,
    Ctx
} from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { SceneContext } from 'telegraf/typings/scenes';
import { BotService } from './bot.service';
import { Roles } from './decorators/roles.decorator';

@Update()
export class BotUpdate {
    constructor(private readonly botService: BotService) {}

    /* ───────────── PUBLIC COMMANDS ───────────── */

    // /start  →  мастер-сцена регистрации/онбординга
    @Start()
    async onStart(@Ctx() ctx: SceneContext) {
        return await this.botService.start(ctx);
    }

    // /help   →  просто справка
    @Help()
    async onHelp(@Ctx() ctx: Context) {
        console.log(ctx)
        return this.botService.sendHelp(ctx);
    }

    // /create → сцена создания холста
    @Command('create')
    async onProfile(@Ctx() ctx: SceneContext) {
        return this.botService.createCanvas(ctx);
    }

    // ✨ Создать дизайн ✨ → эквивалент /create
    @Hears('✨ Создать дизайн ✨')
    async onCreateDesign(@Ctx() ctx: SceneContext) {
        return this.botService.createCanvas(ctx);
    }


    /* ───────────── CALLBACK-ACTIONS ───────────── */

    // Нажатие на inline-кнопку  item:123
    @Action(/^item:\d+$/)
    async onItem(@Ctx() ctx: Context) {
        const data = (ctx.callbackQuery as any)?.data;
        const itemId = Number(data.match[0].split(':')[1]);
        await this.botService.handleItemClick(ctx, itemId);
        await ctx.answerCbQuery();
    }

    // Пагинация  page:N
    @Action(/^page:\d+$/)
    async onPage(@Ctx() ctx: Context) {
        const data = (ctx.callbackQuery as any)?.data;
        const page = Number(data.match[0].split(':')[1]);
        await this.botService.updatePage(ctx, page);
        await ctx.answerCbQuery();
    }

    /* ───────────── PROTECTED AREA (пример) ───────────── */

    // Команда /admin доступна только роли ADMIN
    @Command('admin')
    @Roles('ADMIN')
    async onAdmin(@Ctx() ctx: Context) {
        await ctx.reply('Админ-панель пока в разработке.');
    }

    @Command('sync_patterns')
    @Roles('ADMIN', 'FATHER')
    async onSyncPatterns(@Ctx() ctx: Context) {
        await this.botService.onSyncPatterns(ctx)
    }


    /* ───────────── FALLBACK ───────────── */

    // Любой текст, который не перехвачен выше и не внутри сцены
    @On('text')
    async onText(@Ctx() ctx: Context) {
        await ctx.reply('Команда не распознана. Наберите /help');
    }
}