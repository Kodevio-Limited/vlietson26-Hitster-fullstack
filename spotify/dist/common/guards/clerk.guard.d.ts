import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../../modules/auth/entities/user.entity';
export declare class ClerkGuard implements CanActivate {
    private configService;
    private userRepository;
    private clerkClient;
    constructor(configService: ConfigService, userRepository: Repository<User>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
