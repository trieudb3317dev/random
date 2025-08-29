import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';
import { ProbabilityConfigEntity } from './entities/pc.entity';
import { HistoryEntity, StatusEnum } from 'src/history/entities/history.entity';
import { ProbabilityConfigFinalEntity } from 'src/total_probability_config/entities/pc_config_final.entity';
import { PC_ConfigDto } from './dto/pc_config.dto';
import { ApiResponseDto } from 'src/res/res.dto';
import { Repository } from 'typeorm';

@Injectable()
export class ProbabilityConfigService {
  constructor(
    @InjectRepository(UserAdminEntity)
    private readonly userAdminRepository: Repository<UserAdminEntity>,
    @InjectRepository(ProbabilityConfigEntity)
    private readonly pcConfigRepository: Repository<ProbabilityConfigEntity>,
    @InjectRepository(HistoryEntity)
    private readonly historyRepository: Repository<HistoryEntity>,
    @InjectRepository(ProbabilityConfigFinalEntity)
    private readonly probabilityConfigFinalRepository: Repository<ProbabilityConfigFinalEntity>,
  ) {}

  async findAllPC_Configs(): Promise<ApiResponseDto<any>> {
    const pcConfigs = await this.pcConfigRepository.find({
      where: { is_active: false },
      relations: ['pc_admin_id'],
      select: {
        pc_id: true,
        pc_value: true,
        pc_percent: true,
        pc_admin_id: { email: true, role: true, status: true },
      },
    });
    return {
      status: HttpStatus.OK,
      message: 'Probability configs retrieved',
      data: pcConfigs,
    };
  }

