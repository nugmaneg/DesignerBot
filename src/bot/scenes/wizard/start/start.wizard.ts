import {
    Wizard,
    WizardStep,
    SceneEnter,
    SceneLeave,
    Command,
    Ctx,
} from 'nestjs-telegraf';
import { WizardContext } from 'telegraf/typings/scenes';
import {User, UserRole} from "@prisma/client";
import {
    adminStartWizardReplyKeyboard,
    moderatorStartWizardReplyKeyboard,
    userStartWizardReplyKeyboard
} from "./start.keyboard";

type StartSession = { step?: number; name?: string; age?: number };
type StartCtx = WizardContext & { session: StartSession };

@Wizard('startWizard')
export class StartWizard {

    @SceneEnter()
    async enter(@Ctx() ctx: StartCtx) {
        const dbUser: User = ctx.state.dbUser;

        let keyboard : any;
        let welcomeText : string;

        switch (dbUser.role) {
            case UserRole.ADMIN:
            case UserRole.FATHER :
                keyboard = adminStartWizardReplyKeyboard;
                welcomeText = '👑 Админ-меню!\nВыберите действие ⬇️';
                break;
            case UserRole.MODERATOR:
                keyboard = moderatorStartWizardReplyKeyboard;
                welcomeText = '🛡️ Модераторское меню!\nВыберите действие ⬇️';
                break;
            case UserRole.USER:
            default:
                keyboard = userStartWizardReplyKeyboard;
                welcomeText = (
                    '🎨 Добро пожаловать в главное меню!\n' +
                    'Здесь ты можешь творить и создавать уникальные дизайны.' +
                    '\n\n<blockquote>Выбери действие с помощью клавиатуры ниже ⬇️</blockquote>'
                );
                break;
        }

        await ctx.reply(welcomeText, {reply_markup: keyboard.reply_markup, parse_mode: "HTML"});
        await ctx.scene.leave();
    }

    @SceneLeave()
    async leave(@Ctx() ctx: StartCtx) {
        ctx.session = {};
    }
}