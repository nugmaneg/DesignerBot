// src/template/canvas.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { CanvasRepository } from '../database/canvas.repository';
import { S3Service } from '../s3/s3.service';
import {CanvasSettings, CreateCanvasSettingsInput} from './canvas-settings.inteface';
import { Canvas, Prisma } from '@prisma/client';

@Injectable()
export class CanvasService {
    constructor(
        private readonly canvasRepo: CanvasRepository,
        private readonly s3Service: S3Service,
    ) {}

    /** Получить Canvas из базы */
    findById(id: string): Promise<Canvas | null> {
        return this.canvasRepo.findById(id);
    }

    /** Создать Canvas: запись в БД и settings.json в S3 */
    async createCanvas(
        data: Prisma.CanvasCreateInput,
        input: CreateCanvasSettingsInput
    ): Promise<Canvas> {
        // 1. Сначала создаём запись в БД (там генерируется UUID)
        const canvas = await this.canvasRepo.create(data);

        // 2. Сохраняем settings.json в S3
        const settings: CanvasSettings = {
            id: canvas.id,
            templateName: input.templateName,
            templateId: input.templateId,
            templateVersion: input.templateVersion,
            layersOrder: input.layersOrder,
            width: input.width,
            height: input.height,
            textPlacement: input.textPlacement,
            photoPlacement: input.photoPlacement,
            // previewFileName будет добавлен позже
        };
        await this.s3Service.putJson(`canvases/${canvas.id}/settings.json`, settings);

        return canvas;
    }

    /** Обновить settings.json (например, при добавлении input’а или превью) */
    async updateSettings(canvasId: string, patch: Partial<CanvasSettings>): Promise<void> {
        const key = `canvases/${canvasId}/settings.json`;
        const settings = await this.s3Service.getJson<CanvasSettings>(key);
        if (!settings) throw new NotFoundException('Canvas settings not found');
        const newSettings = { ...settings, ...patch };
        await this.s3Service.putJson(key, newSettings);
    }

    /** Добавить input (фото/текст) для Canvas */
    async saveInput(canvasId: string, inputName: string, value: Buffer | string): Promise<void> {
        const key = Buffer.isBuffer(value)
            ? `canvases/${canvasId}/inputs/${inputName}.jpg`
            : `canvases/${canvasId}/inputs/${inputName}.txt`;

        await this.s3Service.uploadFile({
            key,
            body: Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf-8'),
            contentType: Buffer.isBuffer(value) ? 'image/jpeg' : 'text/plain',
        });

        // Обновляем settings.json
        const settingsKey = `canvases/${canvasId}/settings.json`;
        const settings = await this.s3Service.getJson<CanvasSettings>(settingsKey);
        if (!settings) throw new NotFoundException('Canvas settings not found');

        if (Buffer.isBuffer(value)) {
            // Фото: обновляем photoPath в нужном объекте photoPlacement
            if (!settings.photoPlacement) throw new NotFoundException('photoPlacement not defined in settings');
            const photoObj = settings.photoPlacement.find(obj => obj.photoLayerName === inputName);
            if (!photoObj) throw new NotFoundException(`photoLayerName ${inputName} not found`);
            photoObj.photoPath = `${inputName}.jpg`;
        } else {
            // Текст: обновляем text в нужном объекте textPlacement
            const textObj = settings.textPlacement.find(obj => obj.textLayerName === inputName);
            if (!textObj) throw new NotFoundException(`textLayerName ${inputName} not found`);
            textObj.text = value;
        }

        await this.s3Service.putJson(settingsKey, settings);
    }

    /** Сохранить превью (preview.png) */
    async savePreview(canvasId: string, buffer: Buffer): Promise<void> {
        const key = `canvases/${canvasId}/preview.png`;
        await this.s3Service.uploadFile({
            key,
            body: buffer,
            contentType: 'image/png',
        });
        await this.updateSettings(canvasId, { previewFileName: 'preview.png' });
    }

    /** Получить settings.json Canvas */
    async getSettings(canvasId: string): Promise<CanvasSettings> {
        const settings = await this.s3Service.getJson<CanvasSettings>(`canvases/${canvasId}/settings.json`);
        if (!settings) throw new NotFoundException('Canvas settings not found');
        return settings;
    }

    /** Удалить Canvas полностью */
    async deleteCanvas(canvasId: string): Promise<void> {
        await this.s3Service.deleteFolder(`canvases/${canvasId}/`);
        await this.canvasRepo.delete(canvasId);
    }
}