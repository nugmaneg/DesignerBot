import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()  // Глобальный модуль, чтобы PrismaService был доступен в других модулях
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {}