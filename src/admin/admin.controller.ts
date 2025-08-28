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

  @Patch('/remove-player/:id')
  @UseGuards(JwtAuthAdminGuard)
  async removePC_Config(@Param('id') id: number, @Req() req: any) {
    return this.adminService.removePC_Config(id, req.user);
  }

  @Patch('/remove-players')
  @UseGuards(JwtAuthAdminGuard)
  async removePC_Configs(@Body('ids') ids: number[], @Req() req: any) {
    return this.adminService.removePC_ConfigBulk(ids, req.user);
  }

  @Post('/import-player')
  @UseGuards(JwtAuthAdminGuard)
  async importPlayer(@Body('data') data: string, @Req() req: any) {
    return this.adminService.importPlayer(data, req.user);
  }

  @Post('/create-player')
  @UseGuards(JwtAuthAdminGuard)
  async createPlayer(@Body('data') data: string, @Req() req: any) {
    return this.adminService.importPlayerList(data, req.user);
  }

  @Get('/player-final')
  async getPlayerFinal(): Promise<any> {
    return this.adminService.findplayerFinal();
  }

  @Get('/player/:id')
  async getPlayerFinalOne(@Param('id') id: number): Promise<any> {
    return this.adminService.findplayerFinalOne(id);
  }

  @Patch('/update-player/:id')
  async updatePlayerFinalOne(
    @Param('id') id: number,
    @Body() pc_value: string,
  ): Promise<any> {
    return this.adminService.updateplayerFinalOne(id, pc_value);
  }

  @Patch('/update-players')
  async updatePlayerFinals(
    @Body() updates: { id: number; pc_value: string }[],
  ): Promise<any> {
    return this.adminService.updateplayerFinalBulk(updates);
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

  @Post('/check-change-pc')
  @UseGuards(JwtAuthAdminGuard)
  async checkAndChangPC_Config(@Req() req: any): Promise<any> {
    return this.adminService.checkPC_Config(req.user);
  }

  @Post('/random-spin')
  @UseGuards(JwtAuthAdminGuard)
  async spinRandom(@Req() req: any): Promise<any> {
    return this.adminService.randomPlay(req.user);
  }
}
