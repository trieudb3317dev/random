import { Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('/all')
  async getAllHistory(): Promise<any> {
    return this.historyService.findAll();
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
  async removeAllHistoryById(): Promise<any> {
    return this.historyService.removeAllHistoryById();
  }

  @Get('/player/spin')
  async getPlayerSpin(): Promise<any> {
    return this.historyService.findPlayerSpin();
  }
}
