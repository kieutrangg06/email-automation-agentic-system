import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';

config();

async function bootstrap() {
  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  });
  app.setGlobalPrefix('');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`Backend NestJS đang chạy tại: http://localhost:${port}`);
}
bootstrap();
