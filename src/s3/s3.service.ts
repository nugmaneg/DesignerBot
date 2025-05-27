import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    PutObjectCommandInput,
    GetObjectCommandInput,
    DeleteObjectCommandInput,
    HeadObjectCommandInput,
    ListObjectsV2Command,
    DeleteObjectsCommand,
    ObjectCannedACL,
    _Object
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export interface S3UploadOptions {
    key: string;
    body: Buffer | Readable;
    contentType?: string;
    acl?: ObjectCannedACL;
    metadata?: Record<string, string>;
}

@Injectable()
export class S3Service {
    private readonly s3: S3Client;
    private readonly bucket: string;
    private readonly logger = new Logger(S3Service.name);

    constructor() {
        this.bucket = process.env.S3_BUCKET!;
        if (!this.bucket) {
            throw new Error('S3_BUCKET is not defined in environment variables');
        }

        this.s3 = new S3Client({
            region: process.env.S3_REGION || 'us-east-1',
            endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
            forcePathStyle: true,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
                secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
            },
        });
    }

    /**
     * Загрузка файла (buffer или stream) в S3
     */
    async uploadFile(options: S3UploadOptions): Promise<{ key: string }> {
        const params: PutObjectCommandInput = {
            Bucket: this.bucket,
            Key: options.key,
            Body: options.body,
            ContentType: options.contentType,
            ACL: options.acl ?? 'private',
            Metadata: options.metadata,
        };

        try {
            await this.s3.send(new PutObjectCommand(params));
            this.logger.log(`Uploaded file to S3: ${options.key}`);
            return { key: options.key };
        } catch (error) {
            this.logger.error('Failed to upload file to S3', error);
            throw new InternalServerErrorException('Ошибка загрузки файла в S3');
        }
    }

    /**
     * Получение файла как потока из S3
     */
    async getObjectStream(
        key: string,
    ): Promise<{ stream: Readable; contentType?: string }> {
        const command: GetObjectCommandInput = {
            Bucket: this.bucket,
            Key: key,
        };

        try {
            const response = await this.s3.send(new GetObjectCommand(command));
            if (!response.Body) {
                throw new NotFoundException('Файл не найден');
            }
            return {
                stream: response.Body as Readable,
                contentType: response.ContentType,
            };
        } catch (error) {
            if (error?.$metadata?.httpStatusCode === 404) {
                throw new NotFoundException('Файл не найден');
            }
            this.logger.error(`Failed to get file ${key} from S3`, error);
            throw new InternalServerErrorException('Ошибка получения файла из S3');
        }
    }

    /**
     * Получение файла как Buffer (для передачи в другие сервисы, например, в Telegram)
     */
    async getObjectBuffer(key: string): Promise<{ buffer: Buffer; contentType?: string }> {
        const { stream, contentType } = await this.getObjectStream(key);
        const chunks : Buffer[] = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return { buffer, contentType };
    }

    /**
     * Генерация signed URL на чтение файла
     */
    async getSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        try {
            return await getSignedUrl(this.s3, command, { expiresIn });
        } catch (error) {
            this.logger.error(`Failed to generate signed read URL for ${key}`, error);
            throw new InternalServerErrorException('Ошибка генерации signed URL на чтение');
        }
    }

    /**
     * Генерация signed URL на загрузку файла
     */
    async getSignedUploadUrl(
        key: string,
        expiresIn = 600,
        contentType?: string,
    ): Promise<string> {
        const params: PutObjectCommandInput = {
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        };

        const command = new PutObjectCommand(params);

        try {
            return await getSignedUrl(this.s3, command, { expiresIn });
        } catch (error) {
            this.logger.error(`Failed to generate signed upload URL for ${key}`, error);
            throw new InternalServerErrorException('Ошибка генерации signed URL на запись');
        }
    }

    /**
     * Удаление файла из S3
     */
    async deleteFile(key: string): Promise<void> {
        const params: DeleteObjectCommandInput = {
            Bucket: this.bucket,
            Key: key,
        };

        try {
            await this.s3.send(new DeleteObjectCommand(params));
            this.logger.log(`Deleted file from S3: ${key}`);
        } catch (error) {
            this.logger.error(`Failed to delete file ${key} from S3`, error);
            throw new InternalServerErrorException('Ошибка удаления файла из S3');
        }
    }

    /**
     * Проверка существования файла
     */
    async fileExists(key: string): Promise<boolean> {
        const params: HeadObjectCommandInput = {
            Bucket: this.bucket,
            Key: key,
        };

        try {
            await this.s3.send(new HeadObjectCommand(params));
            return true;
        } catch (error) {
            if (error?.$metadata?.httpStatusCode === 404) return false;
            this.logger.error(`Error checking existence of ${key}`, error);
            throw new InternalServerErrorException('Ошибка проверки существования файла');
        }
    }

    /**
     * Получить список ключей всех объектов с заданным префиксом (аналог обхода директории)
     */
    async listObjects(prefix: string): Promise<string[]> {
        try {
            const command = new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix,
            });
            const result = await this.s3.send(command);
            // Отсекаем только объекты с ключами (фильтруем undefined/null)
            return (result.Contents || [])
                .map(obj => obj.Key)
                .filter((key): key is string => !!key);
        } catch (error) {
            this.logger.error(`Ошибка listObjects для префикса "${prefix}"`, error);
            throw new InternalServerErrorException('Ошибка получения списка объектов из S3');
        }
    }

    /**
     * Получить и распарсить JSON-файл (например, settings.json)
     */
    async getJson<T>(key: string): Promise<T | null> {
        try {
            const { buffer } = await this.getObjectBuffer(key);
            return JSON.parse(buffer.toString('utf-8')) as T;
        } catch (error) {
            this.logger.warn(`Ошибка чтения или парсинга JSON из ${key}: ${error}`);
            return null;
        }
    }

    /**
     * Сохранить объект как JSON-файл в S3
     */
    async putJson(key: string, data: unknown): Promise<void> {
        const body = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
        await this.uploadFile({
            key,
            body,
            contentType: 'application/json',
        });
    }

    /**
     * Массовое удаление всех файлов по префиксу (аналог удаления директории)
     */
    async deleteFolder(prefix: string): Promise<void> {
        // Получаем все ключи
        const keys = await this.listObjects(prefix);
        if (keys.length === 0) return;

        // S3 API позволяет удалить до 1000 объектов за раз
        const objects = keys.map(Key => ({ Key }));

        try {
            await this.s3.send(new DeleteObjectsCommand({
                Bucket: this.bucket,
                Delete: { Objects: objects }
            }));
            this.logger.log(`Удалены все объекты с префиксом "${prefix}" (${objects.length})`);
        } catch (error) {
            this.logger.error(`Ошибка массового удаления файлов по префиксу "${prefix}"`, error);
            throw new InternalServerErrorException('Ошибка удаления файлов из S3');
        }
    }
}
