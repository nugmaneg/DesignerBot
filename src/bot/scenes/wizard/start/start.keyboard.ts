import { Markup } from 'telegraf';

export const userStartWizardReplyKeyboard = Markup.keyboard([
    ['✨ Создать дизайн ✨'],
    ['⭐️ Избранное','Мои дизайны 🎨'],
]).resize().oneTime();

export const moderatorStartWizardReplyKeyboard = Markup.keyboard([
    ['✨ Создать дизайн ✨'],
    ['⭐️ Избранное','Мои дизайны 🎨'],
]).resize().oneTime();

export const adminStartWizardReplyKeyboard = Markup.keyboard([
    ['✨ Создать дизайн ✨'],
    ['⭐️ Избранное','Мои дизайны 🎨'],
]).resize().oneTime();