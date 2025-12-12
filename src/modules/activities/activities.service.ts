import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityRegistration, RegistrationStatus } from './entities/activity-registration.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(ActivityRegistration)
    private readonly registrationRepository: Repository<ActivityRegistration>,
  ) {}

  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    const activity = this.activityRepository.create(createActivityDto);
    return this.activityRepository.save(activity);
  }

  async findAll(type?: string): Promise<Activity[]> {
    const query = this.activityRepository.createQueryBuilder('activity')
      .orderBy('activity.startDate', 'ASC');
    
    if (type) {
      query.where('activity.type = :type', { type });
    }
    
    return query.getMany();
  }

  async findOne(id: string): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
    });
    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }
    return activity;
  }

  async update(id: string, updateActivityDto: UpdateActivityDto): Promise<Activity> {
    const activity = await this.findOne(id);
    Object.assign(activity, updateActivityDto);
    return this.activityRepository.save(activity);
  }

  async remove(id: string): Promise<void> {
    const activity = await this.findOne(id);
    await this.activityRepository.remove(activity);
  }

  async register(activityId: string, userId: string): Promise<ActivityRegistration> {
    const activity = await this.findOne(activityId);
    
    // Check capacity
    const registrationCount = await this.registrationRepository.count({
      where: { activityId, status: RegistrationStatus.CONFIRMED },
    });
    
    if (activity.capacity && registrationCount >= activity.capacity) {
      throw new BadRequestException('Activity is full');
    }
    
    // Check if already registered
    const existing = await this.registrationRepository.findOne({
      where: { activityId, userId },
    });
    
    if (existing) {
      throw new ConflictException('Already registered for this activity');
    }
    
    const registration = this.registrationRepository.create({
      activityId,
      userId,
      status: RegistrationStatus.CONFIRMED,
    });
    
    return this.registrationRepository.save(registration);
  }

  async cancelRegistration(activityId: string, userId: string): Promise<void> {
    const registration = await this.registrationRepository.findOne({
      where: { activityId, userId },
    });
    
    if (!registration) {
      throw new NotFoundException('Registration not found');
    }
    
    registration.status = RegistrationStatus.CANCELLED;
    await this.registrationRepository.save(registration);
  }

  async getRegistrations(activityId: string): Promise<ActivityRegistration[]> {
    return this.registrationRepository.find({
      where: { activityId },
      relations: ['user'],
    });
  }

  async getMyRegistrations(userId: string): Promise<ActivityRegistration[]> {
    return this.registrationRepository.find({
      where: { userId },
      relations: ['activity'],
    });
  }
}
