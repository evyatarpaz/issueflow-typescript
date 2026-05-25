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
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Exposes the REST API for Project management.
 * Injects the authenticated context (@CurrentUser) into mutation requests to
 * enforce business rules (like ownership and admin privileges) inside the service layer.
 */
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
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active projects' })
  findAll() {
    return this.projectsService.findAll();
  }

  /**
   * Specialized endpoint resolving strictly to soft-deleted entities.
   * Path intentionally placed before ':projectId' to prevent router resolution collisions.
   */
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

  /**
   * Analytics endpoint designed for frontend resource allocation dashboards.
   */
  @Get(':projectId/workload')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get workload of developers for a project' })
  getWorkload(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.getWorkload(projectId);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update a project (Owner or ADMIN only)' })
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: User, // Context passed to service for RBAC validation
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
