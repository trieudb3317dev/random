import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
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

  @Get('/all-pc-admin')
  @UseGuards(JwtAuthAdminGuard)
  async findAllPC_ConfigByAdmin(@Req() req: any) {
    return this.adminService.findPC_ConfigByEmail(req.user);
  }

  @Post('/pc-config')
  @UseGuards(JwtAuthAdminGuard)
  async createPC_Config(@Body() pcConfigDto: PC_ConfigDto, @Req() req: any) {
    return this.adminService.createProbabilityConfig(pcConfigDto, req.user);
  }

  @Get('/pc-config')
  @UseGuards(JwtAuthAdminGuard)
  async findAllPC_Configs() {
    return this.adminService.findAllPC_Configs();
  }

  @Patch('/pc-config/:id')
  @UseGuards(JwtAuthAdminGuard)
  async removePC_Config(@Param('id') id: number, @Req() req: any) {
    return this.adminService.removePC_Config(id, req.user);
  }

  @Get('/pc-config-totals')
  @UseGuards(JwtAuthAdminGuard)
  async getPC_ConfigTotals() {
    return this.adminService.findPC_ConfigTotal();
  }

  @Get('/pc-config/:id')
  @UseGuards(JwtAuthAdminGuard)
  async getPC_Config(@Param('id') id: number) {
    return this.adminService.getPC_ConfigById(id);
  }

  @Post('/import-player')
  async importPlayer(@Body('data') data: string) {
    return this.adminService.importPlayer(data);
  }

  @Post('/random')
  @UseGuards(JwtAuthAdminGuard)
  async random(@Req() req: any) {
    return this.adminService.random(req.user);
  }
}
