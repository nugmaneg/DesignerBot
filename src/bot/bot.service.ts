import { Injectable } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import {SceneContext} from "telegraf/typings/scenes";
import {TemplateService} from "../template/template.service";

@Injectable()
export class BotService {

    constructor(private readonly templateService: TemplateService) {}

    /* DRY-метод для приветствия */
    async start(ctx: SceneContext) {
        await ctx.scene.enter('startWizard');
    }

    /* Отправка справки */
    async sendHelp(ctx: Context) {
        await ctx.reply(
            `Доступные команды:\n/start – начало\n/profile – профиль\n/help – справка`,
        );
    }

    async createCanvas(ctx: SceneContext) {
        await ctx.scene.enter('createCanvasWizard');
    }

    /* Обработка клика по элементу */
    async handleItemClick(ctx: Context, id: number) {
        // …логика получения данных…
        await ctx.reply(`Вы выбрали элемент #${id}`);
    }

    /* Пагинация – редактируем клаву */
    async updatePage(ctx: Context, page: number) {
        // …логика подбора новых кнопок…
        await ctx.editMessageReplyMarkup(
            Markup.inlineKeyboard([
                Markup.button.callback(`Страница ${page}`, 'noop'),
            ]).reply_markup,
        );
    }

    async onSyncPatterns(ctx: Context) {
        const sent = await ctx.reply("Синхронизация базы...")
        await this.templateService.syncPatterns()
        await ctx.telegram.editMessageText(ctx.chat?.id, sent.message_id, undefined, 'Готово ✅')

    }
}