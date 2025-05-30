import {Module} from '@nestjs/common';
import {CanvasService} from './canvas.service';
import {DatabaseModule} from "../database/database.module";
import {S3Module} from "../s3/s3.module";

@Module({
    imports: [DatabaseModule, S3Module],
    providers: [CanvasService],
    exports: [CanvasService]
})
export class CanvasModule {
}