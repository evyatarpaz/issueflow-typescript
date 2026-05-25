import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Application Entrypoint.
 * Bootstraps the NestJS IoC container, registers global interceptors (like ValidationPipe
 * for strict DTO payload enforcement), and initializes the OpenAPI/Swagger documentation schema.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enforces global validation on all inbound requests.
  // `whitelist: true` strips unexpected properties, protecting against mass assignment attacks.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('IssueFlow API')
    .setDescription('The IssueFlow project and issue tracking backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
