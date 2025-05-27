import { Module } from '@nestjs/common';
import { PhotoGeneratorService } from './photo-generator.service';

@Module({
    providers: [PhotoGeneratorService],
    exports: [PhotoGeneratorService],
})
export class PhotoGeneratorModule {}