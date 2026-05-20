import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 200, description: 'Project created successfully' })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.create(createProjectDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active projects' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Get all soft-deleted projects (ADMIN only)' })
  findDeleted(@CurrentUser() user: User) {
    return this.projectsService.findDeleted(user);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get an active project by ID' })
  findOne(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.findOne(projectId);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update a project (Owner or ADMIN only)' })
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.update(projectId, updateProjectDto, user);
  }

  @Delete(':projectId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a project (Owner or ADMIN only)' })
  remove(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.remove(projectId, user);
  }

  @Post(':projectId/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore a soft-deleted project (ADMIN only)' })
  restore(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.restore(projectId, user);
  }
}
