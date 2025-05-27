import { Category } from '@prisma/client';

export const categoryDisplayNames: Record<Category, string> = {
    FOOTBALL: '⚽️ Футбол',
    HOCKEY: '🏒 Хоккей',
    BASKETBALL: '🏀 Баскетбол',
    VOLLEYBALL: '🏐 Волейбол',
    TENNIS: '🎾 Теннис',
    ESPORTS: '🎮 Киберспорт',
    BOXING: '🥊 Бокс',
    NEWS: '📰 Новости',
    LOTTERY: '🎰 Казино',
    OTHER: '🗂️ Другое',
};