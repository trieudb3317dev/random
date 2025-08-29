import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthAdminGuard } from 'src/admin/guards/jwt-auth-admin.guard';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('/all')
  async getAllHistory(): Promise<any> {
    return this.historyService.findAll();
  }

  @Get('/admin-all')
  @UseGuards(JwtAuthAdminGuard)
  async getAllByAdminHistory(@Req() req: any): Promise<any> {
    return this.historyService.findAllByAdmin(req.user);
  }

  @Get('/:id')
  async getAHistory(@Param('id') id: number): Promise<any> {
    return this.historyService.findById(id);
  }

  @Patch('/remove/:id')
  async removeHistoryById(@Param('id') id: number): Promise<any> {
    return this.historyService.removeHistoryById(id);
  }

  @Patch('/remove-all')
  @UseGuards(JwtAuthAdminGuard)
  async removeAllHistoryById(@Req() req: any): Promise<any> {
    return this.historyService.removeAllHistoryById(req.user);
  }

  @Get('/player/spin')
  async getPlayerSpin(): Promise<any> {
    return this.historyService.findPlayerSpin();
  }

  @Get('/player/spin-admin')
  @UseGuards(JwtAuthAdminGuard)
  async getPlayerSpinByAdmin(@Req() req: any): Promise<any> {
    return this.historyService.findPlayerSpinByAdmin(req.user);
  }
}
