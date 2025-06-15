import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { CanvasSettings } from '../canvas/canvas-settings.interface';
import * as sharp from 'sharp';
// --- Типы для слоёв ---
type Layer = Buffer | { buffer: Buffer; left: number; top: number };

function isPositionedLayer(layer: Layer): layer is { buffer: Buffer; left: number; top: number } {
    return (
        typeof layer === 'object' &&
        layer !== null &&
        'buffer' in layer &&
        'left' in layer &&
        'top' in layer
    );
}

@Injectable()
export class CanvasGenerationService {
    private readonly logger = new Logger(CanvasGenerationService.name);

    constructor(
        private readonly s3Service: S3Service,
    ) {}

    /**
     * Генерация итогового изображения по CanvasSettings
     * @param settings
     */
    async generate(settings: CanvasSettings): Promise<Buffer> {
        // 1. Проверка входных параметров
        if (!settings || !settings.layersOrder || !settings.width || !settings.height) {
            throw new Error('Некорректные параметры settings для генерации canvas');
        }

        // 2. Создаём холст-основу
        let canvas = sharp({
            create: {
                width: settings.width,
                height: settings.height,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 0 } // Прозрачный фон
            }
        });

        // 3. Подготавливаем все ресурсы для слоёв
        const layers: Layer[] = [];
        for (const layerName of settings.layersOrder) {
            if (layerName.endsWith('.png') || layerName.endsWith('.jpg') || layerName.endsWith('.jpeg')) {
                // Слой-asset из шаблона (фон, оверлей и т.д.)
                const assetPath = `templates/${settings.templateName}/assets/${layerName}`;
                const assetBuf = await this.safeS3Get(assetPath, `${layerName} (asset)`);
                layers.push(assetBuf);
            } else if (layerName.startsWith('input_photo')) {
                // Фото пользователя
                const inputKey = layerName;
                const photoPlacement = settings.photoPlacement?.find(p => p.photoLayerName === inputKey);
                if (photoPlacement && photoPlacement.photoPath) {
                    const photoPath = `canvases/${settings.id}/inputs/${photoPlacement.photoPath}`;
                    let userPhoto = await this.safeS3Get(photoPath, `${layerName} (input_photo)`);
                    // Масштабирование, если требуется
                    if (photoPlacement.width && photoPlacement.height && photoPlacement.x !== undefined && photoPlacement.y !== undefined) {
                        userPhoto = await sharp(userPhoto)
                            .resize({
                                width: photoPlacement.width,
                                height: photoPlacement.height,
                                fit: 'cover',
                                position: 'center'
                            }).toBuffer();
                    }
                    // На этом этапе userPhoto - уже нужный слой, наложим позже
                    layers.push({
                        buffer: userPhoto,
                        left: photoPlacement.x || 0,
                        top: photoPlacement.y || 0,
                    });
                }
            } else if (layerName.startsWith('input_text')) {
                // Текстовый слой пользователя
                const textKey = layerName;
                const textPlacement = settings.textPlacement?.find(t => t.textLayerName === textKey);
                if (textPlacement && textPlacement.text) {
                    // Используем async вызов buildSVGTextLayer
                    const svgText = await this.buildSVGTextLayer(
                        { ...textPlacement, text: textPlacement.text ?? '' },
                        settings.templateName
                    );
                    const svgBuffer = Buffer.from(svgText);
                    layers.push({
                        buffer: svgBuffer,
                        left: textPlacement.x || 0,
                        top: textPlacement.y || 0,
                    });
                }
            } else {
                this.logger.warn(`Неизвестный слой в layersOrder: ${layerName}`);
            }
        }

        // 4. Собираем итоговое изображение по слоям (слой за слоем)
        const composite: Array<{ input: Buffer, top: number, left: number }> = [];
        for (const layer of layers) {
            if (Buffer.isBuffer(layer)) {
                composite.push({ input: layer, top: 0, left: 0 });
            } else if (isPositionedLayer(layer)) {
                composite.push({ input: layer.buffer, top: layer.top, left: layer.left });
            }
        }

