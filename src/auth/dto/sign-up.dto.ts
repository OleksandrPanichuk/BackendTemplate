import { IsEmail, IsStrongPassword, Matches } from 'class-validator';
import { PASSWORD_CONFIG } from '@/auth/auth.constants';
import { REGEX_PATTERNS } from '@/shared/constants';
import { IsRequiredString, Trim, TrimAndLower } from '@/shared/decorators';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpInput {
  @ApiProperty({
    description: 'Email address',
    example: 'example@gmail.com',
    required: true,
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    maxLength: 255,
    minLength: 5,
    uniqueItems: true,
    nullable: false,
    type: String,
  })
  @TrimAndLower()
  @IsEmail(undefined, { message: 'Invalid email address' })
  readonly email: string;

  @ApiProperty({
    description: 'Password',
    example: 'StrongPassword123_!',
    required: true,
    maxLength: 255,
    minLength: 8,
    nullable: false,
    type: String,
  })
  @IsStrongPassword(PASSWORD_CONFIG, {
    message:
      'Password must contain at least 8 characters, including uppercase, lowercase, numbers, and symbols',
  })
  readonly password: string;

  @ApiProperty({
    description: 'Username',
    example: 'john_doe',
    required: true,
    maxLength: 255,
    minLength: 3,
    uniqueItems: true,
    nullable: false,
    type: String,
  })
  @Trim()
  @Matches(REGEX_PATTERNS.USERNAME, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  @IsRequiredString()
  readonly username: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    required: true,
    maxLength: 255,
    minLength: 2,
    nullable: false,
    type: String,
  })
  @Trim()
  @IsRequiredString()
  readonly firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    required: true,
    maxLength: 255,
    minLength: 2,
    nullable: false,
    type: String,
  })
  @Trim()
  @Transform(({ value }) => (value as string).trim())
  @IsRequiredString()
  readonly lastName: string;
}
