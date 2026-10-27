import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind Nginx: use the real client IP for rate limiting.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.setGlobalPrefix('api');

  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (origins.length) app.enableCors({ origin: origins });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port, process.env.HOST ?? '127.0.0.1');
  console.log(`API listening on http://${process.env.HOST ?? '127.0.0.1'}:${port}/api`);
}
void bootstrap();
