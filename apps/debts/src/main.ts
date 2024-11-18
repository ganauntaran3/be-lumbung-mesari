import { NestFactory } from '@nestjs/core';
import { DebtsModule } from './debts.module';

async function bootstrap() {
  const app = await NestFactory.create(DebtsModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
