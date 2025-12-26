import { Injectable } from '@nestjs/common';
import {
  LearningProgressService,
  ProgressSummary,
} from './learning-progress.service';
import { LearningService, QuizAttemptStats } from './learning.service';

export type LearningDashboardResponse = {
  progress: ProgressSummary;
  quizzes: QuizAttemptStats;
};

@Injectable()
export class LearningDashboardService {
  constructor(
    private readonly learningProgressService: LearningProgressService,
    private readonly learningService: LearningService,
  ) {}

  async getDashboard(userId: string): Promise<LearningDashboardResponse> {
    const [progress, quizzes] = await Promise.all([
      this.learningProgressService.getSummary(userId),
      this.learningService.getUserAttemptStats(userId),
    ]);

    return {
      progress,
      quizzes,
    };
  }
}
