import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';
import { CommentsModule } from './comments/comments.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ProjectsModule } from './projects/projects.module';

/**
 * Root Dependency Injection Container.
 * Orchestrates cross-cutting concerns (Environment Config, PostgreSQL ORM mapping, Cron Scheduler)
 * and aggregates the distinct bounded contexts (Users, Auth, Tickets, Comments, Projects, Audit Logs).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get<string>('DB_USERNAME', 'issueflow'),
        password: configService.get<string>('DB_PASSWORD', 'issueflow'),
        database: configService.get<string>('DB_NAME', 'issueflow'),
        autoLoadEntities: true,
        // synchronize: true is strictly for rapid prototyping and will drop/alter tables.
        // Needs to be replaced with explicit TypeORM migrations in production.
        synchronize: true,
      }),
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    AuthModule,
    TicketsModule,
    CommentsModule,
    AuditLogsModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
