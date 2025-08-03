import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import * as compression from 'compression'
import { VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)
  const apiVersion = configService.get<string>('API_DEFAULT_VERSION')
  const enabledVersions = configService.get<string>('API_ENABLED_VERSION')

  // Security middleware
  app.use(helmet())
  app.use(compression())
  app.enableCors()

  // Global prefix
  app.setGlobalPrefix('api')

  // Versioning
  enabledVersions.split(',').forEach((version) => {
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: apiVersion
    })

    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('Lumbung Mesari API')
      .setDescription('The Lumbung Mesari API documentation')
      .setVersion(`${version}`)
      .addBearerAuth()
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup(`api/v${version}`, app, document)
  })

  const port = configService.get<number>('PORT', 8000)
  await app.listen(port)
}
bootstrap()
