import { ApiProperty } from '@nestjs/swagger';

export class LearnerHomeHeaderDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', nullable: false })
  userId: string;

  @ApiProperty({ example: 'John Doe', nullable: true })
  displayName: string | null;

  @ApiProperty({ example: 'https://cdn.example.com/avatar.png', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: 120, nullable: false })
  xp: number;

  @ApiProperty({ example: 7, nullable: false })
  streakDays: number;
}

export class LearnerHomeContinueLearningDto {
  @ApiProperty({ example: 1 })
  courseId: number;

  @ApiProperty({ example: 'Basic TypeScript' })
  courseTitle: string;

  @ApiProperty({ example: 10 })
  lessonId: number;

  @ApiProperty({ example: 'Intro' })
  lessonTitle: string;

  @ApiProperty({ example: 30 })
  progressPercent: number;
}

export class LearnerHomeCourseCardDto {
  @ApiProperty({ example: 1 })
  courseId: number;

  @ApiProperty({ example: 'Basic TypeScript' })
  title: string;

  @ApiProperty({ example: 0, nullable: false })
  progressPercent: number;
}

export class LearnerHomeNotificationsDto {
  @ApiProperty({ example: 0 })
  unreadCount: number;
}

export class LearnerHomeResponseDto {
  @ApiProperty({ type: LearnerHomeHeaderDto })
  header: LearnerHomeHeaderDto;

  @ApiProperty({ type: LearnerHomeContinueLearningDto, nullable: true })
  continueLearning: LearnerHomeContinueLearningDto | null;

  @ApiProperty({ type: LearnerHomeCourseCardDto, isArray: true })
  myCourses: LearnerHomeCourseCardDto[];

  @ApiProperty({ type: LearnerHomeCourseCardDto, isArray: true })
  wishlistOrRecommended: LearnerHomeCourseCardDto[];

  @ApiProperty({ type: LearnerHomeNotificationsDto })
  notifications: LearnerHomeNotificationsDto;
}
