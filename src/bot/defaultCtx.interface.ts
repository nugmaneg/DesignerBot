import type { Context as TelegrafContext } from 'telegraf';

export interface DefaultContext extends TelegrafContext {
    dbUser?: any;
}