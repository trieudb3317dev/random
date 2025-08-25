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
import { ProbabilityConfigTotalEntity } from 'src/total_probability_config/entities/pc_config_total.entity';
import { HistoryEntity } from 'src/history/entities/history.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserAdminEntity)
    private readonly userAdminRepository: Repository<UserAdminEntity>,
    @InjectRepository(ProbabilityConfigEntity)
    private readonly pcConfigRepository: Repository<ProbabilityConfigEntity>,
    @InjectRepository(ProbabilityConfigTotalEntity)
    private readonly pcConfigTotalRepository: Repository<ProbabilityConfigTotalEntity>,
    @InjectRepository(HistoryEntity)
    private readonly historyRepository: Repository<HistoryEntity>,
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
      throw new Error('Admin user not found');
    }
    return user;
  }

  async findAll(): Promise<{ message: string; admins: UserAdminEntity[] }> {
    const admins = await this.userAdminRepository.find({
      relations: ['pc_configs'],
    });
    return { message: 'Admin users retrieved successfully', admins };
  }

  async createProbabilityConfig(
    pcConfigDto: PC_ConfigDto,
    admin: UserAdminEntity,
  ): Promise<any> {
    if (!admin) {
      throw new Error('Unauthorized');
    }

    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: admin.email },
      relations: ['pc_configs'],
    });

    if (pcConfigDto.pc_percent < 0 || pcConfigDto.pc_percent > 100) {
      throw new Error('pc_percent must be between 0 and 100');
    }

    let pcTotalReal = 0;

    if (findAdmin && findAdmin.pc_configs) {
      pcTotalReal = findAdmin.pc_configs.reduce(
        (total, config) => total + config.pc_percent,
        0,
      );
    }

    const newConfig = {
      ...pcConfigDto,
      createdBy: findAdmin ? findAdmin.email : 'unknown',
    };

    const pcConfig: any = this.pcConfigRepository.create(newConfig);

    const pcTotal = await this.pcConfigTotalRepository.findOne({
      where: { pc_toal_id: pcConfig.pc_total?.pc_toal_id },
      relations: ['pcs'],
    });

    if (pcTotalReal + pcConfig.pc_percent > 100) {
      const pcConfig = null;
      throw new Error(
        `Total pc_percent exceeds 100. Current total: ${pcTotalReal}, New pc_percent: ${pcConfig.pc_percent}`,
      );
    }

    await this.pcConfigRepository.save(pcConfig);

    if (pcTotal) {
      pcTotal.pc_used = pcTotalReal + pcConfig.pc_percent;
      await this.pcConfigTotalRepository.save(pcTotal);
      pcConfig.pc_total = pcTotal;
      await this.pcConfigRepository.save(pcConfig);
    } else {
      const newPcTotal = this.pcConfigTotalRepository.create({
        pc_used: pcConfig.pc_percent,
        pc_total: 100,
        is_active: true,
      });
      const savedPcTotal = await this.pcConfigTotalRepository.save(newPcTotal);
      pcConfig.pc_total = savedPcTotal;
      await this.pcConfigRepository.save(pcConfig);
    }

    if (findAdmin) {
      if (!findAdmin.pc_configs) {
        findAdmin.pc_configs = [];
        await this.userAdminRepository.save(findAdmin);
      }
      findAdmin.pc_configs.push(pcConfig);
      await this.userAdminRepository.save(findAdmin);
    }

    return { message: 'Probability config created', pcConfig };
  }

  async removePC_Config(pc_id: number): Promise<any> {
    const pcConfig = await this.pcConfigRepository.findOne({
      where: { pc_id },
      relations: ['pc_admin_id', 'pc_total'],
    });
    if (!pcConfig) {
      throw new Error('Probability config not found');
    }
    await this.pcConfigRepository.update(pc_id, { is_active: true });

    if (pcConfig.pc_total) {
      const pcTotal = await this.pcConfigTotalRepository.findOne({
        where: { pc_toal_id: pcConfig.pc_total.pc_toal_id },
        relations: ['pcs'],
      });
      if (pcTotal) {
        pcTotal.pc_used -= pcConfig.pc_percent;
        if (pcTotal.pc_used < 0) {
          pcTotal.pc_used = 0;
        }
        pcTotal.pcs = pcTotal.pcs.filter((pc) => pc.pc_id !== pcConfig.pc_id);
        await this.pcConfigTotalRepository.save(pcTotal);
      }
    }

    if (pcConfig.pc_admin_id) {
      const admin = await this.userAdminRepository.findOne({
        where: { id: pcConfig.pc_admin_id.id },
        relations: ['pc_configs'],
      });
      if (admin && admin.pc_configs) {
        admin.pc_configs = admin.pc_configs.filter(
          (pc) => pc.pc_id !== pcConfig.pc_id,
        );
        await this.userAdminRepository.save(admin);
      }
    }

    return { message: 'Probability config deleted', pcConfig };
  }

  // async updatePC_Config(
  //   pcConfigDto: PC_ConfigDto,
  //   admin: UserAdminEntity,
  // ): Promise<any> {
  //   if (!admin) {
  //     throw new Error('Unauthorized');
  //   }
  //   const findAdmin = await this.userAdminRepository.findOne({
  //     where: { email: admin.email },
  //     relations: ['pc_configs'],
  //   });
  //   const pcConfig = await this.pcConfigRepository.findOne({
  //     where: { pc_id: pcConfigDto.pc_id },
  //     relations: ['pc_admin_id', 'pc_total'],
  //   });
  //   if (!pcConfig) {
  //     throw new Error('Probability config not found');
  //   }
  //   if (pcConfigDto.pc_percent < 0 || pcConfigDto.pc_percent > 100) {
  //     throw new Error('pc_percent must be between 0 and 100');
  //   }
  //   let pcTotalReal = 0;
  //   if (findAdmin && findAdmin.pc_configs) {
  //     pcTotalReal = findAdmin.pc_configs
  //       .filter((config) => config.pc_id !== pcConfig.pc_id)
  //       .reduce((total, config) => total + config.pc_percent, 0);
  //   }
  //   if (pcTotalReal + pcConfigDto.pc_percent > 100) {
  //     throw new Error(
  //       `Total pc_percent exceeds 100. Current total: ${pcTotalReal}, New pc_percent: ${pcConfigDto.pc_percent}`,
  //     );
  //   }
  //   pcConfig.pc_value = pcConfigDto.pc_value;
  //   pcConfig.pc_percent = pcConfigDto.pc_percent;
  //   pcConfig.updatedBy = findAdmin ? findAdmin.email : 'unknown';
  //   await this.pcConfigRepository.save(pcConfig);
  //   if (pcConfig.pc_total) {
  //     const pcTotal = await this.pcConfigTotalRepository.findOne({
  //       where: { pc_toal_id: pcConfig.pc_total.pc_toal_id },
  //       relations: ['pcs'],
  //     });
  //     if (pcTotal) {
  //       pcTotal.pc_used = pcTotalReal + pcConfig.pc_percent;
  //       await this.pcConfigTotalRepository.save(pcTotal);
  //     }
  //   }
  //   return { message: 'Probability config updated', pcConfig };
  // }

  async getPC_ConfigById(pc_id: number): Promise<any> {
    const pcConfig = await this.pcConfigRepository.findOne({
      where: { pc_id },
      relations: ['pc_admin_id', 'pc_total'],
    });
    if (!pcConfig) {
      throw new Error('Probability config not found');
    }

    return { message: 'Probability config retrieved', pcConfig };
  }

  async findAllPC_Configs(): Promise<any> {
    const pcConfigs = await this.pcConfigRepository.find();
    return { message: 'Probability configs retrieved', pcConfigs };
  }

  async importPlayer(data: string): Promise<any> {
    let players = [];
    data.split('\n').map((item) => players.push(item.trim()));

    const pc_player = [];
    let pc_percent_remaining = 0;
    const pc_random = [];
    const random_players = [];

    const pc_configs = await this.pcConfigRepository.find({
      relations: ['pc_admin_id'],
    });

    players.forEach((player) => {
      pc_configs.forEach((pc) => {
        if (pc.pc_value === player) {
          pc_player.push({ pc_value: pc.pc_value, pc_percent: pc.pc_percent });
          players = players.filter(
            (p) => !pc_player.some((pr) => pr.pc_value === p),
          );
          const players_1 = players.filter((p) => p === pc.pc_value);

          const pc_percent_used = pc_player.reduce(
            (total, config) => total + config.pc_percent,
            0,
          );
          console.log('pc_percent_used', pc_percent_used);
          pc_percent_remaining = 100 - pc_percent_used;
        }
      });
    });

    players.forEach((player) => {
      pc_random.push({
        pc_value: `${player}`,
        pc_percent: pc_percent_remaining / players.length,
      });
    });

    random_players.push(...pc_random, ...pc_player);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      message: 'Import player',
      random_players,
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
}
