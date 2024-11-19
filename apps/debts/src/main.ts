import { NestFactory } from '@nestjs/core';
import { DebtsModule } from './debts.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(DebtsModule);

  const configService = app.get(ConfigService);
  await app.listen(configService.get('DEBTS_SERVICE_PORT'));
}
bootstrap();
