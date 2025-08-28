import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthAdminGuard } from 'src/admin/guards/jwt-auth-admin.guard';
import { ProbabilityConfigService } from './pc.service';
import { PC_ConfigDto } from './dto/pc_config.dto';

@Controller('pc-config')
export class ProbabilityConfigController {
  constructor(
    private readonly probabilityConfigService: ProbabilityConfigService,
  ) {}

  @Post()
  @UseGuards(JwtAuthAdminGuard)
  async createPC_Config(@Body() pcConfigDto: PC_ConfigDto, @Req() req: any) {
    return this.probabilityConfigService.createProbabilityConfig(
      pcConfigDto,
      req.user,
    );
  }

  @Post('/array')
  @UseGuards(JwtAuthAdminGuard)
  async createPC_Configs(@Body() pcConfigDto: PC_ConfigDto[], @Req() req: any) {
    return this.probabilityConfigService.createProbabilityConfigs(
      pcConfigDto,
      req.user,
    );
  }

  @Get()
  @UseGuards(JwtAuthAdminGuard)
  async findAllPC_Configs() {
    return this.probabilityConfigService.findAllPC_Configs();
  }

  @Get('/by-admin')
  @UseGuards(JwtAuthAdminGuard)
  async findAllPC_ConfigByAdmin(@Req() req: any) {
    return this.probabilityConfigService.findPC_ConfigByEmail(req.user);
  }

  @Patch('/edit/:id')
  @UseGuards(JwtAuthAdminGuard)
  async PC_ConeditfigById(
    @Param('id') id: number,
    @Req() req: any,
    @Body() { pc_value, pc_percent }: { pc_value: string; pc_percent: number },
  ): Promise<any> {
    return this.probabilityConfigService.editPC_ConfigByid(id, req.user, {
      pc_value,
      pc_percent,
    });
  }

  @Patch('/edit-arrays')
  @UseGuards(JwtAuthAdminGuard)
  async PC_Coneditfigs(
    @Req() req: any,
    @Body() configs: { id: number; pc_value: string; pc_percent: number }[],
  ): Promise<any> {
    return this.probabilityConfigService.editPC_ConfigsBulk(req.user, configs);
  }

  @Get('/:id')
  @UseGuards(JwtAuthAdminGuard)
  async getPC_Config(@Param('id') id: number) {
    return this.probabilityConfigService.getPC_ConfigById(id);
  }

  @Patch('/remove/:id')
  @UseGuards(JwtAuthAdminGuard)
  async removePC_ConfigById(
    @Param('id') id: number,
    @Req() req: any,
  ): Promise<any> {
    return this.probabilityConfigService.removePC_ConfigByid(id, req.user);
  }

  @Patch('/remove-array')
  @UseGuards(JwtAuthAdminGuard)
  async removePC_Configs(
    @Body('ids') ids: number[],
    @Req() req: any,
  ): Promise<any> {
    return this.probabilityConfigService.removePC_ConfigsBulk(ids, req.user)
  }
}
