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

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserAdminEntity)
    private readonly userAdminRepository: Repository<UserAdminEntity>,
    @InjectRepository(ProbabilityConfigEntity)
    private readonly pcConfigRepository: Repository<ProbabilityConfigEntity>,
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

    return { message: 'Authentication successful', user };
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
    const admins = await this.userAdminRepository.find();
    return { message: 'Admin users retrieved successfully', admins };
  }

  async createProbabilityConfig(
    // admin: { email: string },
    pcConfigDto: PC_ConfigDto,
  ): Promise<any> {
    // if (!admin) {
    //   throw new Error('Unauthorized');
    // }
    const findAdmin = await this.userAdminRepository.findOne({
      where: { email: pcConfigDto.email },
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
      pc_used: pcTotalReal + pcConfigDto.pc_percent,
      createdBy: findAdmin ? findAdmin.email : 'unknown',
    };

    const pcConfig = this.pcConfigRepository.create(newConfig);

    await this.pcConfigRepository.save(pcConfig);

    if (findAdmin) {
      if (!findAdmin.pc_configs) {
        findAdmin.pc_configs = [];
      }
      findAdmin.pc_configs.push(pcConfig);
      await this.userAdminRepository.save(findAdmin);
    }

    return { message: 'Probability config created', pcConfig };
  }

  async findAllPC_Configs(): Promise<any> {
    const pcConfigs = await this.pcConfigRepository.find();
    return { message: 'Probability configs retrieved', pcConfigs };
  }
}
