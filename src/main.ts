import './instrument';

import {
  Env,
  getCorsConfig,
  getSessionConfig,
  helmetConfig,
} from '@/shared/config';
import { SanitizationPipe } from '@/shared/pipes';
import { getLoggerConfig } from '@app/logger';
import { RedisService } from '@app/redis';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import * as passport from 'passport';
import { createLogger } from 'winston';
import { AppModule } from './app.module';
import { nestCsrf } from 'ncsrf';

async function bootstrap() {
  const logger = createLogger(getLoggerConfig());

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance: logger,
    }),
  });

  const config = app.get(ConfigService);
  const redis = app.get(RedisService);
  const PORT = config.get<number>(Env.PORT) || 8080;

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.get<string>(Env.APP_NAME)!)
    .setVersion('1.0')
    .addGlobalResponse({
      status: 500,
      description: 'Internal server error',
    })
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory);

  // ADDITIONAL CONFIG - Must be before CSRF
  app.use(compression());
  app.use(cookieParser());

  // SESSION - Must be before CSRF as CSRF depends on session
  app.use(session(getSessionConfig(config, redis)));
  app.use(passport.initialize());
  app.use(passport.session());

  // SECURITY - CSRF depends on cookies and session being parsed
  app.enableCors(getCorsConfig(config.get<string>(Env.FRONTEND_URL)!));
  app.use(helmet(helmetConfig));
  app.use(nestCsrf());

  // VALIDATION PIPES
  app.useGlobalPipes(
    new SanitizationPipe(),
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
  });
}

void bootstrap();
