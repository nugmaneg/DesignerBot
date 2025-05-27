import { MiddlewareFn } from 'telegraf';
import { UserService } from '../../user/user.service';
import { DefaultContext } from "../defaultCtx.interface";
import {Injectable} from "@nestjs/common";
import {UserRole} from "@prisma/client";

@Injectable()
export class UserMiddleware {
    constructor(private userService: UserService) {}

    middleware(): MiddlewareFn<DefaultContext> {
        return async (ctx, next) => {
            if (ctx.from) {
                const tgId = ctx.from.id;
                ctx.state.dbUser = await this.userService.upsertUser({
                    telegramId: tgId,
                    telegramUsername: ctx.from.username,
                });
            }

            if (ctx.state.dbUser.role === UserRole.UNKNOWN) {
                await ctx.reply("Обратитесь за тех.поддержкой!\n@melhelper");
                return;
            }
            return next();
        };
    }
}