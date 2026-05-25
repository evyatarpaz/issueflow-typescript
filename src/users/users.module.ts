import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { CommentsModule } from '../comments/comments.module';

/**
 * NestJS Module encapsulating identity and user state.
 * Uses `forwardRef` to safely import the `CommentsModule`, mitigating circular dependency
 * injection errors caused by the bidirectional relationship between mentions and users.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => CommentsModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
