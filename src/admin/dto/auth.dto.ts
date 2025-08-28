import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class AuthDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(30)
  password: string;
}
