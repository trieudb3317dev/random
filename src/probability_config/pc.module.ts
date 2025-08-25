import { Module } from "@nestjs/common";
import { ProbabilityConfigController } from "./pc.controller";
import { ProbabilityConfigService } from "./pc.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserAdminEntity } from "src/admin/entities/user-admin.entity";
import { ProbabilityConfigTotalEntity } from "src/total_probability_config/entities/pc_config_total.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([UserAdminEntity, ProbabilityConfigTotalEntity])
    ],
    controllers: [ProbabilityConfigController],
    providers: [ProbabilityConfigService],
})
export class ProbabilityConfigModule{}