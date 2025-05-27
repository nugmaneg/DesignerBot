import {
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DefaultContext } from "../defaultCtx.interface";
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const ctx = context.getArgByIndex(0) as DefaultContext;
        const handler = context.getHandler();
        const allowed = this.reflector.get<string[]>(ROLES_KEY, handler);
        // если нет метаданных — доступ открыт
        if (!allowed || !allowed.length) return true;
        return allowed.includes(ctx.dbUser.role);
    }
}