import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Register a new user
   * @param createUserDto - User registration data (username, email, fullName, password, role)
   * @returns Created user (without password)
   */
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * Fetch all users
   * @returns Array of all users (without passwords)
   */
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * Fetch a user by ID
   * @param id - User ID
   * @returns User data (without password)
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  /**
   * Update a user's details
   * @param id - User ID
   * @param updateUserDto - Fields to update (fullName, role)
   * @returns Updated user data (without password)
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Delete a user
   * @param id - User ID
   */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
