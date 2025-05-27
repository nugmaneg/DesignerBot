import {Action, Ctx, SceneEnter, Wizard, WizardStep,} from 'nestjs-telegraf';
import {WizardContext} from 'telegraf/typings/scenes';
import {Category, Geo, Template, User} from "@prisma/client";
import {getCategoryInlineKeyboard, getGalleryKeyboard, getGeoInlineKeyboard,} from './createCanvas.keyboard';
import {geoDisplayNames} from "../../../ui/enums/geo.ui";
import {CallbackQuery, InputMediaPhoto} from 'telegraf/types';
import {TemplateService} from "../../../../template/template.service";
import {buildTemplateCaption} from "./createCanvas.messages";


type CanvasSession = {
    country?: Geo;
    category?: Category;
    templateId?: string;
    templatePage?: number;
    templates?: Template[];
};

type CanvasCtx = WizardContext & { session: CanvasSession };

@Wizard('createCanvasWizard')
export class CreateCanvasWizard {
    private static readonly allCategories: Category[] = Object.values(Category) as Category[];

    constructor(private readonly templateService: TemplateService) {
    }

    @SceneEnter()
    async enter(@Ctx() ctx: CanvasCtx) {
        const dbUser: User = ctx.state.dbUser;
        const supportedGeos: Geo[] = dbUser.supportedGeos;

        if (!supportedGeos || supportedGeos.length === 0) {
            await ctx.reply('❌ У вас не настроены поддерживаемые страны. Обратитесь к администратору.');
            return ctx.scene.leave();
        }

        if (supportedGeos.length === 1) {
            ctx.session.country = supportedGeos[0];
            await ctx.reply(`Страна выбрана автоматически: ${geoDisplayNames[supportedGeos[0]]}`);
            return ctx.wizard.next();
        }

        await ctx.reply(
            'Пожалуйста, выберите страну для создания дизайна:',
            {reply_markup: getGeoInlineKeyboard(supportedGeos).reply_markup}
        );
    }

    @WizardStep(1)
    @Action(/^choose_geo:(.+)$/)
    async chooseCountry(@Ctx() ctx: CanvasCtx) {
        const callback = ctx.callbackQuery as CallbackQuery.DataQuery
        const country = callback.data.split(':')[1] as Geo;

        const dbUser: User = ctx.state.dbUser;
        const supportedGeos: Geo[] = dbUser.supportedGeos;

        if (!country || !supportedGeos.includes(country)) {
            await ctx.reply('❌ Пожалуйста, выберите страну из списка ниже.');
            return;
        }

        ctx.session.country = country;
        await ctx.answerCbQuery("Страна выбрана ✅", {cache_time: 5});

        const allCategories: Category[] = Object.values(Category) as Category[];
        await ctx.editMessageText(
            `Страна выбрана: ${geoDisplayNames[country]}\n\nТеперь выбери категорию дизайна:`,
            {reply_markup: getCategoryInlineKeyboard(allCategories).reply_markup}
        );
        ctx.wizard.next();
    }

    @WizardStep(2)
    @Action(/^choose_category:(.+)$/)
    async chooseCategory(@Ctx() ctx: CanvasCtx) {
        const callback = ctx.callbackQuery as CallbackQuery.DataQuery
        const data = callback.data.split(':')[1];

// 1. Если "all" — ищем только по geo
        if (data === 'all') {
            ctx.session.category = undefined; // явно убираем категорию
            ctx.session.templatePage = 1;
            // await ctx.answerCbQuery('Показаны все шаблоны ✅');
            ctx.wizard.next();
            await this.askTemplates(ctx);
            return;
        }

// 2. Валидация категории
        const category = data as Category;
        if (!category || !CreateCanvasWizard.allCategories.includes(category)) {
            await ctx.answerCbQuery('❌ Некорректная категория', {cache_time: 5});
            return;
        }

// 3. Найдена валидная категория — ищем по geo+category
        ctx.session.category = category;
        ctx.session.templatePage = 1;
        // await ctx.answerCbQuery('Категория выбрана ✅', {cache_time: 5});
        ctx.wizard.next();
        await this.askTemplates(ctx);
    }

