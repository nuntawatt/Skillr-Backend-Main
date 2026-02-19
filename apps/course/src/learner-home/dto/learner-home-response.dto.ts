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

  course_id: number;



  @ApiProperty({ example: 'Basic TypeScript' })

  course_title: string;



  @ApiProperty({ example: 'Introduction to TypeScript' })

  chaptertitle: string;



  @ApiProperty({ example: 'ระดับพื้นฐาน' })

  levelName: string;



  @ApiProperty({ example: 30 })

  progressPercent: number;

}

export class LearnerHomeCourseCardDto {

  @ApiProperty({ example: 1 })

  course_id: number;



  @ApiProperty({ example: 'Basic TypeScript' })

  title: string;



  @ApiProperty({ example: 0, nullable: false })

  progressPercent: number;

}



export class LearnerHomeNotificationsDto {

  @ApiProperty({ example: 0 })

  unreadCount: number;

}



export class LearnerHomeRecommendationDto {

  @ApiProperty({ example: 1 })

  course_id: number;



  @ApiProperty({ example: 'JavaScript Fundamentals' })

  course_title: string;



  @ApiProperty({ example: 'เหมาะสำหรับผู้เริ่มต้น' })

  reason: string;



  @ApiProperty({ example: 'https://cdn.example.com/courses/js-fundamentals.jpg' })

  thumbnailUrl: string;



  @ApiProperty({ example: 'ระดับพื้นฐาน' })

  levelName: string;



  @ApiProperty({ example: 6 })

  totalChapter: number;

}



export class LearnerHomeRecommendationsDto {

  @ApiProperty({ type: [LearnerHomeRecommendationDto] })

  courses: LearnerHomeRecommendationDto[];

}



export class LearnerHomeResponseDto {

  @ApiProperty({ type: LearnerHomeHeaderDto })

  header: LearnerHomeHeaderDto;



  @ApiProperty({ type: LearnerHomeContinueLearningDto, nullable: true })

  continueLearning: LearnerHomeContinueLearningDto | null;



  @ApiProperty({ type: LearnerHomeCourseCardDto, isArray: true })

  myCourses: LearnerHomeCourseCardDto[];



  @ApiProperty({ type: LearnerHomeNotificationsDto })

  notifications: LearnerHomeNotificationsDto;



  @ApiProperty({ type: LearnerHomeRecommendationsDto })

  recommendations: LearnerHomeRecommendationsDto;

}

