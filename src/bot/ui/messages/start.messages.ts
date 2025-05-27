export function getStartMessage(name: string): string {
    return (
        `<b>👋 Привет, ${name}!</b>\n` +
        `Я бот для автоматизации оформления постов.\n\n` +
        `<b>📋 Доступные команды:</b>\n` +
        `/create — создать пост\n` +
        `/my_canvas — ваши изображения\n` +
        `/help или /start — справка`
    )
}