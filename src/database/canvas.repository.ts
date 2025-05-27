// src/database/canvas.repository.ts
import {Injectable} from '@nestjs/common';
import {Canvas, Prisma, PrismaClient} from '@prisma/client';
import {PrismaService} from '../../prisma/prisma.service';

@Injectable()
export class CanvasRepository {
    constructor(private readonly prisma: PrismaService) {
    }

    /** Создать новый Canvas (черновик/канву) */
    async create(data: Prisma.CanvasCreateInput): Promise<Canvas> {
        return this.execTransaction(tx =>
            tx.canvas.create({data}),
        );
    }

    async findById(id: string): Promise<Canvas | null> {
        return this.execTransaction(tx =>
            tx.canvas.findUnique({
                where: {id},
            }),
        );
    }

    /** Получить все Canvas пользователя */
    async findByUser(userId: number): Promise<Canvas[]> {
        return this.execTransaction(tx =>
            tx.canvas.findMany({
                where: {userId},
                orderBy: {createdAt: 'desc'},
            }),
        );
    }

    /** Обновить Canvas (например статус, текст, путь к файлу и т.д.) */
    async update(id: string, data: Prisma.CanvasUpdateInput): Promise<Canvas> {
        return this.execTransaction(tx =>
            tx.canvas.update({where: {id}, data}),
        );
    }

    /** Удалить Canvas (или пометить удалённым) */
    async delete(id: string): Promise<Canvas> {
        return this.execTransaction(tx =>
            tx.canvas.delete({where: {id}}),
        );
    }

    /** Вспомогательный метод для транзакций */
    private execTransaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}