  async getPC_ConfigById(pc_id: number): Promise<ApiResponseDto<any>> {
    const pcConfig = await this.pcConfigRepository.findOne({
      where: { pc_id, is_active: false },
      relations: ['pc_admin_id'],
      select: {
        pc_id: true,
        pc_value: true,
        pc_percent: true,
        pc_admin_id: { email: true, role: true, status: true },
      },
    });

    if (!pcConfig || pcConfig.is_active === true) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Probability config not found',
      };
    }

    if (pcConfig.is_active) {
      // throw new Error('Probability config is inactive');
      return { message: 'Probability config is inactive', data: null };
    }

    return {
      status: HttpStatus.OK,
      message: 'Probability config retrieved',
      data: pcConfig,
    };
  }

  async findPC_ConfigByEmail(admin: any): Promise<ApiResponseDto<any>> {
    const admins = await this.userAdminRepository.find({
      where: {
        email: admin.email,
        pc_configs: {
          is_active: false,
        },
      },
      relations: ['pc_configs'],
      select: {
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        pc_configs: { pc_id: true, pc_value: true, pc_percent: true },
      },
    });
    return {
      status: HttpStatus.OK,
      message: 'Admin users retrieved by admin successfully',
      data: admins,
    };
  }

  async createProbabilityConfig(
    pcConfigDto: PC_ConfigDto,
    admin: UserAdminEntity,
  ): Promise<ApiResponseDto<any>> {
    let pcConfig: ProbabilityConfigEntity;
    let pc_percent_change;

    const pc_configs = await this.pcConfigRepository.find({
      where: { is_active: false },
    });

    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
      relations: { pc_configs: true },
    });

    const checkPC_ValueExisted = pc_configs.some(
      (pc_config) => pc_config.pc_value === pcConfigDto.pc_value,
    );

    const pc_configExisted = pc_configs.filter(
      (pcf) => pcf.pc_value === pcConfigDto.pc_value,
    );

    if (checkPC_ValueExisted) {
      pcConfigDto.isChange = true;
      pc_percent_change = pcConfigDto.pc_percent;
    }

    const newConfig = {
      ...pcConfigDto,
      pc_percent: pc_percent_change
        ? pc_percent_change
        : pcConfigDto.pc_percent,
      pc_admin_id: findAdmin ? findAdmin : null,
    };

    console.log('checkPC_ValueExisted: ', checkPC_ValueExisted);

    if (checkPC_ValueExisted) {
      return {
        status: HttpStatus.CONFLICT,
        message: `${pcConfigDto.pc_value} already existed!`,
      };
    }

    if (
      !pcConfigDto ||
      typeof pcConfigDto.pc_value !== 'string' ||
      typeof pcConfigDto.pc_percent !== 'number' ||
      pcConfigDto.pc_value === '' ||
      pcConfigDto.pc_percent < 0
    ) {
      return {
        message:
          'pc_value and pc_percent not empty, pc_value must string, pc_percent must number or float but not nagative number',
      };
    }

    if (
      pcConfigDto.pc_value.trim().length < 1 ||
      pcConfigDto.pc_value.trim().length > 50
    ) {
      return { message: 'pc_value must least 1 character and less than 50' };
    }

    if (
      pcConfigDto.pc_value[pcConfigDto.pc_value.length - 1] === ' ' ||
      pcConfigDto.pc_value[0] === ' '
    ) {
      return {
        message: 'pc_value must not space at the first and last string',
      };
    }

    // if (findAdmin.pc_total === findAdmin.pc_used) {
    //   return {
    //     message: `pc_percent been used full`,
    //   };
    // }

    // if (pcConfigDto.pc_percent > findAdmin.pc_total - findAdmin.pc_used) {
    //   return {
    //     message: `pc_percent must less than ${findAdmin.pc_total - findAdmin.pc_used}`,
    //   };
    // }

    if (!findAdmin) {
      return { message: 'Unauthorized' };
    }

    let pcTotalReal = 0;

    if (findAdmin && findAdmin.pc_configs) {
      pcTotalReal = findAdmin.pc_configs.reduce(
        (total, config) => total + config.pc_percent,
        0,
      );
    }

    console.log('pcTotalReal: ', pcTotalReal);

    // if (
    //   pcConfigDto.pc_percent < 0 ||
    //   pcConfigDto.pc_percent > 100 - pcTotalReal
    // ) {
    //   return {
    //     message: `pc_percent must be between 0 and ${100 - pcTotalReal}`,
    //   };
    // }

    if (pcConfig && pcConfig.pc_value === pcConfigDto.pc_value) {
      return {
        message: `${pcConfig.pc_value} already exists!`,
      };
    }

    pcConfig = this.pcConfigRepository.create(newConfig);
    await this.pcConfigRepository.save(pcConfig);

    let newPC_Total = null;

    // if (pcTotalReal + pcConfig.pc_percent > 100) {
    //   const pcConfig = null;
    //   return {
    //     message: `Total pc_percent exceeds 100. Current total: ${pcTotalReal}, New pc_percent: ${pcConfig.pc_percent}`,
    //   };
    // }

    if (findAdmin && findAdmin.email === admin.email) {
      if (!findAdmin.pc_configs) {
        findAdmin.pc_configs = [pcConfig];
        // findAdmin.pc_used = pcConfigDto.pc_percent;
        await this.userAdminRepository.save(findAdmin);
      }
      findAdmin.pc_configs = [...findAdmin.pc_configs, pcConfig];
      // findAdmin.pc_used = pcTotalReal + pcConfig.pc_percent;
      await this.userAdminRepository.save(findAdmin);
    }

    // Lưu lịch sử nếu cần
    const historyEntry = this.historyRepository.create({
      history_admin_id: admin,
      history_time: new Date(),
      history_result: pcConfig.pc_value,
      status: StatusEnum.CREATED,
    });
    await this.historyRepository.save(historyEntry);

    return {
      status: HttpStatus.CREATED,
      message: 'Probability config created',
      data: pcConfig,
    };
  }

  async createProbabilityConfigs(
    pcConfigDtos: PC_ConfigDto[],
    admin: UserAdminEntity,
  ): Promise<ApiResponseDto<any>> {
    if (!Array.isArray(pcConfigDtos) || pcConfigDtos.length === 0) {
      return { message: 'Input must be a non-empty array of configs' };
    }

    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
      relations: { pc_configs: true },
    });

    if (!findAdmin) {
      return { status: HttpStatus.UNAUTHORIZED, message: 'Unauthorized' };
    }

    // Lấy các pc_value đã tồn tại
    const existedValues = (findAdmin.pc_configs || []).map(
      (cfg) => cfg.pc_value,
    );

    // Kiểm tra trùng lặp trong mảng mới
    const newValues = pcConfigDtos.map((cfg) => cfg.pc_value);
    const hasDuplicate = new Set(newValues).size !== newValues.length;
    if (hasDuplicate) {
      return { message: 'Duplicate pc_value in input array' };
    }

    // Kiểm tra trùng với database
    const duplicated = newValues.filter((val) => existedValues.includes(val));
    if (duplicated.length > 0) {
      return { message: `pc_value already existed: ${duplicated.join(', ')}` };
    }

    // Kiểm tra từng config hợp lệ
    for (const dto of pcConfigDtos) {
      if (
        typeof dto.pc_value !== 'string' ||
        dto.pc_value.trim().length < 1 ||
        dto.pc_value.trim().length > 50 ||
        typeof dto.pc_percent !== 'number' ||
        dto.pc_percent < 0 ||
        dto.pc_value[0] === ' ' ||
        dto.pc_value[dto.pc_value.length - 1] === ' '
      ) {
        return { message: `Invalid config: ${JSON.stringify(dto)}` };
      }
    }

    // Tính tổng xác suất đã dùng
    const pcTotalReal = (findAdmin.pc_configs || []).reduce(
      (total, config) => total + config.pc_percent,
      0,
    );
    const newTotal = pcConfigDtos.reduce(
      (total, config) => total + config.pc_percent,
      0,
    );

    let pc_random = [];
    let random_players: PC_ConfigDto[] = [];

    // if (pcTotalReal + newTotal > 100) {
    //   return {
    //     message: `Total pc_percent exceeds 100. Current: ${pcTotalReal}, New: ${newTotal}`,
    //   };
    // }

    const totalNewPercent = pcConfigDtos.reduce(
      (total, config) => total + config.pc_percent,
      0,
    );

    const checkZeroPercent = pcConfigDtos.filter(
      (item) => item.pc_percent === 0,
    );

    const manualConfigs = pcConfigDtos.filter((item) => item.pc_percent !== 0);

    const manualConfigPercent = manualConfigs.reduce(
      (total, config) => total + config.pc_percent,
      0,
    );

    const autoPlayers = pcConfigDtos.filter((item) => item.pc_percent === 0);

    if (totalNewPercent > 100) {
      return { message: 'Probability less than 100' };
    } else {
      if (checkZeroPercent && manualConfigPercent <= 100) {
        // Chia đều xác suất cho các player còn lại
        autoPlayers.forEach((player) => {
          pc_random.push({
            pc_value: player.pc_value,
            pc_percent:
              autoPlayers.length > 0
                ? (100 - manualConfigPercent) / autoPlayers.length
                : 0,
          });
        });

        // Ghép lại danh sách random_players
        random_players.push(...manualConfigs, ...pc_random);
      } else if (manualConfigPercent > 100) {
        return { message: 'Probability less than 100' };
      } else {
        random_players.push(...pcConfigDtos);
      }
    }

    // Tạo và lưu hàng loạt
    const newConfigs = random_players.map((dto) =>
      this.pcConfigRepository.create({
        ...dto,
        pc_admin_id: findAdmin,
      }),
    );
    await this.pcConfigRepository.save(newConfigs);

    // Cập nhật lại pc_used cho admin
    findAdmin.pc_configs = [...(findAdmin.pc_configs || []), ...newConfigs];
    // findAdmin.pc_used = pcTotalReal + newTotal;
    await this.userAdminRepository.save(findAdmin);

    // Lưu lịch sử
    const historyEntry = this.historyRepository.create({
      history_admin_id: admin,
      history_time: new Date(),
      history_result: `Created configs: ${newConfigs.map((c) => c.pc_value).join(', ')}`,
      status: StatusEnum.CREATED,
    });
    await this.historyRepository.save(historyEntry);

    return {
      status: HttpStatus.CREATED,
      message: 'Probability configs created',
      data: newConfigs,
    };
  }

  async editPC_ConfigByid(
    id: number,
    admin: any,
    { pc_value, pc_percent }: { pc_value: string; pc_percent: number },
  ): Promise<any> {
    console.log(pc_percent, pc_value);
    const findPC_Config = await this.pcConfigRepository.findOne({
      where: { pc_id: id, is_active: false },
      relations: { pc_admin_id: true },
    });

    if (!findPC_Config) {
      return { message: 'PC_Config not found' };
    }

    if (!pc_value || !pc_percent || pc_value === '') {
      return { message: 'pc_value and pc_percent not empty' };
    }

    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
    });

    if (!findAdmin) {
      return { message: 'Admin not found' };
    }

    // if (pc_percent > findAdmin.pc_total - findAdmin.pc_used) {
    //   return {
    //     message: `pc_percent must less than ${findAdmin.pc_total - findAdmin.pc_used}`,
    //   };
    // }

    // if (findAdmin.pc_used === 0) {
    //   findAdmin.pc_used = pc_percent;
    // }

    // findAdmin.pc_used =
    //   findAdmin.pc_used - (findPC_Config.pc_percent - pc_percent);
    // await this.userAdminRepository.save(findAdmin);

    findPC_Config.pc_value = pc_value;
    findPC_Config.pc_percent = pc_percent;

    await this.pcConfigRepository.save(findPC_Config);

    // Lưu lịch sử nếu cần
    const historyEntry = this.historyRepository.create({
      history_admin_id: admin,
      history_time: new Date(),
      history_result: findPC_Config.pc_value,
      status: StatusEnum.UPDATED,
    });
    await this.historyRepository.save(historyEntry);

    return { message: 'Update success' };
  }

  async editPC_ConfigsBulk(
    admin: any,
    configs: { id: number; pc_value: string; pc_percent: number }[],
  ): Promise<ApiResponseDto<any>> {
    console.log(configs);
    if (!Array.isArray(configs) || configs.length === 0) {
      return { message: 'Input must be a non-empty array' };
    }

    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
      relations: { pc_configs: true },
    });

    if (!findAdmin) {
      return { message: 'Admin not found' };
    }

    // Lấy các config hiện tại của admin
    const currentConfigs = findAdmin.pc_configs || [];
    const currentConfigIds = currentConfigs.map((cfg) => cfg.pc_id);

    // Chỉ lấy các config thuộc về admin hiện tại
    const validConfigs = configs.filter((cfg) =>
      currentConfigIds.includes(cfg.id),
    );

    if (validConfigs.length !== configs.length) {
      return { message: 'Some configs do not belong to this admin' };
    }

    // Kiểm tra tổng xác suất mới
    let newTotalPercent = 0;
    for (const cfg of validConfigs) {
      if (
        !cfg.pc_value ||
        typeof cfg.pc_percent !== 'number' ||
        cfg.pc_value.trim() === '' ||
        cfg.pc_percent < 0
      ) {
        return { message: `Invalid config: ${JSON.stringify(cfg)}` };
      }
      newTotalPercent += cfg.pc_percent;
    }

    // if (newTotalPercent > 100) {
    //   return { message: `Total pc_percent exceeds 100: ${newTotalPercent}` };
    // }

    // Cập nhật từng config
    for (const cfg of validConfigs) {
      const findPC_Config = await this.pcConfigRepository.findOne({
        where: { pc_id: cfg.id, is_active: false },
        relations: { pc_admin_id: true },
      });

      console.log(findPC_Config);

      // Đảm bảo chỉ sửa config của admin hiện tại
      if (!findPC_Config || findPC_Config.pc_admin_id.id !== findAdmin.id) {
        return {
          message: `PC_Config not found or not belong to this admin: id ${cfg.id}`,
        };
      }

      findPC_Config.pc_value = cfg.pc_value;
      findPC_Config.pc_percent = cfg.pc_percent;
      await this.pcConfigRepository.save(findPC_Config);

      // Lưu lịch sử nếu cần
      const historyEntry = this.historyRepository.create({
        history_admin_id: admin,
        history_time: new Date(),
        history_result: findPC_Config.pc_value,
        status: StatusEnum.UPDATED,
      });
      await this.historyRepository.save(historyEntry);
    }

    // Tính lại tổng xác suất của tất cả config thuộc admin (không chỉ các config vừa sửa)
    // const allConfigs = await this.pcConfigRepository.find({
    //   where: { is_active: false },
    //   relations: { pc_admin_id: true },
    // });

    // const allAdminConfigs = allConfigs.filter(
    //   (acfg) => acfg.pc_admin_id.email === findAdmin.email,
    // );

    // console.log(allAdminConfigs);

    // const totalPercent = allAdminConfigs.reduce(
    //   (sum, cfg) => sum + cfg.pc_percent,
    //   0,
    // );

    // findAdmin.pc_used = totalPercent;
    // await this.userAdminRepository.save(findAdmin);

    return {
      status: HttpStatus.OK,
      message: 'Bulk update success',
      data: newTotalPercent,
    };
  }

  async removePC_ConfigByid(
    id: number,
    admin: any,
  ): Promise<ApiResponseDto<any>> {
    const findPC_Config = await this.pcConfigRepository.findOne({
      where: { pc_id: id, is_active: false },
      relations: { pc_admin_id: true },
    });

    if (!findPC_Config) {
      return { message: 'PC_Config not found' };
    }

    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
    });

    if (!findAdmin) {
      return { message: 'Admin not found' };
    }

    // findAdmin.pc_used = findAdmin.pc_used - findPC_Config.pc_percent;
    // await this.userAdminRepository.save(findAdmin);

    findPC_Config.is_active = true;
    findPC_Config.pc_percent = 0;
    await this.pcConfigRepository.save(findPC_Config);

    // Lưu lịch sử nếu cần
    const historyEntry = this.historyRepository.create({
      history_admin_id: admin,
      history_time: new Date(),
      history_result: findPC_Config.pc_value,
      status: StatusEnum.DELETED,
    });
    await this.historyRepository.save(historyEntry);

    return { status: HttpStatus.OK, message: 'Remove success' };
  }

  async removePC_ConfigsBulk(ids: number[], admin: any): Promise<any> {
    console.log(ids);
    if (!Array.isArray(ids) || ids.length === 0) {
      return { message: 'Input must be a non-empty array of ids' };
    }

    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
      relations: { pc_configs: true },
    });

    if (!findAdmin) {
      return { message: 'Admin not found' };
    }

    // Chỉ xóa các config thuộc về admin hiện tại
    const configsToRemove = findAdmin.pc_configs.filter((cfg) =>
      ids.includes(cfg.pc_id),
    );

    console.log(configsToRemove);

    if (configsToRemove.length === 0) {
      return { message: 'No configs found for this admin to remove' };
    }

    // Đánh dấu is_active và pc_percent = 0 cho từng config
    for (const cfg of configsToRemove) {
      cfg.is_active = true;
      cfg.pc_percent = 0;
      await this.pcConfigRepository.save(cfg);

      // Lưu lịch sử nếu cần
      const historyEntry = this.historyRepository.create({
        history_admin_id: admin,
        history_time: new Date(),
        history_result: cfg.pc_value,
        status: StatusEnum.DELETED,
      });
      await this.historyRepository.save(historyEntry);
    }

    // Tính lại tổng xác suất của admin sau khi xóa
    // const activeConfigs = await this.pcConfigRepository.find({
    //   where: { is_active: false },
    //   relations: { pc_admin_id: true },
    // });
    // const adminActiveConfigs = activeConfigs.filter(
    //   (cfg) => cfg.pc_admin_id.email === findAdmin.email,
    // );
    // const totalPercent = adminActiveConfigs.reduce(
    //   (sum, cfg) => sum + cfg.pc_percent,
    //   0,
    // );

    // findAdmin.pc_used = totalPercent;
    // await this.userAdminRepository.save(findAdmin);

    return {
      message: 'Bulk remove success',
      removed: configsToRemove.map((cfg) => cfg.pc_value),
    };
  }
}
