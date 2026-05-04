import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mapping } from './entities/mapping.entity';
import { CreateMappingDto } from './dto/create-mapping.dto';
import { SongsService } from '../songs/songs.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { QrCardsService } from '../qr-cards/qr-cards.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MappingsService {
  private readonly logger = new Logger(MappingsService.name);

  constructor(
    @InjectRepository(Mapping)
    private readonly mappingRepository: Repository<Mapping>,
    private readonly songsService: SongsService,
    private readonly qrCodesService: QrCodesService,
    private readonly qrCardsService: QrCardsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createMappingDto: CreateMappingDto, userId: string): Promise<Mapping> {
    // Verify song exists
    const song = await this.songsService.findOne(createMappingDto.songId);
    
    // Verify QR code exists
    const qrCode = await this.qrCodesService.findOne(createMappingDto.qrCodeId);
    
    // Check if mapping already exists
    const existing = await this.mappingRepository.findOne({
      where: {
        songId: createMappingDto.songId,
        qrCodeId: createMappingDto.qrCodeId,
      },
    });

    if (existing) {
      throw new ConflictException('Mapping already exists for this song and QR code');
    }
    
    let qrCard: any = null;
    if (createMappingDto.qrCardId) {
      qrCard = await this.qrCardsService.findOne(createMappingDto.qrCardId);
    }

    const mapping = this.mappingRepository.create({
      songId: song.id,
      qrCodeId: qrCode.id,
      qrCardId: qrCard?.id,
      createdById: userId,
      isActive: true,
    });

    const savedMapping = await this.mappingRepository.save(mapping);
    await this.notificationsService.create({
      type: 'mapping_created',
      category: 'content',
      title: 'QR mapping created',
      message: `QR ${qrCode.identifier} mapped to "${song.name}".`,
      metadata: { mappingId: savedMapping.id, songId: song.id, qrCodeId: qrCode.id },
    });
    this.logger.log(`Mapping created: Song "${song.name}" -> QR Code "${qrCode.identifier}"`);
    
    return savedMapping;
  }

  async update(id: string, updateMappingDto: Partial<CreateMappingDto>): Promise<Mapping> {
    const mapping = await this.findOne(id);

    if (updateMappingDto.songId) {
      const song = await this.songsService.findOne(updateMappingDto.songId);
      mapping.songId = song.id;
    }

    if (updateMappingDto.qrCodeId) {
      const qrCode = await this.qrCodesService.findOne(updateMappingDto.qrCodeId);
      mapping.qrCodeId = qrCode.id;
    }

    if (updateMappingDto.qrCardId) {
      const qrCard = await this.qrCardsService.findOne(updateMappingDto.qrCardId);
      mapping.qrCardId = qrCard.id;
    }

    const updated = await this.mappingRepository.save(mapping);
    this.logger.log(`Mapping updated: ${id}`);
    
    return this.findOne(updated.id);
  }

  async findAll(page = 1, limit = 10): Promise<{ items: Mapping[]; total: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await this.mappingRepository.findAndCount({
      relations: ['song', 'qrCode'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { items, total };
  }

  async findOne(id: string): Promise<Mapping> {
    const mapping = await this.mappingRepository.findOne({
      where: { id },
      relations: ['song', 'qrCode', 'qrCard', 'createdBy'],
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping with ID ${id} not found`);
    }

    return mapping;
  }

  async findByQrCard(cardId: string): Promise<Mapping[]> {
    return await this.mappingRepository.find({
      where: { qrCardId: cardId, isActive: true },
      relations: ['song', 'qrCode'],
    });
  }

  async findBySong(songId: string): Promise<Mapping[]> {
    return await this.mappingRepository.find({
      where: { songId, isActive: true },
      relations: ['qrCode', 'qrCard'],
    });
  }

  async deactivate(id: string): Promise<Mapping> {
    const mapping = await this.findOne(id);
    mapping.isActive = false;
    const updated = await this.mappingRepository.save(mapping);
    this.logger.log(`Mapping deactivated: ${id}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const mapping = await this.findOne(id);
    const mappingSongName = mapping.song?.name ?? mapping.songId;
    const mappingQrIdentifier = mapping.qrCode?.identifier ?? mapping.qrCodeId;
    await this.mappingRepository.remove(mapping);
    await this.notificationsService.create({
      type: 'mapping_deleted',
      category: 'content',
      severity: 'warning',
      title: 'QR mapping deleted',
      message: `Mapping removed: QR ${mappingQrIdentifier} from "${mappingSongName}".`,
      metadata: { mappingId: id, songId: mapping.songId, qrCodeId: mapping.qrCodeId },
    });
    this.logger.log(`Mapping deleted: ${id}`);
  }

  async getActiveMappingByQrIdentifier(identifier: string): Promise<Mapping | null> {
    const qrCode = await this.qrCodesService.findByIdentifier(identifier);
    
    const mapping = await this.mappingRepository.findOne({
      where: {
        qrCodeId: qrCode.id,
        isActive: true,
      },
      relations: ['song', 'qrCode'],
    });
    
    return mapping;
  }
}