    private async askTemplates(ctx: CanvasCtx, edit = false) {
        if (!ctx.session.templates) {
            ctx.session.templates = await this.loadTemplates(ctx);
        }

        if (ctx.session.templates.length === 0) {
            await ctx.answerCbQuery('Шаблоны не найдены, попробуйте выбрать другую категорию', {show_alert: true});
            ctx.session.templates = undefined;
            return ctx.wizard.back();
        }

        const template = this.getCurrentTemplate(ctx)!;
        const caption = buildTemplateCaption(template, ctx.session.templatePage!, ctx.session.templates.length);
        const keyboard = getGalleryKeyboard(ctx.session.templatePage!, ctx.session.templates.length, template.id).reply_markup;

        await this.sendOrEditMedia(ctx, template, caption, keyboard, edit);
        await ctx.deleteMessage();
    }

    private async loadTemplates(ctx: CanvasCtx): Promise<Template[]> {
        const geo = ctx.session.country!;
        const category = ctx.session.category;
        return this.templateService.findPublicByGeoAndCategory(geo, category);
    }

    private getCurrentTemplate(ctx: CanvasCtx): Template | undefined {
        const templates = ctx.session.templates!;
        const index = Math.min(Math.max(ctx.session.templatePage ?? 1, 1), templates.length) - 1;
        return templates[index];
    }

    private async sendOrEditMedia(ctx: CanvasCtx, template: Template, caption: string, keyboard: any, edit: boolean) {
        const chatId = ctx.chat?.id;
        const messageId = ctx.callbackQuery?.message?.message_id;

        const mediaInput = template.previewFileId
            ? template.previewFileId
            : {source: await this.templateService.getTemplatePreviewBuffer(template.id)};

        const media: InputMediaPhoto = {
            type: 'photo',
            media: mediaInput,
            caption,
            parse_mode: 'HTML'
        };

        try {
            if (edit && messageId) {
                await ctx.telegram.editMessageMedia(chatId, messageId, undefined, media, {reply_markup: keyboard});
            } else {
                const sentMsg = await ctx.replyWithPhoto(mediaInput, {caption, parse_mode: 'HTML', reply_markup: keyboard});
                if (!template.previewFileId && sentMsg.photo?.length) {
                    const fileId = sentMsg.photo[sentMsg.photo.length - 1].file_id;
                    await this.templateService.update(template.id, {previewFileId: fileId});
                }
            }
        } catch (error) {
            const sentMsg = await ctx.replyWithPhoto(mediaInput, {caption, parse_mode: 'HTML', reply_markup: keyboard});
            if (!template.previewFileId && sentMsg.photo?.length) {
                const fileId = sentMsg.photo[sentMsg.photo.length - 1].file_id;
                await this.templateService.update(template.id, {previewFileId: fileId});
            }
        }
    }

    @WizardStep(3)
    @Action(/^templates_page:(\d+)$/)
    async templatesPage(@Ctx() ctx: CanvasCtx) {
        const callback = ctx.callbackQuery as CallbackQuery.DataQuery;
        ctx.session.templatePage = Number(callback.data.split(":")[1]);
        await ctx.answerCbQuery();
        await this.askTemplates(ctx, true);
    }

    @WizardStep(3)
    @Action('back_to_categories')
    async backToCategories(@Ctx() ctx: CanvasCtx) {
        await ctx.answerCbQuery('Выберите категорию', { cache_time: 5 });
        ctx.session.templates = undefined;

        const allCategories = Object.values(Category) as Category[];

        await ctx.reply(
            'Выбери категорию дизайна',
            { reply_markup: getCategoryInlineKeyboard(allCategories).reply_markup },
        );

        const chatId = ctx.chat?.id;
        const messageId = ctx.callbackQuery?.message?.message_id;
        if (chatId && messageId) {
            await ctx.telegram.deleteMessage(chatId, messageId);
        }

        ctx.wizard.back();
    }
}