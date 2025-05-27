// src/template/template-settings.interface.ts
import { Geo, Category } from '@prisma/client';

export interface TemplateSettings {
    id: string;                   // uuid шаблона в базе данных
    title: string;
    description: string;
    supportedGeos: Geo[];
    categories: Category[];
    layersOrder: Array<string>;    // имена файлов или маркеры 'input_photo' / 'input_text'
    width: number;                 // ширина итогового изображения
    height: number;                // высота итогового изображения
    font: string;                  // файл шрифта внутри assets

    textPlacement: [{
        textLayerName: string;
        x: number;                   // координата левого верхнего угла блока текста
        y: number;                   // координата левого верхнего угла блока текста
        maxWidth: number;            // максимальная ширина текстового поля
        maxHeight?: number;          // максимальная высота текстового поля
        fontSize: number;            // стартовый размер шрифта (px)
        fontColor: string;           // цвет текста
        align?: 'left' | 'center' | 'right';
        lineHeight?: number;         // множитель между строками
        letterSpacing?: number;      // промежуток между буквами (px)
        textBaseline?: 'top' | 'middle' | 'bottom'; // вертикальная привязка текста
        shadowColor?: string;        // цвет тени
        shadowOffsetX?: number;      // смещение тени по X
        shadowOffsetY?: number;      // смещение тени по Y
        shadowBlur?: number;         // радиус размытия тени
    }];

    photoPlacement?: [{
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
    }];
}