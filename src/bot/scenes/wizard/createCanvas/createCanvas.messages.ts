
import { Template } from "@prisma/client";

/**
 * Формирует подпись под шаблоном для галереи выбора
 * @param template - объект шаблона
 * @param index - текущий индекс (1-based)
 * @param total - всего шаблонов
 */
export function buildTemplateCaption(template: Template, index: number, total: number) {
    const lines = [
        `<b>${template.title}</b>`,
        template.description ? `<i>${template.description}</i>` : null,
        `<code>${index} / ${total}</code>`
    ].filter(Boolean);

    return lines.join('\n');
}