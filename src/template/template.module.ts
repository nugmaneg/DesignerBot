import {Module} from '@nestjs/common';
import {TemplateService} from './template.service';
import {DatabaseModule} from "../database/database.module";
import {S3Module} from "../s3/s3.module";

@Module({
    imports: [DatabaseModule, S3Module],
    providers: [TemplateService],
    exports: [TemplateService]
})
export class TemplateModule {
}