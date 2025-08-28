import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PC_ConfigDto {
  @IsNotEmpty()
  @MaxLength(50)
  pc_value: string;

  @IsNotEmpty()
  pc_percent: number;

  @IsOptional()
  isChange: boolean;
}
