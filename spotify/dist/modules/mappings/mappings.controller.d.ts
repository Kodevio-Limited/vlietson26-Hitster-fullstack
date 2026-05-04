import { MappingsService } from './mappings.service';
import { CreateMappingDto } from './dto/create-mapping.dto';
export declare class MappingsController {
    private readonly mappingsService;
    constructor(mappingsService: MappingsService);
    create(createMappingDto: CreateMappingDto, req: any): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/mapping.entity").Mapping;
    }>;
    findAll(req: any): Promise<{
        success: boolean;
        data: import("./entities/mapping.entity").Mapping[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: import("./entities/mapping.entity").Mapping;
    }>;
    update(id: string, updateMappingDto: Partial<CreateMappingDto>): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/mapping.entity").Mapping;
    }>;
    deactivate(id: string): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/mapping.entity").Mapping;
    }>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
