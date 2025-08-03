import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email = '';

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password = '';

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName = '';

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName = '';
}
