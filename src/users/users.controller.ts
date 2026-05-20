import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Register a new user
   * @param createUserDto - User registration data (username, email, fullName, password, role)
   * @returns Created user (without password)
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * GET /users
   * Fetch all users
   * @returns Array of all users (without passwords)
   */
  @Get()
  @ApiOperation({ summary: 'Fetch all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * Fetch a user by ID
   * GET /users/:userId
   * @param id - User ID
   * @returns User data (without password)
   */
  @Get(':userId')
  @ApiOperation({ summary: 'Fetch a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  findOne(@Param('userId', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  /**
   * Update a user's details
   * POST /users/update/:userId
   * @param id - User ID
   * @param updateUserDto - Fields to update (fullName, role)
   * @returns Updated user data (without password)
   */
  @Post('update/:userId')
  update(
    @Param('userId', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * DELETE /users/:userId
   * Delete a user
   * @param id - User ID
   */
  @Delete(':userId')
  remove(@Param('userId', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
