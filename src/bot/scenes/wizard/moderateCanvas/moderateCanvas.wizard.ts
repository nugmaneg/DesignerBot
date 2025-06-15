import {
    Ctx,
    SceneEnter,
    Wizard,
    On,
    Action,
} from 'nestjs-telegraf';
import { CanvasService } from '../../../../canvas/canvas.service';
import { CanvasSettings } from '../../../../canvas/canvas-settings.interface';
import { WizardContext } from "telegraf/typings/scenes";
import {getInputPromptMessage} from "./moderateCanvas.messages";
import {Message} from "@telegraf/types/message";
import {CanvasGenerationService} from "../../../../canvas-generation/canvas-generation.service";
// import { CanvasGenerationService } from '../../../../canvas/canvas-generation.service';

type InputToFill = { type: 'photo' | 'text'; name: string; idx: number };

type ModerateSession = {
    canvasId: string;
    settings?: CanvasSettings;
    inputsToFill?: InputToFill[];
};

type ModerateCtx = WizardContext & { session: ModerateSession };

@Wizard('moderateCanvas')
export class ModerateCanvasWizard {
    constructor(
        private readonly canvasService: CanvasService,
        private readonly canvasGenerationService: CanvasGenerationService,
    ) {}

    /** На входе сцены: формируем очередь необходимых input и даём общее задание */
    @SceneEnter()
    async enter(@Ctx() ctx: ModerateCtx) {
        const canvasId = ctx.session.canvasId;
        if (!canvasId) {
            await ctx.reply('❌ Не найден идентификатор Canvas');
            return ctx.scene.leave();
        }

        const settings = await this.canvasService.getSettings(canvasId);
        ctx.session.settings = settings;
        ctx.session.inputsToFill = this.buildInputsQueue(settings);

        await this.sendInputPrompt(ctx);
    }

    /** Универсальный обработчик сообщений (фото/текст) */
    @On('message')
    async onMessage(@Ctx() ctx: ModerateCtx) {
        let { settings, inputsToFill = [], canvasId } = ctx.session;
        if (!settings) {
            await ctx.reply('Ошибка: отсутствуют настройки Canvas.');
            return;
        }
        if (!inputsToFill.length) {
            await ctx.reply('Все input уже получены! Ожидайте превью...');
            return;
        }
        const msg = ctx.message;
        if (!msg) {
            await ctx.reply('Некорректное действие.');
            return;
        }
        let filled = false;

        // 1. Обработка фото (приоритет: фото)
        if ('photo' in msg && Array.isArray(msg.photo) && msg.photo.length > 0) {
            // Берем по очереди столько фото, сколько ожидается и сколько отправлено (чаще всего одно)
            let photoCount = msg.photo.length;
            while (photoCount-- > 0) {
                const photoIdx = inputsToFill.findIndex(i => i.type === 'photo');
                if (photoIdx === -1) break;
                const fileId = msg.photo[photoCount].file_id;
                try {
                    const fileUrl = await ctx.telegram.getFileLink(fileId);
                    const response = await fetch(fileUrl.toString());
                    if (!response.ok) continue;
                    const buffer = Buffer.from(await response.arrayBuffer());
                    // Сохраняем фото input
                    const placementIdx = inputsToFill[photoIdx].idx;
                    let extension = 'jpg';
                    try {
                        const { fileTypeFromBuffer } = await import('file-type');
                        const type = await fileTypeFromBuffer(buffer);
                        if (type?.ext) extension = type.ext;
                    } catch {}
                    const filename = `${inputsToFill[photoIdx].name}.${extension}`;
                    await this.canvasService.saveInput(canvasId, inputsToFill[photoIdx].name, buffer);
                    if (settings?.photoPlacement?.[placementIdx]) {
                        settings.photoPlacement[placementIdx].photoPath = filename;
                    }
                    await this.canvasService.updateSettings(canvasId, { photoPlacement: settings.photoPlacement });
                    inputsToFill.splice(photoIdx, 1);
                    filled = true;
                } catch {}
            }
        }

        // 2. Обработка caption как текст (если есть)
        if ('caption' in msg && typeof msg.caption === 'string' && msg.caption.trim()) {
            filled = await this.handleTextInput(ctx, msg.caption.trim(), inputsToFill, settings, canvasId) || filled;
        } else if ('text' in msg && msg.text.trim()) {
            filled = await this.handleTextInput(ctx, msg.text.trim(), inputsToFill, settings, canvasId) || filled;
        }

        // Сохраняем новое состояние и выводим следующее задание, если надо
        if (filled) {
            ctx.session.settings = await this.canvasService.getSettings(canvasId);
            ctx.session.inputsToFill = this.buildInputsQueue(ctx.session.settings);

            if (ctx.session.inputsToFill.length === 0) {
                await ctx.reply('Все input получены. Генерируем превью...');
                try {
                    const previewBuffer = await this.canvasGenerationService.generate(ctx.session.settings!);
                    // сохраняем превью в S3 (опционально)
                    await this.canvasService.savePreview(canvasId, previewBuffer);
                    await ctx.replyWithPhoto({ source: previewBuffer }, { caption: 'Превью вашей работы:' });
                } catch (err) {
                    await ctx.reply('❌ Не удалось сгенерировать превью. Попробуйте позже.');
                    // Можно добавить логирование ошибки
                }
                // Ожидаем подтверждения или редактирования от пользователя
            } else {
                await this.sendInputPrompt(ctx);
            }
        } else {
            await ctx.reply('Пожалуйста, отправьте ожидаемые фото или текст.');
        }
    }

