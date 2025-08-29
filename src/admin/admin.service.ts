import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAdminEntity, UserAdminStatus } from './entities/user-admin.entity';
import { Repository } from 'typeorm';
import { CreateUserAdminDto } from './dto/create.dto';
import * as bcrypt from 'bcrypt';
import { AuthDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { PC_ConfigDto } from 'src/probability_config/dto/pc_config.dto';
import { ProbabilityConfigEntity } from 'src/probability_config/entities/pc.entity';
import { HistoryEntity, StatusEnum } from 'src/history/entities/history.entity';
import { ProbabilityConfigFinalEntity } from 'src/total_probability_config/entities/pc_config_final.entity';
import { ApiResponseDto } from 'src/res/res.dto';
import { ProbabilityConfigService } from 'src/probability_config/pc.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserAdminEntity)
    private readonly userAdminRepository: Repository<UserAdminEntity>,
    @InjectRepository(ProbabilityConfigEntity)
    private readonly pcConfigRepository: Repository<ProbabilityConfigEntity>,
    @InjectRepository(HistoryEntity)
    private readonly historyRepository: Repository<HistoryEntity>,
    @InjectRepository(ProbabilityConfigFinalEntity)
    private readonly probabilityConfigFinalRepository: Repository<ProbabilityConfigFinalEntity>,
    private readonly jwtService: JwtService,
    private readonly probabilityConfigService: ProbabilityConfigService,
  ) {}

  async createAdmin(
    createAdminDto: CreateUserAdminDto,
  ): Promise<ApiResponseDto<any>> {
    const salt = 10;
    const hashedPassword = await bcrypt.hash(createAdminDto.password, salt);

    const adminDto = {
      ...createAdminDto,
      emmail: createAdminDto.email,
      password: hashedPassword,
    };

    const findAdmins = await this.userAdminRepository.find({
      where: { status: UserAdminStatus.ACTIVE },
    });

    if (!findAdmins) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Not found list admin',
        data: null,
      };
    }

    const checkEmailExisted = findAdmins.some(
      (item) => item.email === createAdminDto.email,
    );

    if (checkEmailExisted) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'Email already existed!',
        data: null,
      };
    }

    const newAdmin = this.userAdminRepository.create(adminDto);

    // Lưu lịch sử nếu cần
    // const historyEntry = this.historyRepository.create({
    //   history_admin_id: newAdmin,
    //   history_time: new Date(),
    //   history_result: newAdmin.email,
    //   status: StatusEnum.CREATED,
    // });
    // await this.historyRepository.save(historyEntry);

    return {
      status: HttpStatus.CREATED,
      message: 'Admin user created successfully',
      data: await this.userAdminRepository.save(newAdmin),
    };
  }

  async auth(
    authDto: AuthDto,
    response: Response,
  ): Promise<ApiResponseDto<any>> {
    if (
      !authDto ||
      typeof authDto.email !== 'string' ||
      typeof authDto.password !== 'string' ||
      authDto.email === ' ' ||
      authDto.password === ' '
    ) {
      return { message: 'Email, Password must none-empty' };
    }

    let re =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (!re.test(authDto.email)) {
      return { message: 'Email no correct format' };
    }
    const user = await this.userAdminRepository.findOne({
      where: { email: authDto.email },
    });
    if (!user) {
      return { status: HttpStatus.NOT_FOUND, message: 'Admin user not found' };
    }

    const isPasswordValid = await bcrypt.compare(
      authDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      return { status: HttpStatus.UNAUTHORIZED, message: 'Invalid password' };
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    response.cookie('access_token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'none',
      secure: process.env.NODE_ENV === 'production',
    });

    // Lưu lịch sử nếu cần
    const historyEntry = this.historyRepository.create({
      history_admin_id: user,
      history_time: new Date(),
      history_result: user.email,
      status: StatusEnum.AUTH,
    });
    await this.historyRepository.save(historyEntry);

    return {
      status: HttpStatus.CREATED,
      message: 'Authentication successful',
      data: token,
    };
  }

  async validateAdmin(email: string): Promise<any> {
    const user = await this.userAdminRepository.findOne({
      where: { email: email },
    });
    if (!user) {
      return { message: 'Admin user not found' };
    }
    return user;
  }

  async findAll(): Promise<ApiResponseDto<any>> {
    const admins = await this.userAdminRepository.find({
      relations: ['pc_configs'],
      where: {
        status: UserAdminStatus.ACTIVE,
      },
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
      message: 'Admin users retrieved successfully',
      data: admins,
    };
  }

  // ===========================================================
  async importPlayer(data: string, admin: any): Promise<any> {
    const pc_player = [];
    const pc_random = [];
    const random_players = [];

    console.log('admin', admin);
    if (
      typeof data !== 'string' ||
      !data.trim() ||
      /^\d+$/.test(data.trim()) ||
      !data ||
      data.trim() === ''
    ) {
      return {
        message: 'Data must be a non-empty string and not a number',
      };
    }

    // Loại bỏ trùng lặp và chuẩn hóa dữ liệu
    let players = Array.from(
      new Set(
        data
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    // Tách player có xác suất riêng
    let manualConfigs = [];
    let autoPlayers = [];

    players.forEach((player) => {
      // Kiểm tra có xác suất riêng không (dạng "User A - 20")
      const match = player.match(/^(.+?)\s*-\s*(\d+)$/);
      if (match) {
        manualConfigs.push({
          pc_value: match[1].trim(),
          pc_percent: Number(match[2]),
        });
      } else {
        autoPlayers.push(player);
      }
    });

    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
      relations: { pc_configs: true },
    });

    if (!findAdmin) {
      return {
        message: 'Not auth',
      };
    }

    // Loại bỏ các player đã có xác suất riêng khỏi autoPlayers
    manualConfigs.forEach((mc) => {
      autoPlayers = autoPlayers.filter((p) => p !== mc.pc_value);
    });

    const pc_percent_used_0 = [...findAdmin.pc_configs].reduce(
      (total, config) => total + config.pc_percent,
      0,
    );

    // Tính tổng xác suất đã dùng
    const pc_percent_used = [...manualConfigs].reduce(
      (total, config) => total + config.pc_percent,
      0,
    );

    console.log('pc_percent_used: ', pc_percent_used);
    console.log('pc_percent_used_0: ', pc_percent_used_0);

    if (pc_percent_used === 100 && manualConfigs.length < autoPlayers.length) {
      return {
        message: `The probability is already 100 while the player in the list about: ${autoPlayers.length} person includes: ${autoPlayers}`,
      };
    }

    let pc_config_value_message: string;
    let checkPC_ConfigExisted: boolean;

    // Add manualConfigs into database
    manualConfigs.map((item) => {
      console.log('item: ', item);
      if (pc_percent_used > 100 || item.pc_percent > 100 - pc_percent_used_0) {
        return {
          message: `The probability configuration must be greater than 0 and less than or equal to ${100 - pc_percent_used_0}`,
        };
      }
      checkPC_ConfigExisted = findAdmin.pc_configs.some(
        (pc_config) => pc_config.pc_value === item.pc_value,
      );

      if (checkPC_ConfigExisted) {
        pc_config_value_message = `PC_Config already existed ${item.pc_value}`;
      }

      this.probabilityConfigService.createProbabilityConfig(
        {
          pc_value: item.pc_value,
          pc_percent: item.pc_percent,
          isChange: false,
        },
        admin,
      );
    });

    const pc_percent_remaining = 100 - pc_percent_used;

    // Chia đều xác suất cho các player còn lại
    autoPlayers.forEach((player) => {
      pc_random.push({
        pc_value: player,
        pc_percent:
          autoPlayers.length > 0
            ? pc_percent_remaining / autoPlayers.length
            : 0,
      });
    });

    // Ghép lại danh sách random_players
    random_players.push(...manualConfigs, ...pc_random);

    random_players.map((pc_final) => {
      if (pc_final.pc_percent > 100 - pc_percent_used_0) {
        return {
          message: `The probability configuration must be greater than 0 and less than ${100 - pc_percent_used_0}`,
        };
      } else {
        if (!checkPC_ConfigExisted) {
          const newItem = this.probabilityConfigFinalRepository.create({
            pc_value: pc_final.pc_value,
            pc_percent: pc_final.pc_percent,
          });
          this.probabilityConfigFinalRepository.save(newItem);
        }
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Lưu lịch sử nếu cần
    const historyEntry = this.historyRepository.create({
      history_admin_id: admin,
      history_time: new Date(),
      history_result: 'Add list player',
      status: StatusEnum.CREATED,
    });
    await this.historyRepository.save(historyEntry);

    return {
      message: 'Import player',
      random_players: checkPC_ConfigExisted
        ? 'Please config again'
        : random_players,
      pc_config_value_message: pc_config_value_message
        ? pc_config_value_message
        : null,
    };
  }

  async importPlayerList(data: string, admin: any): Promise<any> {
    if (typeof data !== 'string' || !data.trim() || /^\d+$/.test(data.trim())) {
      return {
        message: 'Data must be a non-empty string and not a number',
      };
    }

    // Loại bỏ trùng lặp và chuẩn hóa dữ liệu
    const players = Array.from(
      new Set(
        data
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
    });

    if (!findAdmin) {
      return { message: 'Not auth' };
    }

    // Lưu từng người chơi vào bảng, không chia xác suất
    for (const player of players) {
      // Kiểm tra đã tồn tại chưa
      const existed = await this.probabilityConfigFinalRepository.findOne({
        where: { pc_value: player, is_active: false },
      });
      if (!existed) {
        const newItem = this.probabilityConfigFinalRepository.create({
          pc_value: player,
          pc_percent: 0,
        });
        await this.probabilityConfigFinalRepository.save(newItem);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Lưu lịch sử nếu cần
    const historyEntry = this.historyRepository.create({
      history_admin_id: admin,
      history_time: new Date(),
      history_result: 'Add list player',
      status: StatusEnum.CREATED,
    });
    await this.historyRepository.save(historyEntry);

    return {
      message: 'Import player success',
      players,
    };
  }

  async removePC_Config(pc_id: number, admin: any): Promise<any> {
    const pc_config = await this.probabilityConfigFinalRepository.findOne({
      where: { pc_fianl_id: Number(pc_id) },
    });

    if (!pc_config) {
      return { message: 'PC_Config not found' };
    }

    const findAdmin = await this.userAdminRepository.findOne({
      where: { id: admin.id },
    });

    if (!findAdmin) {
      return { message: 'Admin not auth' };
    }

    const pc_config_percent_deleted = pc_config.pc_percent;

    pc_config.is_active = true;
    pc_config.pc_percent = 0;

    await this.probabilityConfigFinalRepository.save(pc_config);

    const findPC_Config = await this.probabilityConfigFinalRepository.find();

    const filteredDeleted = findPC_Config.filter(
      (item) => item.is_active === true,
    );

    const filtered = findPC_Config.filter((item) => item.is_active !== true);

    filtered.map((it) => {
      it.pc_percent =
        it.pc_percent + pc_config_percent_deleted / filtered.length;

      this.probabilityConfigFinalRepository.save(findPC_Config);
    });

    // Lưu lịch sử nếu cần
    const historyEntry = this.historyRepository.create({
      history_admin_id: admin,
      history_time: new Date(),
      history_result: pc_config.pc_value,
      status: StatusEnum.DELETED,
    });
    await this.historyRepository.save(historyEntry);

    return {
      message: 'Probability config deleted',
      filtered,
      filteredDeleted,
      pc_config_percent_deleted,
    };
  }

  async removePC_ConfigBulk(pc_ids: number[], admin: any): Promise<any> {
    if (!Array.isArray(pc_ids) || pc_ids.length === 0) {
      return { message: 'Input must be a non-empty array of ids' };
    }

    // Lấy danh sách người chơi cần xóa
    const configsToDelete =
      await this.probabilityConfigFinalRepository.findByIds(pc_ids);

    if (configsToDelete.length === 0) {
      return { message: 'No PC_Config found to delete' };
    }

    // Tính tổng xác suất bị xóa
    const totalPercentDeleted = configsToDelete.reduce(
      (sum, cfg) => sum + cfg.pc_percent,
      0,
    );

    // Đánh dấu is_active và pc_percent = 0 cho từng config
    for (const cfg of configsToDelete) {
      cfg.is_active = true;
      cfg.pc_percent = 0;
      await this.probabilityConfigFinalRepository.save(cfg);

      // Lưu lịch sử nếu cần
      const historyEntry = this.historyRepository.create({
        history_admin_id: admin,
        history_time: new Date(),
        history_result: cfg.pc_value,
        status: StatusEnum.DELETED,
      });
      await this.historyRepository.save(historyEntry);
    }

    // Lấy lại danh sách người chơi còn lại
    const remainingConfigs = await this.probabilityConfigFinalRepository.find({
      where: { is_active: false },
    });

    // Chia đều lại xác suất cho các người chơi còn lại
    const addPercent =
      remainingConfigs.length > 0
        ? totalPercentDeleted / remainingConfigs.length
        : 0;

    for (const cfg of remainingConfigs) {
      cfg.pc_percent = Number((cfg.pc_percent + addPercent).toFixed(2));
      await this.probabilityConfigFinalRepository.save(cfg);
    }

    return {
      message: 'Bulk probability config deleted',
      deleted: configsToDelete.map((cfg) => cfg.pc_value),
      updated: remainingConfigs,
      totalPercentDeleted,
    };
  }

  async findplayerFinal(): Promise<any> {
    const playerFinals = await this.probabilityConfigFinalRepository.find({
      where: { is_active: false },
      select: { pc_fianl_id: true, pc_value: true, pc_percent: true },
    });
    if (!playerFinals) {
      return {
        message: 'Player final not yet!',
      };
    }

    return {
      message: 'Players final',
      playerFinals,
    };
  }

  async findplayerFinalOne(id: number): Promise<any> {
    const playerFinalOne = await this.probabilityConfigFinalRepository.findOne({
      where: { is_active: false, pc_fianl_id: id },
      select: { pc_fianl_id: true, pc_value: true, pc_percent: true },
    });

    if (!playerFinalOne) {
      return {
        message: 'Player not found!',
      };
    }

    return {
      message: 'Players get one',
      playerFinalOne,
    };
  }

  async updateplayerFinalOne(id: number, pc_value: any): Promise<any> {
    console.log(pc_value.pc_value);
    if (
      !pc_value ||
      typeof pc_value.pc_value !== 'string' ||
      pc_value.pc_value === ''
    ) {
      return {
        message: 'pc_value must string',
      };
    }
    const playerFinalOne = await this.probabilityConfigFinalRepository.findOne({
      where: { is_active: false, pc_fianl_id: id },
    });

    if (!playerFinalOne) {
      return {
        message: 'Player not found!',
      };
    }

    playerFinalOne.pc_value = pc_value.pc_value;
    await this.probabilityConfigFinalRepository.save(playerFinalOne);

    return {
      message: 'Players update one',
      playerFinalOne,
    };
  }

  async updateplayerFinalBulk(
    updates: { id: number; pc_value: string }[],
  ): Promise<any> {
    if (!Array.isArray(updates) || updates.length === 0) {
      return { message: 'Input must be a non-empty array' };
    }

    const updatedPlayers = [];
    const errors = [];

    for (const item of updates) {
      if (
        !item.pc_value ||
        typeof item.pc_value !== 'string' ||
        item.pc_value === ''
      ) {
        errors.push({
          id: item.id,
          message: 'pc_value must be a non-empty string',
        });
        continue;
      }

      const playerFinalOne =
        await this.probabilityConfigFinalRepository.findOne({
          where: { is_active: false, pc_fianl_id: item.id },
        });

      if (!playerFinalOne) {
        errors.push({ id: item.id, message: 'Player not found!' });
        continue;
      }

      playerFinalOne.pc_value = item.pc_value;
      await this.probabilityConfigFinalRepository.save(playerFinalOne);
      updatedPlayers.push(playerFinalOne);
    }

    return {
      message: 'Bulk update completed',
      updatedPlayers,
      errors: errors.length > 0 ? errors : null,
    };
  }

  async createNewPlayer(data: string, admin: any): Promise<any> {
    console.log(admin);
    return await this.importPlayer(data, admin);
  }

  async createEquallyDivided(data: string, admin: any): Promise<any> {
    const pc_player = [];
    const pc_random = [];
    const random_players = [];

    console.log('admin', admin);

    // Loại bỏ trùng lặp và chuẩn hóa dữ liệu
    let players = Array.from(
      new Set(
        data
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    // Tách player có xác suất riêng
    let manualConfigs = [];
    let autoPlayers = [];

    players.forEach((player) => {
      // Kiểm tra có xác suất riêng không (dạng "User A - 20")
      const match = player.match(/^(.+?)\s*-\s*(\d+)$/);
      if (match) {
        manualConfigs.push({
          pc_value: match[1].trim(),
          pc_percent: Number(match[2]),
        });
      } else {
        autoPlayers.push(player);
      }
    });

    // Chia đều xác suất cho các player còn lại
    autoPlayers.forEach((player) => {
      pc_random.push({
        pc_value: player,
        pc_percent: 0,
      });
    });

    // Ghép lại danh sách random_players
    random_players.push(...manualConfigs, ...pc_random);

    random_players.map((pc_final) => {
      const newItem = this.probabilityConfigFinalRepository.create({
        pc_value: pc_final.pc_value,
        pc_percent: pc_final.pc_percent,
      });
      this.probabilityConfigFinalRepository.save(newItem);
    });

    // Chia đều tỉ lệ
    const pc_finals = await this.probabilityConfigFinalRepository.find();
    console.log('pc_finals: ', pc_finals);

    pc_finals.map((item) => {
      item.pc_percent = 100 / pc_finals.length;
      this.probabilityConfigFinalRepository.save(item);
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    return { manualConfigs, autoPlayers, random_players };
  }

  async checkPC_Config(admin: any): Promise<any> {
    const finalPlayers = await this.probabilityConfigFinalRepository.find({
      where: { is_active: false },
    });

    if (!finalPlayers || finalPlayers.length === 0) {
      return { message: 'Not found players' };
    }

    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
      relations: { pc_configs: true },
    });

    if (!findAdmin) {
      return { message: 'Admin not found' };
    }

    // Tìm các player đã được cấu hình
    const configuredPlayers = finalPlayers.filter((fp) =>
      findAdmin.pc_configs.some((cfg) => cfg.pc_value === fp.pc_value),
    );

    const configureedPlayersPercent = configuredPlayers.reduce(
      (total, config) => total + config.pc_percent,
      0,
    );

    

    // Nếu không có ai được cấu hình thì chia đều xác suất cho tất cả
    if (configuredPlayers.length === 0) {
      const percent = 100 / finalPlayers.length;
      for (const fp of finalPlayers) {
        fp.pc_percent = percent;
        await this.probabilityConfigFinalRepository.save(fp);
      }

      // Lưu lịch sử nếu cần
      const historyEntry = this.historyRepository.create({
        history_admin_id: admin,
        history_time: new Date(),
        history_result: 'Check and config probability (equal)',
        status: StatusEnum.CHECKED,
      });
      await this.historyRepository.save(historyEntry);

      return {
        message: 'No user have been config, set equal probability.',
        totalConfiguredPercent: 0,
        unconfiguredPlayers: finalPlayers,
        configuredPlayers: [],
      };
    }

    // Nếu có người chơi đã được cấu hình
    const finalPlayerValues = finalPlayers.map((fp) => fp.pc_value);

    const totalConfiguredPercent = findAdmin.pc_configs
      .filter((cfg) => finalPlayerValues.includes(cfg.pc_value))
      .reduce((total, config) => total + config.pc_percent, 0);

    // Số lượng player chưa cấu hình
    const unconfiguredPlayers = finalPlayers.filter(
      (fp) => !findAdmin.pc_configs.some((cfg) => cfg.pc_value === fp.pc_value),
    );

    // Cập nhật xác suất cho player đã cấu hình
    for (const fp of configuredPlayers) {
      const cfg = findAdmin.pc_configs.find((c) => c.pc_value === fp.pc_value);
      fp.pc_percent = cfg.pc_percent;
      await this.probabilityConfigFinalRepository.save(fp);
    }

    // Chia đều xác suất còn lại cho các player chưa cấu hình
    const remainingPercent = 100 - totalConfiguredPercent;
    const percentPerUnconfigured =
      unconfiguredPlayers.length > 0
        ? remainingPercent / unconfiguredPlayers.length
        : 0;

    for (const fp of unconfiguredPlayers) {
      fp.pc_percent = percentPerUnconfigured;
      await this.probabilityConfigFinalRepository.save(fp);
    }

    // Lưu lịch sử nếu cần
    const historyEntry = this.historyRepository.create({
      history_admin_id: admin,
      history_time: new Date(),
      history_result: 'Check and config probability',
      status: StatusEnum.CHECKED,
    });
    await this.historyRepository.save(historyEntry);

    return {
      message: 'Change PC_Config success',
      totalConfiguredPercent,
      unconfiguredPlayers,
      configuredPlayers,
    };
  }

  async randomPlay(admin: any): Promise<any> {
    // Lấy danh sách người chơi cuối cùng
    const playerFinals = await this.probabilityConfigFinalRepository.find({
      where: { is_active: false },
      select: { pc_fianl_id: true, pc_value: true, pc_percent: true },
    });

    if (!playerFinals || playerFinals.length === 0) {
      return { message: 'No players to random' };
    }

    // Kiểm tra có ai đã cấu hình xác suất chưa
    const totalPercent = playerFinals.reduce((sum, p) => sum + p.pc_percent, 0);
    let players = [...playerFinals];

    // Nếu tất cả pc_percent đều bằng nhau hoặc tổng = 0 thì chia đều xác suất
    const isAllEqual =
      players.every((p) => p.pc_percent === players[0].pc_percent) ||
      totalPercent === 0;

    if (isAllEqual) {
      const percent = 100 / players.length;
      players = players.map((p) => ({ ...p, pc_percent: percent }));
    }

    // Tạo mảng cộng dồn xác suất
    let sum = 0;
    const ranges = players.map((p) => {
      sum += p.pc_percent;
      return { ...p, range: sum };
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const rand = Math.random() * sum;
    const selectedPlayer = ranges.find((p) => rand < p.range);

    // Lưu lịch sử nếu cần
    const historyEntry = this.historyRepository.create({
      history_admin_id: admin,
      history_time: new Date(),
      history_result: selectedPlayer.pc_value,
      status: StatusEnum.SPIN,
    });
    await this.historyRepository.save(historyEntry);

    await this.removePC_Config(selectedPlayer.pc_fianl_id, admin);

    return {
      message: 'Random spin',
      selectedPlayer,
      players,
    };
  }
}
