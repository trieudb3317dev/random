import { Module } from "@nestjs/common";
import { ProbabilityConfigController } from "./pc.controller";
import { ProbabilityConfigService } from "./pc.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserAdminEntity } from "src/admin/entities/user-admin.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([UserAdminEntity])
    ],
    controllers: [ProbabilityConfigController],
    providers: [ProbabilityConfigService],
})
export class ProbabilityConfigModule{}