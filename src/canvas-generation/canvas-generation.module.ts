import {Module} from '@nestjs/common';
import {S3Module} from "../s3/s3.module";
import {CanvasGenerationService} from "./canvas-generation.service";

@Module({
    imports: [S3Module],
    providers: [CanvasGenerationService],
    exports: [CanvasGenerationService]
})
export class CanvasGenerationModule {
}