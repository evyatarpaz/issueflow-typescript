import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CommentsService } from '../comments/comments.service';
import { Comment } from '../comments/entities/comment.entity';

/**
 * Orchestrates identity management and authentication prerequisites.
 * Handles the secure serialization of user profiles and resolves cross-domain concerns
 * (like @mentions) by interfacing with adjacent modules.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    // We utilize forwardRef here to break the circular dependency between UsersService
    // and CommentsService, as Comments depend on Users for mentions, and Users depend
    // on Comments for notification aggregations.
    @Inject(forwardRef(() => CommentsService))
    private readonly commentsService: CommentsService,
  ) {}

  /**
   * Provisions a new user account into the system.
   *
   * @param createUserDto - The validated payload containing plaintext credentials.
   * @returns A promise resolving to the saved user profile, explicitly stripped of the password hash.
   * @throws BadRequestException if the requested username or email is already occupied.
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.usersRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });

    // Enforce uniqueness constraints at the service layer to return human-readable 400s
    // instead of opaque 500 database constraint errors.
    if (existingUser) {
      throw new BadRequestException(
        'User with that username or email already exists',
      );
    }

    // We rely on bcrypt for one-way salting and hashing. 10 rounds is the current industry
    // baseline balancing cryptographic resistance with compute performance.
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = savedUser;

    return result as Omit<User, 'password'>;
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    return this.usersRepository.find({
      select: ['id', 'username', 'email', 'fullName', 'role'],
    });
  }

  async findOne(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'fullName', 'role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Internal resolver explicitly used by the AuthService to validate JWT payloads.
   * This is the only read method configured to intentionally select the hidden `password` field.
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      select: [
        'id',
        'username',
        'email',
        'fullName',
        'password',
        'role',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  /**
   * Resolves a batch of usernames to their respective User entities.
   * Optimized for the CommentsService to map unstructured @mentions into concrete database relationships.
   *
   * @param usernames - An array of raw username strings extracted from a comment body.
   * @returns An array of matching User entities.
   */
  async findUsersByUsernames(usernames: string[]): Promise<User[]> {
    if (!usernames.length) {
      return [];
    }

    // We normalize the query to lowercase to ensure @Mentions are case-insensitive,
    // improving user experience when manually typing usernames.
    return this.usersRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.fullName'])
      .where('LOWER(user.username) IN (:...usernames)', {
        usernames: usernames.map((u) => u.toLowerCase()),
      })
      .getMany();
  }

  /**
   * Aggregates all conversational threads where this user was explicitly pinged.
   */
  async findMentions(userId: number): Promise<Comment[]> {
    // Validate user existence first to ensure accurate 404 responses
    await this.findOne(userId);
    return this.commentsService.findMentionsForUser(userId);
  }

  /**
   * Applies non-critical identity mutations.
   */
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.fullName) {
      user.fullName = updateUserDto.fullName;
    }
    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }

    await this.usersRepository.save(user);
    return this.findOne(id);
  }

  /**
   * Completely purges a user from the system.
   * Note: IssueFlow currently enforces hard-deletes on users to comply with data residency
   * and right-to-be-forgotten privacy regulations.
   */
  async remove(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.usersRepository.remove(user);
  }
}
