import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class PC_ConfigDto {
  email: string;
  @IsNotEmpty()
  pc_value: string;

  @IsNotEmpty()
  pc_percent: number;
}
