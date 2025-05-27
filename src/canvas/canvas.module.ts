import {Module} from '@nestjs/common';
import {CanvasService} from './canvas.service';
import {DatabaseModule} from "../database/database.module";

@Module({
    imports: [DatabaseModule],
    providers: [CanvasService],
    exports: [CanvasService]
})
export class CanvasModule {
}