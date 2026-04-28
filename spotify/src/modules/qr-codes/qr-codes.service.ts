import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { QrCode } from './entities/qr-code.entity';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';

@Injectable()
export class QrCodesService {
  private readonly logger = new Logger(QrCodesService.name);

  constructor(
    @InjectRepository(QrCode)
    private readonly qrCodeRepository: Repository<QrCode>,
    private readonly configService: ConfigService,
  ) {}

  async generateQrCode(createDto: CreateQrCodeDto): Promise<QrCode> {
    // Check if QR code with identifier already exists
    const existing = await this.qrCodeRepository.findOne({
      where: { identifier: createDto.identifier },
    });

    if (existing) {
      throw new ConflictException(`QR Code with identifier ${createDto.identifier} already exists`);
    }

    // Determine Spotify URL
    let spotifyUrl = createDto.spotifyUrl;
    if (!spotifyUrl && createDto.spotifyTrackId) {
      spotifyUrl = `https://open.spotify.com/track/${createDto.spotifyTrackId}`;
    }

    if (!spotifyUrl) {
      throw new ConflictException('Either spotifyUrl or spotifyTrackId must be provided');
    }

    // Generate QR code image as base64
    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel: 'M',
      margin: this.configService.get('qrCode.margin'),
      width: this.configService.get('qrCode.size'),
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    };

    const qrCodeDataUrl = await QRCode.toDataURL(spotifyUrl, qrOptions);
    
    // Create redirect URL that goes through your API for tracking
    const redirectUrl = `${this.configService.get('apiUrl')}/api/qr/redirect/${createDto.identifier}`;

    const qrCode = this.qrCodeRepository.create({
      identifier: createDto.identifier,
      code: spotifyUrl,
      imageUrl: qrCodeDataUrl,
      redirectUrl,
      isActive: true,
    });

    const savedQrCode = await this.qrCodeRepository.save(qrCode);
    this.logger.log(`QR Code generated: ${savedQrCode.identifier}`);
    
    return savedQrCode;
  }

  async findAll(): Promise<QrCode[]> {
    return await this.qrCodeRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
  
  async findOne(id: string): Promise<QrCode> {
    const qrCode = await this.qrCodeRepository.findOne({
      where: { id },
      relations: ['mappings', 'mappings.song', 'mappings.qrCard'],
      // We must explicitly select imageUrl because it's set to select: false in the entity
      select: {
        id: true,
        identifier: true,
        code: true,
        imageUrl: true,
        redirectUrl: true,
        isActive: true,
        scans: true,
        createdAt: true,
      }
    });

    if (!qrCode) {
      throw new NotFoundException(`QR Code with ID ${id} not found`);
    }

    return qrCode;
  }

  async findByIdentifier(identifier: string): Promise<QrCode> {
    const qrCode = await this.qrCodeRepository.findOne({
      where: { identifier },
      relations: ['mappings', 'mappings.song', 'mappings.qrCard'],
      select: {
        id: true,
        identifier: true,
        code: true,
        imageUrl: true,
        redirectUrl: true,
        isActive: true,
        scans: true,
        createdAt: true,
      }
    });

    if (!qrCode) {
      throw new NotFoundException(`QR Code with identifier ${identifier} not found`);
    }

    return qrCode;
  }

  async incrementScans(identifier: string): Promise<void> {
    await this.qrCodeRepository.increment({ identifier }, 'scans', 1);
    this.logger.debug(`Incremented scans for QR: ${identifier}`);
  }

  async deactivate(id: string): Promise<QrCode> {
    const qrCode = await this.findOne(id);
    qrCode.isActive = false;
    const updated = await this.qrCodeRepository.save(qrCode);
    this.logger.log(`QR Code deactivated: ${qrCode.identifier}`);
    return updated;
  }

  async activate(id: string): Promise<QrCode> {
    const qrCode = await this.findOne(id);
    qrCode.isActive = true;
    const updated = await this.qrCodeRepository.save(qrCode);
    this.logger.log(`QR Code activated: ${qrCode.identifier}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const qrCode = await this.findOne(id);
    await this.qrCodeRepository.remove(qrCode);
    this.logger.log(`QR Code deleted: ${qrCode.identifier}`);
  }

  async getStats(): Promise<any> {
    const total = await this.qrCodeRepository.count();
    const active = await this.qrCodeRepository.count({ where: { isActive: true } });
    const totalScans = await this.qrCodeRepository
      .createQueryBuilder('qr_code')
      .select('SUM(scans)', 'total')
      .getRawOne();
    
    return {
      total,
      active,
      inactive: total - active,
      totalScans: parseInt(totalScans.total) || 0,
    };
  }
}
