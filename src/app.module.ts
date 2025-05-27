import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {PrismaModule} from "../prisma/prisma.module";
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { TemplateModule } from './template/template.module';
import { BotModule } from './bot/bot.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        BotModule,
        PrismaModule,
        DatabaseModule,
        TemplateModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}