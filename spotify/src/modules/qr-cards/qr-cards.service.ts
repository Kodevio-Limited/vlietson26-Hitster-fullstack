import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QrCard } from './entities/qr-card.entity';
import { CreateQrCardDto } from './dto/create-qr-card.dto';
import { UpdateQrCardDto } from './dto/update-qr-card.dto';

@Injectable()
export class QrCardsService {
  private readonly logger = new Logger(QrCardsService.name);

  constructor(
    @InjectRepository(QrCard)
    private readonly qrCardRepository: Repository<QrCard>,
  ) {}

  async create(createDto: CreateQrCardDto): Promise<QrCard> {
    const existing = await this.qrCardRepository.findOne({
      where: { cardId: createDto.cardId },
    });

    if (existing) {
      throw new ConflictException(`QR Card with ID ${createDto.cardId} already exists`);
    }

    const qrCard = this.qrCardRepository.create({
      ...createDto,
      status: 'active',
    });

    const saved = await this.qrCardRepository.save(qrCard);
    this.logger.log(`QR Card created: ${saved.cardId}`);
    return saved;
  }

  async findAll(): Promise<QrCard[]> {
    return await this.qrCardRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<QrCard> {
    const qrCard = await this.qrCardRepository.findOne({
      where: { id },
    });

    if (!qrCard) {
      throw new NotFoundException(`QR Card with ID ${id} not found`);
    }

    return qrCard;
  }

  async findByCardId(cardId: string): Promise<QrCard> {
    const qrCard = await this.qrCardRepository.findOne({
      where: { cardId },
    });

    if (!qrCard) {
      throw new NotFoundException(`QR Card with cardId ${cardId} not found`);
    }

    return qrCard;
  }

  async update(id: string, updateDto: UpdateQrCardDto): Promise<QrCard> {
    const qrCard = await this.findOne(id);
    Object.assign(qrCard, updateDto);
    const updated = await this.qrCardRepository.save(qrCard);
    this.logger.log(`QR Card updated: ${updated.cardId}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const qrCard = await this.findOne(id);
    await this.qrCardRepository.remove(qrCard);
    this.logger.log(`QR Card deleted: ${qrCard.cardId}`);
  }

  async getAvailableCards(): Promise<QrCard[]> {
    return await this.qrCardRepository.find({
      where: { status: 'active' },
      order: { cardId: 'ASC' },
    });
  }
}
