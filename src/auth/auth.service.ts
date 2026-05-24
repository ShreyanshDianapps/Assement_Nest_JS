import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { UserService } from '../users/user.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserEntity } from '../users/entities/user.entity';
import { UserDocument } from '../users/schemas/user.schema';

type UserLike = UserDocument | Record<string, unknown>;

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
        private config: ConfigService,
        private redisService: RedisService
    ) { }

    private signToken(user: UserDocument): string {
        return this.jwtService.sign({
            sub: user._id.toString(),
            email: user.email,
            role: user.role,
        });
    }

    private toEntity(user: UserLike): UserEntity {
        const plain =
            typeof (user as UserDocument).toObject === 'function'
                ? (user as UserDocument).toObject()
                : (user as Record<string, unknown>);
        return plainToInstance(UserEntity, plain, {
            excludeExtraneousValues: true,
        });
    }


    async register(dto: RegisterDto) {
        const existing = await this.userService.findByUsernameOREmail(
            dto.username,
            dto.email,
        )
        if (existing) {
            throw new ConflictException('Username or email already in use')
        }
        const user = await this.userService.create(dto);


        return {
            user: this.toEntity(user),
            token: this.signToken(user),
        };

    }
    async login(dto: LoginDto) {
        const user = await this.userService.findByEmailWithPassword(dto.email);
        if (!user || !(await user.comparePassword(dto.password))) {
          throw new UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
          throw new UnauthorizedException('Account is inactive');
        }
        await this.userService.setLastLogin(user._id.toString());
        return {
          user: this.toEntity(user),
          token: this.signToken(user),
        };
        
      }
      async logout(token: string) {
        const decoded = this.jwtService.decode<{ exp?: number } | null>(token);
        if (decoded?.exp) {
          await this.redisService.denylistToken(token, decoded.exp);
        }
        return { message: 'Logged out successfully' };
      }
    
      async getProfile(userId: string) {
        const user = await this.userService.findById(userId);
        return this.toEntity(user);
      }
    
      async updateProfile(userId: string, dto: UpdateProfileDto) {
        const user = await this.userService.updateProfile(userId, dto);
        return this.toEntity(user);
      }
}