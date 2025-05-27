import { Module } from '@nestjs/common';
import { UserMiddleware } from './user.middleware';
import {UserModule} from "../../user/user.module";

@Module({
    imports: [UserModule],
    providers: [UserMiddleware],
    exports: [UserMiddleware],
})
export class MiddlewareModule {}