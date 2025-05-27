// src/template/template.service.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Canvas, Geo, Category } from '@prisma/client';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {CanvasSettings} from "./canvas-settings.inteface";
import {CanvasRepository} from "../database/canvas.repository";

@Injectable()
export class CanvasService {
    private readonly root = path.resolve(__dirname, '../../patterns/canvases');
    constructor(private readonly canvasRepo: CanvasRepository) {}


    /** Поиск одного шаблона по его ID */
    findById(id: string): Promise<Canvas | null> {
        return this.canvasRepo.findById(id);
    }

    /** Создание нового шаблона */
    create(data: Prisma.CanvasCreateInput): Promise<Canvas> {
        return this.canvasRepo.create(data);
    }

    /** Обновление существующего шаблона */
    update(
        id: string,
        data: Prisma.CanvasCreateInput,
    ): Promise<Canvas> {
        return this.canvasRepo.update(id, data);
    }

    /** Удаление шаблона */
    delete(id: string): Promise<Canvas> {
        return this.canvasRepo.delete(id);
    }

}