import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadLocalEnvironment } from './database';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  loadLocalEnvironment();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(process.env.PORT ?? 13000);
  await app.listen(port, '0.0.0.0');
  console.log(`app-skeleton API listening on http://localhost:${port}/api/health`);
}

void bootstrap();
