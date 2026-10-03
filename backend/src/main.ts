import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Mở toàn bộ CORS cho frontend và SSE
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Lắng nghe trên '0.0.0.0' để Docker container n8n có thể kết nối vào cổng 4000
  await app.listen(4000, '0.0.0.0');
  console.log(`Backend đang hoạt động tại: http://localhost:4000`);
}
bootstrap();