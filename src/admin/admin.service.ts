import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAdminEntity } from './entities/user-admin.entity';
import { Repository } from 'typeorm';
import { CreateUserAdminDto } from './dto/create.dto';
import * as bcrypt from 'bcrypt';
import { AuthDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { PC_ConfigDto } from 'src/probability_config/dto/pc_config.dto';
import { ProbabilityConfigEntity } from 'src/probability_config/entities/pc.entity';
import { HistoryEntity } from 'src/history/entities/history.entity';
import { ProbabilityConfigFinalEntity } from 'src/total_probability_config/entities/pc_config_final.entity';

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
  ) {}

  async createAdmin(
    createAdminDto: CreateUserAdminDto,
  ): Promise<{ meaage: string; admin: UserAdminEntity }> {
    const salt = 10;
    const hashedPassword = await bcrypt.hash(createAdminDto.password, salt);

    const adminDto = {
      ...createAdminDto,
      emmail: createAdminDto.email,
      password: hashedPassword,
    };

    const newAdmin = this.userAdminRepository.create(adminDto);
    return {
      meaage: 'Admin user created successfully',
      admin: await this.userAdminRepository.save(newAdmin),
    };
  }

  async auth(authDto: AuthDto, response: Response): Promise<any> {
    const user = await this.userAdminRepository.findOne({
      where: { email: authDto.email },
    });
    if (!user) {
      throw new Error('Admin user not found');
    }

    const isPasswordValid = await bcrypt.compare(
      authDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new Error('Invalid password');
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

    return { message: 'Authentication successful', token };
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

  async findAll(): Promise<{ message: string; admins: UserAdminEntity[] }> {
    const admins = await this.userAdminRepository.find({
      relations: ['pc_configs'],
      where: {
        pc_configs: {
          is_active: false,
        },
      },
      select: {
        email: true,
        role: true,
        status: true,
        pc_total: true,
        pc_used: true,
        createdAt: true,
        updatedAt: true,
        pc_configs: { pc_id: true, pc_value: true, pc_percent: true },
      },
    });
    return { message: 'Admin users retrieved successfully', admins };
  }

  async findPC_ConfigByEmail(
    admin: any,
  ): Promise<{ message: string; admins: UserAdminEntity[] }> {
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
        pc_total: true,
        pc_used: true,
        createdAt: true,
        updatedAt: true,
        pc_configs: { pc_id: true, pc_value: true, pc_percent: true },
      },
    });
    return { message: 'Admin users retrieved by admin successfully', admins };
  }

  async createProbabilityConfig(
    pcConfigDto: PC_ConfigDto,
    admin: UserAdminEntity,
  ): Promise<any> {
    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
      relations: { pc_configs: true },
    });

    if (
      !pcConfigDto ||
      typeof pcConfigDto.pc_value !== 'string' ||
      typeof pcConfigDto.pc_percent !== 'number'
    ) {
      return {
        message:
          'pc_value and pc_percent not empty, pc_value must string, pc_percent must number',
      };
    }

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

    if (
      pcConfigDto.pc_percent < 0 ||
      pcConfigDto.pc_percent > 100 - pcTotalReal
    ) {
      return {
        meaage: `pc_percent must be between 0 and ${100 - pcTotalReal}`,
      };
    }

    let pcConfig: ProbabilityConfigEntity;

    const newConfig = {
      ...pcConfigDto,
      pc_admin_id: findAdmin ? findAdmin : null,
    };

    if (pcConfig && pcConfig.pc_value === pcConfigDto.pc_value) {
      return {
        meaage: 'Data already exists!',
      };
    }

    pcConfig = this.pcConfigRepository.create(newConfig);
    await this.pcConfigRepository.save(pcConfig);

    let newPC_Total = null;

    if (pcTotalReal + pcConfig.pc_percent > 100) {
      const pcConfig = null;
      return {
        meaage: `Total pc_percent exceeds 100. Current total: ${pcTotalReal}, New pc_percent: ${pcConfig.pc_percent}`,
      };
    }

    if (findAdmin && findAdmin.email === admin.email) {
      if (!findAdmin.pc_configs) {
        findAdmin.pc_configs = [pcConfig];
        findAdmin.pc_used = pcConfigDto.pc_percent;
        await this.userAdminRepository.save(findAdmin);
      }
      findAdmin.pc_configs = [...findAdmin.pc_configs, pcConfig];
      // console.log(
      //   'pcTotalReal + pcConfig.pc_percent',
      //   pcTotalReal,
      //   pcConfig.pc_percent,
      // );
      findAdmin.pc_used = pcTotalReal + pcConfig.pc_percent;
      await this.userAdminRepository.save(findAdmin);
    }

    return { message: 'Probability config created', pcConfig };
  }

  async getPC_ConfigById(pc_id: number): Promise<any> {
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
        message: 'Probability config not found',
      };
    }

    if (pcConfig.is_active) {
      // throw new Error('Probability config is inactive');
      return { message: 'Probability config is inactive', pcConfig: null };
    }

    return { message: 'Probability config retrieved', pcConfig };
  }

  async findAllPC_Configs(): Promise<any> {
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
    return { message: 'Probability configs retrieved', pcConfigs };
  }

  async removePC_ConfigByid(id: number, admin: any): Promise<any> {
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

    findAdmin.pc_used = findAdmin.pc_used - findPC_Config.pc_percent;
    await this.userAdminRepository.save(findAdmin);

    findPC_Config.is_active = true;
    findPC_Config.pc_percent = 0;
    await this.pcConfigRepository.save(findPC_Config);

    return { message: 'Remove success' };
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

    if (pc_percent > findAdmin.pc_total - findAdmin.pc_used) {
      return {
        message: `pc_percent must less than ${findAdmin.pc_total - findAdmin.pc_used}`,
      };
    }

    if (findAdmin.pc_used === 0) {
      findAdmin.pc_used = pc_percent;
    }

    findAdmin.pc_used =
      findAdmin.pc_used - (findPC_Config.pc_percent - pc_percent);
    await this.userAdminRepository.save(findAdmin);

    findPC_Config.pc_value = pc_value;
    findPC_Config.pc_percent = pc_percent;

    await this.pcConfigRepository.save(findPC_Config);

    return { message: 'Update success' };
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
      !data
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

    // Add manualConfigs into database
    manualConfigs.map((item) => {
      console.log('item: ', item);
      if (pc_percent_used > 100 || item.pc_percent > 100 - pc_percent_used_0) {
        return {
          message: `The probability configuration must be greater than 0 and less than or equal to ${100 - pc_percent_used_0}`,
        };
      }
      this.createProbabilityConfig(
        { pc_value: item.pc_value, pc_percent: item.pc_percent },
        admin,
      );

      // if (pc_percent_used > findAdmin.pc_total) {
      //   return {
      //     message:
      //       'The percentage value used must not be greater than the total',
      //   };
      // } else {
      //   findAdmin.pc_used = pc_percent_used;
      //   this.userAdminRepository.save(findAdmin);
      // }
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
        const newItem = this.probabilityConfigFinalRepository.create({
          pc_value: pc_final.pc_value,
          pc_percent: pc_final.pc_percent,
        });
        this.probabilityConfigFinalRepository.save(newItem);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      message: 'Import player',
      random_players,
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

    return {
      message: 'Probability config deleted',
      filtered,
      filteredDeleted,
      pc_config_percent_deleted,
    };
  }

  async random(admin: any): Promise<any> {
    let random_players = [
      {
        pc_value: 'User A',
        pc_percent: 40,
      },
      {
        pc_value: 'User B',
        pc_percent: 30,
      },
      {
        pc_value: 'User C',
        pc_percent: 30,
      },
    ];

    if (!random_players || random_players.length === 0) {
      return {
        message: 'No players available for random selection',
        random_players,
        selectedPlayer: null,
      };
    }

    const weighted = [];
    random_players.forEach((player: { pc_percent: number }) => {
      const count = Math.round(player.pc_percent);
      for (let i = 0; i < count; i++) {
        weighted.push(player);
      }
    });

    const randomIndex = Math.floor(Math.random() * weighted.length);
    const selectedPlayer = weighted[randomIndex];

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const historyEntry = this.historyRepository.create({
      history_admin_id: admin,
      history_time: new Date(),
      history_result: selectedPlayer.pc_value,
    });

    await this.historyRepository.save(historyEntry);

    random_players = random_players.filter(
      (player) => player.pc_value !== selectedPlayer.pc_value,
    );

    return {
      message: 'Import player and random - to be implemented',
      random_players,
      selectedPlayer,
      historyEntry,
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

    if (configuredPlayers.length === 0) {
      return {
        message: 'No user have been config, keep original probability.',
      };
    }

    // Tổng xác suất đã cấu hình
    const totalConfiguredPercent = findAdmin.pc_configs.reduce(
      (total, config) => total + config.pc_percent,
      0,
    );
    console.log(totalConfiguredPercent);

    // Số lượng player chưa cấu hình
    const unconfiguredPlayers = finalPlayers.filter(
      (fp) => !findAdmin.pc_configs.some((cfg) => cfg.pc_value === fp.pc_value),
    );

    console.log('firunconfiguredPlayersst', unconfiguredPlayers);

    // Cập nhật xác suất cho player đã cấu hình
    for (const fp of configuredPlayers) {
      const cfg = findAdmin.pc_configs.find((c) => c.pc_value === fp.pc_value);
      console.log('cfg', cfg);
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

    // let count = 0;
    // let has = false;

    // const pc_config = findAdmin.pc_configs.reduce(
    //   (total, config) => total + config.pc_percent,
    //   0,
    // );

    // console.log(pc_config);

    // finalPlayers.map((final_total) => {
    //   const checkUser = findAdmin.pc_configs.some(
    //     (item) => item.pc_value === final_total.pc_value,
    //   );
    //   console.log(checkUser);

    //   if (!checkUser) {
    //     return { message: 'No user have been config' };
    //   }

    //   findAdmin.pc_configs.map((it) => {
    //     if (final_total.pc_value === it.pc_value) {
    //       final_total.pc_percent = it.pc_percent;
    //       count++;
    //       this.probabilityConfigFinalRepository.save(final_total);
    //     }

    //     final_total.pc_percent =
    //       (100 - pc_config) / (finalPlayers.length - count);

    //     this.probabilityConfigFinalRepository.save(final_total);
    //   });
    // });

    return {
      message: 'Change PC_Config succes',
      totalConfiguredPercent,
      unconfiguredPlayers,
      configuredPlayers,
    };
  }
}
