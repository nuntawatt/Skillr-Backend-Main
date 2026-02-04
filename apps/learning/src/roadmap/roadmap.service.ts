import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LessonProgress } from '../learning-progress/entities/lesson-progress.entity';

@Injectable()
export class RoadmapService {
  private readonly courseServiceUrl = process.env.COURSE_SERVICE_URL ?? 'http://localhost:3001';
  private readonly quizServiceUrl = process.env.QUIZ_SERVICE_URL ?? 'http://localhost:3002';

  constructor(
    @InjectRepository(LessonProgress)
    private readonly progressRepository: Repository<LessonProgress>,
    private readonly httpService: HttpService,
  ) {}

  async getChapterRoadmap(userId: string, chapterId: number) {
    // 1) ดึง lessons จาก course service
    const lessons = await firstValueFrom(
      this.httpService.get(`${this.courseServiceUrl}/lessons?chapterId=${chapterId}`)
    ).then(res => res.data);

    // 2) ดึง progress ของ user สำหรับ lessons เหล่านี้
    const lessonIds = lessons.map(l => l.lesson_id);
    const progressMap = await this.getProgressMap(userId, lessonIds);

    // 3) ดึง checkpoints จาก quiz service
    const checkpoints = lessonIds.length > 0 ? await firstValueFrom(
      this.httpService.get(`${this.quizServiceUrl}/quizzes/checkpoint/batch`, { params: { lessonIds: lessonIds.join(',') } })
    ).then(res => res.data).catch(() => []) : [];

    // 4) สร้าง roadmap items (lessons + checkpoints ท้ายสุด)
    const items: any[] = [];

    // เพิ่ม lessons ก่อน
    for (const lesson of lessons) {
      items.push({
        id: lesson.lesson_id,
        title: lesson.lesson_title,
        type: lesson.lesson_type,
        order: lesson.orderIndex,
        status: this.getStatus(progressMap[lesson.lesson_id]),
        ref_id: lesson.ref_id
      });
    }

    // เพิ่ม checkpoints เป็น item สุด้าย (ถ้ามี)
    for (const checkpoint of checkpoints) {
      items.push({
        id: checkpoint.checkpointId,
        title: 'Checkpoint',
        type: 'checkpoint',
        order: 999,
        status: this.getStatus(progressMap[checkpoint.lessonId]),
        ref_id: checkpoint.lessonId
      });
    }

    return {
      chapterId,
      items: items.sort((a, b) => a.order - b.order)
    };
  }

  private async getProgressMap(userId: string, lessonIds: number[]) {
    if (lessonIds.length === 0) return {};
    const progresses = await this.progressRepository.find({
      where: {
        userId: Number(userId),
        lessonId: In(lessonIds)
      }
    });

    const map = {};
    progresses.forEach(p => {
      map[p.lessonId] = p;
    });
    return map;
  }

  private getStatus(progress: LessonProgress | undefined): 'completed' | 'current' | 'locked' {
    if (progress) return 'completed';
    return 'current';
  }
}
