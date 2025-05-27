import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from './user.repository';
import { TemplateRepository } from './template.repository';
import { CanvasRepository } from './canvas.repository';

@Module({
    providers: [
        PrismaService,
        UserRepository,
        TemplateRepository,
        CanvasRepository,
    ],
    exports: [
        UserRepository,
        TemplateRepository,
        CanvasRepository,
    ],
})
export class DatabaseModule {}