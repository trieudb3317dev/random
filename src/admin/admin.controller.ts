import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserAdminDto } from './dto/create.dto';
import { AuthDto } from './dto/auth.dto';
import { JwtAuthAdminGuard } from './guards/jwt-auth-admin.guard';
import { Response } from 'express';
import { PC_ConfigDto } from 'src/probability_config/dto/pc_config.dto';

@Controller('admin')
export class AdminController {
  constructor(protected readonly adminService: AdminService) {}

  @Post()
  async createAdmin(@Body() createAdminDtio: CreateUserAdminDto) {
    return this.adminService.createAdmin(createAdminDtio);
  }

  @Post('/auth')
  async auth(
    @Body() authDto: AuthDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.adminService.auth(authDto, response);
  }

  @Get()
  @UseGuards(JwtAuthAdminGuard)
  async findAll() {
    return this.adminService.findAll();
  }

  @Post('/pc-config')
  @UseGuards(JwtAuthAdminGuard)
  async createPC_Config(@Body() pcConfigDto: PC_ConfigDto) {
    return this.adminService.createProbabilityConfig(pcConfigDto);
  }

  @Get('/pc-config')
  @UseGuards(JwtAuthAdminGuard)
  async findAllPC_Configs() {
    return this.adminService.findAllPC_Configs();
  }
}
