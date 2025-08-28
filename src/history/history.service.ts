import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HistoryEntity, StatusEnum } from './entities/history.entity';
import { Repository } from 'typeorm';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(HistoryEntity)
    private readonly historyRepository: Repository<HistoryEntity>,
  ) {}

  async findAll(): Promise<any> {
    const data = await this.historyRepository.find({
      where: { is_active: false },
      relations: { history_admin_id: true },
      select: {
        id: true,
        history_result: true,
        history_time: true,
        status: true,
        history_admin_id: {
          email: true,
          role: true,
          status: true,
        },
      },
    });

    if (!data) {
      return { message: 'History none content' };
    }

    return { message: 'success', histories: data };
  }

  async findById(id: number): Promise<any> {
    const findHistory = await this.historyRepository.findOne({
      where: { is_active: false, id: id },
      relations: { history_admin_id: true },
      select: {
        id: true,
        history_result: true,
        history_time: true,
        status: true,
        history_admin_id: {
          email: true,
          role: true,
          status: true,
        },
      },
    });

    if (!findHistory) {
      return { message: 'Content history not found' };
    }

    return { message: 'success', findHistory };
  }

  async removeHistoryById(id: number): Promise<any> {
    const findHistory = await this.historyRepository.findOne({
      where: { is_active: false, id: id },
      relations: { history_admin_id: true },
      select: {
        id: true,
        history_result: true,
        history_time: true,
        status: true,
        history_admin_id: {
          email: true,
          role: true,
          status: true,
        },
      },
    });

    if (!findHistory) {
      return { message: 'Content history not found' };
    }

    findHistory.is_active = true;
    await this.historyRepository.save(findHistory);

    return { message: 'success', findHistory };
  }

  async removeAllHistoryById(): Promise<any> {
    const findHistories = await this.historyRepository.find({
      where: { is_active: false },
      relations: { history_admin_id: true },
      select: {
        id: true,
        history_result: true,
        history_time: true,
        history_admin_id: {
          email: true,
          role: true,
          status: true,
        },
      },
    });

    if (!findHistories) {
      return { message: 'Content history not found' };
    }

    const result = findHistories.map((item) => {
      item.is_active = true;
      this.historyRepository.save(item);
    });

    return { message: 'success', result, findHistories };
  }

  async findPlayerSpin(): Promise<any> {
    const data = await this.historyRepository.find({
      where: { is_active: false },
      relations: { history_admin_id: true },
      select: {
        id: true,
        history_result: true,
        history_time: true,
        status: true,
        history_admin_id: {
          email: true,
          role: true,
          status: true,
        },
      },
    });

    if (!data) {
      return { message: 'History none content' };
    }

    const players = data.filter((item) => item.status === StatusEnum.SPIN);

    if (!players) {
      return { message: 'None player spin' };
    }

    return { message: 'success', players };
  }
}