        canvas = canvas.composite(composite);

        // 5. Возвращаем финальный буфер
        return await canvas.png().toBuffer();
    }

    /** Безопасно получить файл из S3, иначе бросить ошибку с подробностями */
    private async safeS3Get(key: string, comment?: string): Promise<Buffer> {
        try {
            const { buffer } = await this.s3Service.getObjectBuffer(key);
            return buffer;
        } catch (e) {
            this.logger.error(`Ошибка загрузки из S3 ${comment ? `[${comment}]` : ''}: ${key}`);
            throw e;
        }
    }

    /** Генерация SVG-слоя для текста (для sharp composite) */
    private async buildSVGTextLayer(
        tp: {
            text: string;
            x: number;
            y: number;
            maxWidth: number;
            maxHeight: number;
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
        },
        templateName: string
    ): Promise<string> {
        const width = tp.maxWidth;
        const height = tp.maxHeight;
        const fontSize = tp.fontSize > 0 ? tp.fontSize : 20;
        const color = tp.fontColor || '#000000';
        const fontFamily = tp.font || 'Arial';
        const fontWeight = tp.fontWeight || 'normal';
        const align = tp.align || 'left';
        const lineHeight = tp.lineHeight || 1.2;
        const letterSpacing = tp.letterSpacing || 0;
        const textBaseline = tp.textBaseline || 'middle';

        // ===== 1. Качаем шрифт из S3 =====
        // Предполагаемая структура: s3://templates/{templateName}/fonts/{tp.font}
        const fontKey = `templates/${templateName}/fonts/${tp.font}`;
        const fontBuffer = await this.safeS3Get(fontKey, `font ${tp.font}`);
        const fontBase64 = fontBuffer.toString('base64');

        // SVG filter для тени
        let shadowFilter = '';
        let filterAttr = '';
        if (tp.shadowColor || tp.shadowOffsetX || tp.shadowOffsetY || tp.shadowBlur) {
            shadowFilter = `
        <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="${tp.shadowOffsetX || 0}" dy="${tp.shadowOffsetY || 0}" stdDeviation="${tp.shadowBlur || 0}" flood-color="${tp.shadowColor || '#000'}"/>
        </filter>`;
            filterAttr = `filter="url(#textShadow)"`;
        }

        // Перенос строк (упрощённый, для production потребуется учитывать метрики текста)
        const lines = tp.text ? tp.text.split('\n') : [''];
        const tspanYStart = fontSize * (textBaseline === 'top' ? 1 : textBaseline === 'bottom' ? lines.length * lineHeight : 0.5 + (lines.length - 1) * lineHeight / 2);

        const tspans = lines.map((line, idx) =>
            `<tspan x="${align === 'center' ? width / 2 : align === 'right' ? width - 10 : 10}"
            y="${fontSize + idx * fontSize * lineHeight}"
            ${letterSpacing ? `letter-spacing="${letterSpacing}"` : ''}
        >${this.escapeXML(line)}</tspan>`
        ).join('');

        // Фоновое подключение шрифта — как и было ранее
        // ...

        // ===== 2. Подключаем шрифт через data-URL =====
        return `
<svg width="${width}" height="${height}">
    <style>
        @font-face {
            font-family: '${fontFamily}';
            src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
            font-weight: ${fontWeight};
        }
        .text {
            font-size: ${fontSize!}px;
            fill: ${color};
            font-family: '${fontFamily}', Arial, sans-serif;
            font-weight: ${fontWeight};
            dominant-baseline: ${textBaseline};
            text-anchor: ${align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'};
            line-height: ${lineHeight};
            ${letterSpacing ? `letter-spacing: ${letterSpacing}px;` : ''}
        }
    </style>
    ${shadowFilter}
    <text class="text" x="${align === 'center' ? width / 2 : align === 'right' ? width - 10 : 10}" y="${fontSize}" ${filterAttr}>${tspans}</text>
</svg>
    `;
    }

    /** Экранирование для XML (SVG) */
    private escapeXML(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}