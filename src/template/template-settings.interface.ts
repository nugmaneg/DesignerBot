// src/template/template-settings.interface.ts
import {Category, Geo} from '@prisma/client';

export interface TemplateSettings {
    id: string;                   // uuid шаблона в базе данных
    slug: string; // Название шаблона
    version: string; // Версия шаблона
    description: string;
    supportedGeos: Geo[];
    categories: Category[];

    width: number;                 // ширина итогового изображения
    height: number;                // высота итогового изображения
    layersOrder: string[];         // имена файлов или маркеры ["assets/static/bg.jpg", "input_photo_main", …]

    textPlacement: Array<{
        textLayerName: string;
        x: number; y: number;                   // координата левого верхнего угла блока текста
        maxWidth: number; maxHeight?: number;
        font: string; fontSize: number; fontColor: string;
        align?: 'left' | 'center' | 'right';
        lineHeight?: number; letterSpacing?: number;      // промежуток между буквами (px)
        textBaseline?: 'top' | 'middle' | 'bottom'; // вертикальная привязка текста

        shadowColor?: string;        // цвет тени
        shadowOffsetX?: number;      // смещение тени по X
        shadowOffsetY?: number;      // смещение тени по Y
        shadowBlur?: number;         // радиус размытия тени
    }>;

    photoPlacement: Array<{
        photoLayerName: string;
        x: number;                   // X-координата области для фото
        y: number;                   // Y-координата области для фото
        width: number;               // ширина области для фото
        height: number;              // высота области для фото
        fit?: 'cover' | 'contain';   // способ масштабирования
        anchor?:                   // точка якоря внутри области
            | 'top'
            | 'bottom'
            | 'left'
            | 'right'
            | 'center';
        borderRadius?: number;
    }>;

    previewFileName: string;
}