import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

/**
 * Exposes the REST API for Identity and Access Management (IAM).
 * Applies the `ClassSerializerInterceptor` globally across all routes to guarantee
 * that sensitive properties (like `@Exclude()` passwords) are stripped from all outbound HTTP responses.
 */
@ApiTags('Users')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fetch all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fetch a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  findOne(@Param('userId', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post('update/:userId')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @Param('userId', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(@Param('userId', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Get(':userId/mentions')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all comments where the user is mentioned' })
  @ApiResponse({ status: 200, description: 'Mentions retrieved successfully' })
  findMentions(@Param('userId', ParseIntPipe) id: number) {
    return this.usersService.findMentions(id);
  }
}
