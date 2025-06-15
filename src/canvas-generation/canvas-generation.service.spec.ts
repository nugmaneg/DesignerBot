import { CanvasGenerationService } from './canvas-generation.service';
import { S3Service } from '../s3/s3.service';
import { CanvasSettings } from '../canvas/canvas-settings.interface';
import * as sharp from 'sharp';

describe('CanvasGenerationService', () => {
    let service: CanvasGenerationService;
    let s3Service: jest.Mocked<S3Service>;

    beforeEach(() => {
        s3Service = {
            getObjectBuffer: jest.fn()
        } as any;

        service = new CanvasGenerationService(s3Service);
    });

    describe('generate', () => {
        it('should generate PNG Buffer with full-featured CanvasSettings', async () => {
            // Arrange
            const settings: CanvasSettings = {
                id: 'canvas-001',
                templateName: 'demo-template',
                templateId: 'template-001',
                templateVersion: '1.2',
                layersOrder: ['background.png', 'input_photo_1', 'input_text_1'],
                width: 600,
                height: 400,
                textPlacement: [{
                    textLayerName: 'input_text_1',
                    text: 'Тестовый текст!',
                    x: 120,
                    y: 90,
                    maxWidth: 320,
                    maxHeight: 120,
                    font: 'Arial',
                    fontSize: 28,
                    fontColor: '#222222',
                    align: 'center',
                    lineHeight: 1.4,
                    letterSpacing: 2,
                    textBaseline: 'middle',
                    shadowColor: '#ff00ff',
                    shadowOffsetX: 2,
                    shadowOffsetY: 2,
                    shadowBlur: 4,
                }],
                photoPlacement: [{
                    photoLayerName: 'input_photo_1',
                    photoPath: 'user-photo.jpg',
                    x: 50,
                    y: 80,
                    width: 200,
                    height: 180,
                    fit: 'cover',
                    anchor: 'center',
                    borderRadius: 12,
                }],
                previewFileName: 'preview.png',
            };

            // Мокаем буферы для S3-объектов (assets и пользовательское фото)
            const dummyPng = await sharp({
                create: { width: 600, height: 400, channels: 4, background: 'white' }
            }).png().toBuffer();
            const dummyJpg = await sharp({
                create: { width: 200, height: 180, channels: 3, background: 'gray' }
            }).jpeg().toBuffer();
            s3Service.getObjectBuffer = jest.fn()
                // background.png
                .mockResolvedValueOnce({ buffer: dummyPng })
                // user-photo.jpg
                .mockResolvedValueOnce({ buffer: dummyJpg });

            // Act
            const result = await service.generate(settings);

            // Assert
            expect(result).toBeInstanceOf(Buffer);

            // Проверка размеров PNG
            const image = sharp(result);
            const metadata = await image.metadata();
            expect(metadata.width).toBe(600);
            expect(metadata.height).toBe(400);

            // Можно временно сохранить для ручной проверки:
            // require('fs').writeFileSync('test-output.png', result);
        });
    });
});