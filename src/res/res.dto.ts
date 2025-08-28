import { IsEmpty, IsOptional } from 'class-validator';

export class ApiResponseDto<T> {
  @IsEmpty()
  @IsOptional()
  status?: number;

  @IsEmpty()
  @IsOptional()
  message?: string;

  @IsOptional()
  data?: T;
}
