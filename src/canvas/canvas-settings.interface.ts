export interface CanvasSettings {
    id: string;
    templateId: string;            // id шаблона в базе данных (для аудита и обратного поиска)
    templateSlug: string;          // человекочитаемое имя шаблона (для построения путей)
    templateVersion: string;       // версия шаблона (позволяет отслеживать актуальность структуры)

    width: number;                 // ширина итогового изображения
    height: number;                // высота итогового изображения
    layersOrder: string[];         // имена файлов или маркеры ["assets/static/bg.jpg", "input_photo_main", …]

    textPlacement: Array<{
        textLayerName: string;
        text?: string;
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
        x: number; y: number; width: number; height: number;
        fit?: 'cover' | 'contain';
        anchor?: 'top' | 'bottom' | 'left' | 'right' | 'center';
        borderRadius?: number;
    }>;

    previewFileName?: string;
    renders: { full: string; thumb: string };
}

export interface CreateCanvasSettingsInput {
    templateName: string;          // человекочитаемое имя шаблона (для построения путей)
    templateId: string;            // id шаблона в базе данных (для аудита и обратного поиска)
    templateVersion?: string;      // версия шаблона (позволяет отслеживать актуальность структуры)
    layersOrder: string[];         // имена файлов или маркеры 'input_photo' / 'input_text'
    width: number;                 // ширина итогового изображения
    height: number;                // высота итогового изображения

    textPlacement: [{
        textLayerName: string;
        text?: string;
        x: number;                   // координата левого верхнего угла блока текста
        y: number;                   // координата левого верхнего угла блока текста
        maxWidth: number;            // максимальная ширина текстового поля
        maxHeight: number;           // максимальная высота текстового поля
        font: string;
        fontWeight?: string;
        fontSize: number;
        fontColor: string;
        align?: 'left' | 'center' | 'right';
        lineHeight?: number;
        letterSpacing?: number;
        textBaseline?: 'top' | 'middle' | 'bottom';
        shadowColor?: string;
        shadowOffsetX?: number;
        shadowOffsetY?: number;
        shadowBlur?: number;
    }];

    photoPlacement: [{
        photoLayerName: string;
        photoPath?: string;
        x: number;
        y: number;
        width: number;
        height: number;
        fit?: 'cover' | 'contain';
        anchor?: 'top' | 'bottom' | 'left' | 'right' | 'center';
        borderRadius?: number;
    }];
}