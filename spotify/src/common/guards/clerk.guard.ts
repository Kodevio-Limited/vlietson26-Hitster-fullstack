import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/auth/entities/user.entity';

@Injectable()
export class ClerkGuard implements CanActivate {
  private clerkClient;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.clerkClient = createClerkClient({ 
      secretKey: this.configService.get('clerk.secretKey') 
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const sessionClaims = await this.clerkClient.verifyToken(token);
      
      // Find or create user in our DB
      let user = await this.userRepository.findOne({
        where: { clerkId: sessionClaims.sub }
      });

      if (!user) {
        // Create a new user record for this Clerk ID
        user = this.userRepository.create({
          clerkId: sessionClaims.sub,
          email: sessionClaims.email || '',
          role: 'admin', // Default to admin for now, or check claims
        });
        await this.userRepository.save(user);
      }

      request.user = user;
      return true;
    } catch (error) {
      console.error('Clerk verification failed:', error);
      throw new UnauthorizedException('Invalid Clerk token');
    }
  }
}
