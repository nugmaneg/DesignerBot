// src/database/template.repository.ts
import {Injectable} from '@nestjs/common';
import {Category, Geo, Prisma, PrismaClient, Template} from '@prisma/client';
import {PrismaService} from '../../prisma/prisma.service';

@Injectable()
export class TemplateRepository {
    constructor(private readonly prisma: PrismaService) {
    }

    /** Получить все шаблоны */
    async findAll(): Promise<Template[]> {
        return this.execTransaction(tx =>
            tx.template.findMany()
        );
    }

    /** Найти конкретный шаблон по ID */
    async findById(id: string): Promise<Template | null> {
        return this.execTransaction(tx =>
            tx.template.findUnique({where: {id}}),
        );
    }

    /** Получить публичные шаблоны по geo и категории (paging) */
    async findPublicByGeoAndCategory(
        geo: Geo,
        category?: Category,
    ): Promise<Template[]> {
        return this.execTransaction(tx =>
            tx.template.findMany({
                where: {
                    isPublic: true,
                    supportedGeos: {has: geo},
                    ...(category && {categories: {has: category}}),
                },
                orderBy: {createdAt: 'desc'},
            }),
        );
    }

    /** Создать новый шаблон */
    async create(data: Prisma.TemplateCreateInput): Promise<Template> {
        return this.execTransaction(tx =>
            tx.template.create({data}),
        );
    }

    /** Создать или обновить шаблон по id */
    async upsert(
        id: string,
        data: Prisma.TemplateCreateInput
    ): Promise<Template> {
        return this.execTransaction(tx =>
            tx.template.upsert({
                where: {id},
                create: data,
                update: data,
            }),
        );
    }

    /** Обновить существующий шаблон */
    async update(id: string, data: Prisma.TemplateUpdateInput): Promise<Template> {
        return this.execTransaction(tx =>
            tx.template.update({where: {id}, data}),
        );
    }

    /** Удалить шаблон */
    async delete(id: string): Promise<Template> {
        return this.execTransaction(tx =>
            tx.template.delete({where: {id}}),
        );
    }

    /** Вспомогательный метод для транзакций */
    private execTransaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}