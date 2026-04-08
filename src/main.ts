import { BadRequestException, LOG_LEVELS, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import * as compression from 'compression'
import helmet from 'helmet'

import { AppModule } from './app.module'
import { JsonLogger } from './common/utils/logger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger({
      json: true,
      logLevels: LOG_LEVELS,
      colors: true
    })
  })
  const configService = app.get(ConfigService)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors
          .map((error) => Object.values(error.constraints || {}).join(', '))
          .join('; ')
        return new BadRequestException({
          statusCode: 400,
          message: messages,
          error: 'Validation Failed',
          timestamp: new Date().toISOString(),
          details: errors
        })
      }
    })
  )
  // Security Middleware
  app.use(helmet())
  app.use(compression())
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true
  })

  app.setGlobalPrefix('api')

  // Swagger — development/staging only
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Lumbung Mesari API')
      .setDescription('The Lumbung Mesari API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true
      }
    })
  }

  const port = configService.get<number>('PORT', 8000)
  await app.listen(port)
}

bootstrap()
