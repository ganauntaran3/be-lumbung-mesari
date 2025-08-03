import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcrypt'
import { UsersService } from '../users/users.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtPayload } from '../interface/jwt'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmailWithRole(email)
    if (user && (await compare(password, user.password))) {
      const { password, ...result } = user
      return result
    }
    return null
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }
    return this.generateTokens(user)
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await hash(registerDto.password, 10)
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      fullname: `${registerDto.firstName} ${registerDto.lastName}`,
      username: registerDto.email.split('@')[0],
      phone_number: '', // These can be updated later
      address: '', // These can be updated later
      status: 'waiting_deposit', // Default status from migration
      role_id: 'member', // Member role ID (will be created in seeds)
      deposit_image_url: undefined // Optional field
    })

    // Get user with role information for token generation
    const userWithRole = await this.usersService.findByEmailWithRole(user.email)
    return this.generateTokens(userWithRole)
  }

  async refreshToken(user: any) {
    return this.generateTokens(user)
  }

  private generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role_name || user.role || 'member'
    }

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' })
    }
  }
}
