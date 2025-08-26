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

  @Patch('/remove-pc-config/:id')
  @UseGuards(JwtAuthAdminGuard)
  async removePC_ConfigById(
    @Param('id') id: number,
    @Req() req: any,
  ): Promise<any> {
    return this.adminService.removePC_ConfigByid(id, req.user);
  }

  @Patch('/edit-pc-config/:id')
  @UseGuards(JwtAuthAdminGuard)
  async PC_ConeditfigById(
    @Param('id') id: number,
    @Req() req: any,
    @Body() { pc_value, pc_percent }: { pc_value: string; pc_percent: number },
  ): Promise<any> {
    return this.adminService.editPC_ConfigByid(id, req.user, {
      pc_value,
      pc_percent,
    });
  }

  @Patch('/remove-player/:id')
  @UseGuards(JwtAuthAdminGuard)
  async removePC_Config(@Param('id') id: number, @Req() req: any) {
    return this.adminService.removePC_Config(id, req.user);
  }

  @Get('/pc-config/:id')
  @UseGuards(JwtAuthAdminGuard)
  async getPC_Config(@Param('id') id: number) {
    return this.adminService.getPC_ConfigById(id);
  }

  @Post('/import-player')
  @UseGuards(JwtAuthAdminGuard)
  async importPlayer(@Body('data') data: string, @Req() req: any) {
    return this.adminService.importPlayer(data, req.user);
  }

  @Get('/player-final')
  async getPlayerFinal(): Promise<any> {
    return this.adminService.findplayerFinal();
  }

  @Get('/player-final-one/:id')
  async getPlayerFinalOne(@Param('id') id: number): Promise<any> {
    return this.adminService.findplayerFinalOne(id);
  }

  @Patch('/player-final-one/:id')
  async updatePlayerFinalOne(
    @Param('id') id: number,
    @Body() pc_value: string,
  ): Promise<any> {
    return this.adminService.updateplayerFinalOne(id, pc_value);
  }

  @Post('/create-new-player')
  @UseGuards(JwtAuthAdminGuard)
  async createNewPlayer(@Body('data') data: string, @Req() req: any) {
    return this.adminService.createNewPlayer(data, req.user);
  }

  @Post('/create-equally-divided')
  @UseGuards(JwtAuthAdminGuard)
  async createEquallyDivided(@Body('data') data: string, @Req() req: any) {
    return this.adminService.createEquallyDivided(data, req.user);
  }

  @Post('/random')
  @UseGuards(JwtAuthAdminGuard)
  async random(@Req() req: any) {
    return this.adminService.random(req.user);
  }

  @Post('/check-change-pc')
  @UseGuards(JwtAuthAdminGuard)
  async checkAndChangPC_Config(@Req() req: any): Promise<any> {
    return this.adminService.checkPC_Config(req.user);
  }
}
