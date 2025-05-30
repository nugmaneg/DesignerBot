export interface CanvasSettings {
    id: string;
    templateName: string;          // человекочитаемое имя шаблона (для построения путей)
    templateId: string;            // id шаблона в базе данных (для аудита и обратного поиска)
    templateVersion?: string;       // версия шаблона (позволяет отслеживать актуальность структуры)
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
        font: string,                 // Название шрифта
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

    photoPlacement: [{
        photoLayerName: string;
        photoPath?: string;
        x: number;                   // X-координата области для фото
        y: number;                   // Y-координата области для фото
        width: number;               // ширина области для фото
        height: number;              // высота области для фото
        fit?: 'cover' | 'contain';   // способ масштабирования
        anchor?:                     // точка якоря внутри области
            | 'top'
            | 'bottom'
            | 'left'
            | 'right'
            | 'center';
        borderRadius?: number;
    }];

    previewFileName?: string;          // preview-картинка
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