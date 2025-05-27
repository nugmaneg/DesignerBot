import {Category, Geo, Template} from "@prisma/client";
import { Markup } from "telegraf";
import { geoDisplayNames } from "../../../ui/enums/geo.ui";
import { categoryDisplayNames } from "../../../ui/enums/category.ui";
import { InlineKeyboardButton } from "telegraf/types";

/**
 * Генерирует inline-клавиатуру для выбора страны.
 * @param geos - массив enum Geo (например, ['RU', 'MD', ...])
 * @returns InlineKeyboardMarkup для Telegram
 */
export function getGeoInlineKeyboard(geos: Geo[]) {
    return Markup.inlineKeyboard(
        geos.map((geo) => [
            Markup.button.callback(
                geoDisplayNames[geo],
                `choose_geo:${geo}`
            )
        ])
    );
}

/**
 * Генерирует inline-клавиатуру для выбора категории (две колонки) + кнопка "Посмотреть все"
 * @param categories - массив enum Category
 * @returns InlineKeyboardMarkup для Telegram
 */
export function getCategoryInlineKeyboard(categories: Category[]) {
    // Формируем кнопки по две в строке
    const categoryRows: InlineKeyboardButton[][] = [];
    for (let i = 0; i < categories.length; i += 2) {
        const row: InlineKeyboardButton[] = [
            Markup.button.callback(
                categoryDisplayNames[categories[i]],
                `choose_category:${categories[i]}`
            )
        ];
        if (categories[i + 1]) {
            row.push(
                Markup.button.callback(
                    categoryDisplayNames[categories[i + 1]],
                    `choose_category:${categories[i + 1]}`
                )
            );
        }
        categoryRows.push(row);
    }

    // Кнопка "Посмотреть все" в отдельной строке
    categoryRows.push([
        Markup.button.callback('👁️‍🗨️ Посмотреть все', 'choose_category:all')
    ]);

    return Markup.inlineKeyboard(categoryRows);
}

/**
 * Генерирует inline-клавиатуру для шаблонов (2 колонки) + пагинация.
 *
 * @param templates - шаблоны для текущей страницы
 * @param page - номер текущей страницы (начиная с 1)
 * @param totalPages - всего страниц
 */
export function getTemplateInlineKeyboard(
    templates: Template[],
    page: number,
    totalPages: number
) {
    const buttons: InlineKeyboardButton[][] = [];

    // Кнопки шаблонов (две в строке)
    for (let i = 0; i < templates.length; i += 2) {
        const row: InlineKeyboardButton[] = [
            Markup.button.callback(
                templates[i].title,
                `choose_template:${templates[i].id}`
            )
        ];
        if (templates[i + 1]) {
            row.push(
                Markup.button.callback(
                    templates[i + 1].title,
                    `choose_template:${templates[i + 1].id}`
                )
            );
        }
        buttons.push(row);
    }

    // Пагинация (если более 1 страницы)
    if (totalPages > 1) {
        const navRow: InlineKeyboardButton[] = [];
        if (page > 1) navRow.push(Markup.button.callback("⬅️ Назад", `templates_page:${page - 1}`));
        navRow.push(Markup.button.callback(`Стр. ${page}/${totalPages}`, "noop"));
        if (page < totalPages) navRow.push(Markup.button.callback("Вперёд ➡️", `templates_page:${page + 1}`));
        buttons.push(navRow);
    }

    return Markup.inlineKeyboard(buttons);
}

/**
 * Генерирует inline-клавиатуру для галереи шаблонов (один шаблон на экран)
 * @param index - текущий индекс (1-based)
 * @param total - всего шаблонов
 * @param templateId - id текущего шаблона
 */
export function getGalleryKeyboard(index: number, total: number, templateId: string) {
    const buttons: InlineKeyboardButton[] = [];

    if (index > 1)
        buttons.push(Markup.button.callback('⬅️', `templates_page:${index - 1}`));
    buttons.push(Markup.button.callback('✅ Выбрать', `choose_template:${templateId}`));
    if (index < total)
        buttons.push(Markup.button.callback('➡️', `templates_page:${index + 1}`));
    buttons.push(Markup.button.callback('🔙 Категории', 'back_to_categories'));

    return Markup.inlineKeyboard([buttons]);
}