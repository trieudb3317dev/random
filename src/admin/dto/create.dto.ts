import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserAdminDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
