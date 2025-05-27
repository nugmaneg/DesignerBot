// src/main.ts
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(3000);           // ← держит event-loop
    console.log('HTTP server on 3000');
    app.enableShutdownHooks();
}

bootstrap().catch((e) => {
    console.error('Bootstrap error:', e);
    process.exit(1);
});