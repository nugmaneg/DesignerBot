import {Injectable, Logger, NotFoundException} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TemplateRepository } from '../database/template.repository';
import { Template, Geo, Category } from '@prisma/client';
import {TemplateSettings} from "./template-settings.interface";
import {S3Service} from "../s3/s3.service";

@Injectable()
export class TemplateService {
    private readonly logger = new Logger(TemplateService.name);
    constructor(
        private readonly templateRepo: TemplateRepository,
        private readonly s3Service: S3Service,
        ) {}

    /**
     * Возвращает публичные шаблоны по geo и (необязательной) категории
     * + пагинация
     */
    findPublicByGeoAndCategory(
        geo: Geo,
        category?: Category,
    ): Promise<Template[]> {
        return this.templateRepo.findPublicByGeoAndCategory(
            geo,
            category,
        );
    }

    /** Поиск одного шаблона по его ID */
    findById(id: string): Promise<Template | null> {
        return this.templateRepo.findById(id);
    }

    /** Создание нового шаблона */
    create(data: Prisma.TemplateCreateInput): Promise<Template> {
        return this.templateRepo.create(data);
    }

    /** Обновление существующего шаблона */
    update(
        id: string,
        data: Prisma.TemplateUpdateInput,
    ): Promise<Template> {
        return this.templateRepo.update(id, data);
    }

    /** Удаление шаблона */
    delete(id: string): Promise<Template> {
        return this.templateRepo.delete(id);
    }

    async getTemplatePreviewBuffer(template: Template): Promise<Buffer> {
        // Предполагается, что preview.png лежит по пути:
        // templates/{template.title}/preview.png
        const key = `templates/${template.title}/preview.png`;

        // Проверяем, существует ли файл в S3 (если нужно)
        const exists = await this.s3Service.fileExists(key);
        if (!exists) {
            throw new NotFoundException('Preview для шаблона не найден в S3');
        }

        // Получаем файл из S3
        const { buffer } = await this.s3Service.getObjectBuffer(key);
        return buffer;
    }

    async getTemplateSettings(template: Template): Promise<any> {
        const key = `templates/${template.title}/settings.json`;
        return this.s3Service.getJson(key);
    }

    /**
     * Синхронизирует паттерны из файловой системы с БД:
     * 1) Парсит все папки в patterns/templates
     * 2) Для каждого settings.json выполняет upsert (id == null → create, потом обновляет файл)
     * 3) Удаляет из БД шаблоны, которых нет в папке
     */
    async syncPatterns(): Promise<void> {
        this.logger.log('start sync patterns');
        const prefix = 'templates/'
        const fsIds = new Set<string>();
        const settingsKeys = (await this.s3Service.listObjects(prefix))
            .filter(key => key.endsWith('/settings.json'));
        this.logger.log(`${await this.s3Service.listObjects(prefix)}`);

        const dbTemplates = await this.templateRepo.findAll();
        const dbTemplatesMap = new Map<string, Template>();
        dbTemplates.forEach(tpl => dbTemplatesMap.set(tpl.id, tpl));

        for (const settingsKey of settingsKeys) {
            let settings: TemplateSettings | null;
            try {
                settings = await this.s3Service.getJson<TemplateSettings>(settingsKey);
            } catch (err) {
                this.logger.warn(`Не удалось прочитать ${settingsKey}: ${err}`);
                continue;
            }
            if (!settings || !settings.supportedGeos || !settings.categories) {
                this.logger.warn(`Пропущен settings.json без обязательных полей: ${settingsKey}`);
                continue;
            }

            const match = settingsKey.match(/templates\/([^/]+)\//);
            const dirName = match?.[1] || 'unknown';

            // id = null → нужно создать шаблон, затем обновить файл
            if (!settings.id) {
                try {
                    const created = await this.create({
                        title: dirName,
                        description: settings.description,
                        supportedGeos: settings.supportedGeos,
                        categories: settings.categories,
                        isPublic: false,
                    });
                    fsIds.add(created.id);

                    // Обновляем settings.json с новым id
                    settings.id = created.id;
                    await this.s3Service.putJson(settingsKey, settings);

                    this.logger.log(`Создан шаблон ${created.id} для папки ${dirName}`);
                } catch (err) {
                    this.logger.error(`Ошибка создания шаблона для ${settingsKey}: ${err}`);
                }
            } else {
                // Уже есть id → обновить существующий шаблон
                fsIds.add(settings.id);

                if (dbTemplatesMap.has(settings.id)) {
                    try {
                        await this.update(settings.id, {
                            description: settings.description,
                            supportedGeos: settings.supportedGeos,
                            categories: settings.categories,
                            previewFileId: null,
                        });
                        this.logger.log(`Обновлён шаблон ${settings.id} (${dirName})`);
                    } catch (err) {
                        this.logger.error(`Ошибка обновления шаблона ${settings.id}: ${err}`);
                    }
                } else {
                    // Если в базе id нет, создать заново (например, база сбрасывалась)
                    try {
                        const created = await this.templateRepo.create({
                            title: dirName,
                            description: settings.description,
                            supportedGeos: settings.supportedGeos,
                            categories: settings.categories,
                            isPublic: true,
                        });
                        settings.id = created.id;
                        await this.s3Service.putJson(settingsKey, settings);
                        this.logger.log(`Восстановлен и создан шаблон ${created.id} для ${dirName}`);
                        fsIds.add(created.id);
                    } catch (err) {
                        this.logger.error(`Ошибка восстановления шаблона для ${settingsKey}: ${err}`);
                    }
                }
            }
        }
        // 2. Удаление шаблонов, которых нет на файловой системе
        for (const tpl of dbTemplates) {
            if (!fsIds.has(tpl.id)) {
                try {
                    await this.delete(tpl.id);
                    this.logger.log(`Удалён из базы шаблон ${tpl.id}, которого нет в файловой системе`);
                } catch (err) {
                    this.logger.error(`Ошибка удаления шаблона ${tpl.id}: ${err}`);
                }
            }
        }
    }
}