    private async handleTextInput(ctx: ModerateCtx, inputText: string, inputsToFill: InputToFill[], settings: CanvasSettings, canvasId: string): Promise<boolean> {
        const textIdx = inputsToFill.findIndex(i => i.type === 'text');
        if (textIdx === -1) return false;

        await this.canvasService.saveInput(canvasId, inputsToFill[textIdx].name, inputText);
        const placementIdx = inputsToFill[textIdx].idx;
        if (settings?.textPlacement?.[placementIdx]) {
            settings.textPlacement[placementIdx].text = inputText;
        }
        await this.canvasService.updateSettings(canvasId, { textPlacement: settings.textPlacement });
        inputsToFill.splice(textIdx, 1);
        return true;
    }

    /** Позволяет быстро собрать массив необходимых input для заполнения */
    private buildInputsQueue(settings: CanvasSettings): InputToFill[] {
        const queue: InputToFill[] = [];
        (settings.photoPlacement || []).forEach((p, idx) => {
            if (!p.photoPath) queue.push({ type: 'photo', name: p.photoLayerName, idx });
        });
        (settings.textPlacement || []).forEach((t, idx) => {
            if (!t.text) queue.push({ type: 'text', name: t.textLayerName, idx });
        });
        return queue;
    }

    private async sendInputPrompt(ctx: ModerateCtx) {
        const inputsToFill = ctx.session.inputsToFill || [];
        if (!inputsToFill.length) return;

        const { text, options } = getInputPromptMessage(inputsToFill);
        await ctx.reply(text, options);
    }

    // /** Редактирование фото */
    // @Action(/edit_photo_(\d+)/)
    // async onEditPhoto(@Ctx() ctx: ModerateCtx) {
    //     await ctx.answerCbQuery();
    //     const idx = parseInt(ctx.match[1], 10);
    //     ctx.session.inputsToFill = [{
    //         type: 'photo',
    //         name: ctx.session.settings.photoPlacement[idx].photoLayerName,
    //         idx,
    //     }];
    //     await ctx.reply(
    //         `Загрузите новое фото для: <b>${ctx.session.settings.photoPlacement[idx].photoLayerName}</b>`,
    //         { parse_mode: 'HTML' }
    //     );
    // }
    //
    // /** Редактирование текста */
    // @Action(/edit_text_(\d+)/)
    // async onEditText(@Ctx() ctx: ModerateCtx) {
    //     await ctx.answerCbQuery();
    //     const idx = parseInt(ctx.match[1], 10);
    //     ctx.session.inputsToFill = [{
    //         type: 'text',
    //         name: ctx.session.settings.textPlacement[idx].textLayerName,
    //         idx,
    //     }];
    //     await ctx.reply(
    //         `Введите новый текст для: <b>${ctx.session.settings.textPlacement[idx].textLayerName}</b>`,
    //         { parse_mode: 'HTML' }
    //     );
    // }

    /** Подтвердить результат */
    @Action('confirm_canvas')
    async onConfirm(@Ctx() ctx: ModerateCtx) {
        await ctx.answerCbQuery();
        await ctx.reply('🎨 Генерируем финальный файл...');
        const settings = await this.canvasService.getSettings(ctx.session.canvasId);
        try {
            const finalBuffer = await this.canvasGenerationService.generate(settings);
            // Сохраняем финал в S3 (если нужно)
            await this.canvasService.saveInput(ctx.session.canvasId, 'final.png', finalBuffer);
            await ctx.replyWithDocument({ source: finalBuffer, filename: 'canvas.png' }, { caption: 'Ваша итоговая работа готова!' });
        } catch (err) {
            await ctx.reply('❌ Не удалось сгенерировать итоговый файл. Попробуйте позже.');
            // Можно добавить логирование
        }
        await ctx.scene.leave();
    }

    /** Отмена создания */
    @Action('cancel_canvas')
    async onCancel(@Ctx() ctx: ModerateCtx) {
        await ctx.answerCbQuery();
        await ctx.reply('❌ Процесс создания холста отменён.');
        await ctx.scene.leave();
    }
}