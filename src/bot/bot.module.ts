// bot/bot.module.ts

import {Module} from '@nestjs/common';
import {TelegrafModule} from 'nestjs-telegraf';
import {session} from 'telegraf';
import {BotUpdate} from './bot.update';
import {StartWizard} from './scenes/wizard/start/start.wizard';
import {UserMiddleware} from './middlewares/user.middleware';
import {MiddlewareModule} from "./middlewares/middleware.module";
import {BotService} from "./bot.service";
import {CreateCanvasWizard} from "./scenes/wizard/createCanvas/createCanvas.wizard";
import {TemplateModule} from "../template/template.module";
import {CanvasModule} from "../canvas/canvas.module";
import {ModerateCanvasWizard} from "./scenes/wizard/moderateCanvas/moderateCanvas.wizard";
import {CanvasGenerationModule} from "../canvas-generation/canvas-generation.module";

@Module({
    imports: [
        MiddlewareModule,
        TelegrafModule.forRootAsync({
            imports: [MiddlewareModule],
            inject: [UserMiddleware],
            useFactory: async (userMiddleware: UserMiddleware) => ({
                token: process.env.TELEGRAM_TOKEN!,
                middlewares: [
                    session(),
                    userMiddleware.middleware()
                ],
                launchOptions: {
                    allowedUpdates: [
                        'message',
                        'callback_query',
                    ]
                }
            }),
        }),
        TemplateModule,
        CanvasModule,
        CanvasGenerationModule,
    ],
    providers: [
        BotService,
        BotUpdate,
        StartWizard,
        CreateCanvasWizard,
        ModerateCanvasWizard
    ],
})
export class BotModule {
}