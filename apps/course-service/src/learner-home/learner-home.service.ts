import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { StreakService } from '../streaks/streak.service';
import { NotificationsService } from '../notifications/notifications.service';

import { LessonProgress } from '../progress/entities/progress.entity';
import { UserXp } from '../quizs/entities/user-xp.entity';
import { Course } from '../courses/entities/course.entity';

import { LearnerHomeResponseDto } from './dto/learner-home-response.dto';

// ประกาศ interface สำหรับข้อมูลโปรไฟล์ผู้ใช้ที่ดึงมาจาก Auth Service (ถ้าต้องการใช้ข้อมูลอื่นๆ นอกจาก avatarUrl ให้เพิ่มฟิลด์ในนี้ได้เลย)
interface UserProfile {
  avatarUrl: string | null;
}

@Injectable()
export class LearnerHomeService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly streakService: StreakService,
    private readonly notificationsService: NotificationsService,

    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,

    @InjectRepository(UserXp)
    private readonly userXpRepository: Repository<UserXp>,

    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) { }

  async getHome(
    userId: string,
    authorization?: string,
    internalCall?: string,
  ): Promise<LearnerHomeResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // ถ้าเป็น internal call ให้ข้ามการเรียก Auth Service เพื่อกันการวนเรียกซ้ำ (infinite loop)
    const shouldSkipProfile = internalCall === 'true';

    // ดึงข้อมูลต่างๆ ที่จำเป็นสำหรับหน้าแรกของผู้เรียนพร้อมกันทีเดียว (parallel) โดยมี fallback เป็นค่าเริ่มต้นหากการดึงข้อมูลใดล้มเหลว
    const [
      streak,
      totalXp,
      continueLearning,
      myCourses,
      notifications,
      recommendations,
      userProfile,
    ] = await Promise.all([
      this.getStreak(userId).catch(() => ({ currentStreak: 0 })),
      this.getTotalXp(userId).catch(() => 0),
      this.getContinueLearning(userId).catch(() => null),
      this.getMyCourses(userId).catch(() => []),
      this.getNotifications(userId).catch(() => ({ unreadCount: 0 })),
      this.getRecommendations().catch(() => ({ courses: [] })),
      !shouldSkipProfile ? this.getUserProfileFromAuth(authorization).catch(() => null) : null,
    ]);

    // return ข้อมูลทั้งหมดในรูปแบบที่ API ต้องการ โดยมีการจัดรูปแบบและ fallback ค่าเริ่มต้นสำหรับข้อมูลที่อาจจะดึงมาไม่ได้
    return {
      header: {
        userId,
        avatarUrl: userProfile?.avatarUrl ?? null,
        xp: totalXp,
        streakDays: streak.currentStreak,
      },
      continueLearning,
      myCourses,
      notifications,
      recommendations,
    };
  }

  // ดึง profile ผ่าน Auth Service แบบ internal call (ส่ง X-Internal-Call header กัน loop)
  private async getUserProfileFromAuth(
    authorization?: string,
  ): Promise<UserProfile | null> {
    if (!authorization) return null;

    try {
      const authBaseUrl = this.configService.get<string>(
        'AUTH_BASE_URL',
        'http://localhost:3001/api',
      );

      const response = await this.httpService.axiosRef.get(
        `${authBaseUrl}/users/profile`,
        {
          headers: {
            Authorization: authorization,
            'X-Internal-Call': 'true', // ส่ง header เพื่อบอกว่าเป็น internal call
          },
        },
      );

      return { avatarUrl: response.data?.avatarUrl ?? null };
    } catch {
      return null;
    }
  }

  // ดึงข้อมูล streak ปัจจุบันของผู้ใช้จาก StreakService
  private async getStreak(userId: string) {
    const { streak } = await this.streakService.getStreak(userId);
    return streak;
  }

  // ดึงข้อมูล total XP ของผู้ใช้จากฐานข้อมูล UserXp โดยรวมค่า xpEarned ทั้งหมดที่ผู้ใช้ได้รับมาแล้ว
  private async getTotalXp(userId: string) {
    const result = await this.userXpRepository
      .createQueryBuilder('ux')
      .select('COALESCE(SUM(ux.xpEarned), 0)', 'total')
      .where('ux.userId = :userId', { userId })
      .getRawOne<{ total: string }>();

    const totalXp = Number(result?.total ?? 0);

    return totalXp;
  }

  // ดึงข้อมูลบทเรียนล่าสุดที่ผู้ใช้กำลังเรียนอยู่ (ยังไม่จบ) เพื่อแสดงในส่วน Continue Learning ของหน้าแรก โดยเรียงลำดับจากบทเรียนที่มีการอัปเดตล่าสุด
  private async getContinueLearning(userId: string) {
    const latest = await this.lessonProgressRepository
      .createQueryBuilder('lp')
      .leftJoinAndSelect('lp.lesson', 'lesson')
      .leftJoinAndSelect('lesson.chapter', 'chapter')
      .leftJoinAndSelect('chapter.level', 'level')
      .leftJoinAndSelect('level.course', 'course')
      .where('lp.userId = :userId', { userId })
      .orderBy('lp.lastViewedAt', 'DESC')
      .getOne();

    // ถ้าไม่มีบทเรียนที่กำลังเรียนอยู่เลย หรือข้อมูลไม่ครบถ้วน ให้คืนค่า null เพื่อให้ frontend แสดงผลแบบไม่มีบทเรียนที่กำลังเรียนอยู่
    if (!latest?.lesson?.chapter?.level?.course) return null;

    // ดึงข้อมูลที่จำเป็นจาก entity ที่เชื่อมโยงกันมาแสดงในส่วน Continue Learning โดยมี fallback ค่าเริ่มต้นสำหรับข้อมูลที่อาจจะไม่มี
    const lesson = latest.lesson;
    const chapter = lesson.chapter;
    const level = chapter.level;
    const course = level.course;

    return {
      course_id: course.course_id,
      course_title: course.course_title,
      chapter_title: chapter.chapter_title,
      level_name: level.level_title,
      progressPercent: latest.progressPercent ?? 0,
    };
  }

  // ดึงข้อมูลคอร์สที่ผู้ใช้กำลังเรียนอยู่ทั้งหมดพร้อมกับความคืบหน้าของแต่ละคอร์ส โดยเรียงลำดับจากคอร์สที่มีการอัปเดตล่าสุด
  private async getMyCourses(userId: string) {
    const progressList = await this.lessonProgressRepository
      .createQueryBuilder('lp')
      .leftJoinAndSelect('lp.lesson', 'lesson')
      .leftJoinAndSelect('lesson.chapter', 'chapter')
      .leftJoinAndSelect('chapter.level', 'level')
      .leftJoinAndSelect('level.course', 'course')
      .where('lp.userId = :userId', { userId })
      .getMany();

    // ถ้าไม่มีบทเรียนที่กำลังเรียนอยู่เลย หรือข้อมูลไม่ครบถ้วน ให้คืนค่าเป็น array ว่างเพื่อให้ frontend แสดงผลแบบไม่มีคอร์สที่กำลังเรียนอยู่
    if (!progressList.length) return [];

    // map ข้อมูลบทเรียนที่กำลังเรียนอยู่ทั้งหมดมาเป็นข้อมูลคอร์สที่กำลังเรียนอยู่ 
    const courseMap = new Map<number, { total: number; completed: number; title: string }>();

    // loop ผ่าน progressList เพื่อคำนวณความคืบหน้าของแต่ละคอร์ส โดยใช้ Map เก็บข้อมูลเพื่อรวมบทเรียนที่อยู่ในคอร์สเดียวกันไว้ด้วยกัน
    for (const progress of progressList) {
      const course = progress.lesson?.chapter?.level?.course;
      if (!course) continue;

      if (!courseMap.has(course.course_id)) {
        courseMap.set(course.course_id, {
          total: 0,
          completed: 0,
          title: course.course_title,
        });
      }

      // เพิ่มจำนวนบทเรียนทั้งหมดในคอร์สนี้ และถ้าบทเรียนนี้มีสถานะเป็น COMPLETED หรือ SKIPPED ให้เพิ่มจำนวนบทเรียนที่จบแล้วด้วย
      const entry = courseMap.get(course.course_id)!;
      entry.total++;

      if (
        progress.status === 'COMPLETED' ||
        progress.status === 'SKIPPED'
      ) {
        entry.completed++;
      }
    }

    // แปลง Map เป็น array พร้อมคำนวณ % ความคืบหน้า
    return Array.from(courseMap.entries()).map(
      ([courseId, data]) => ({
        course_id: courseId,
        title: data.title,
        progressPercent:
          data.total > 0
            ? Math.round((data.completed / data.total) * 100)
            : 0,
      }),
    );
  }

  // ดึงข้อมูล Notifications-Service เพื่อแสดงในส่วนการแจ้งเตือนของหน้าแรก
  private async getNotifications(userId: string) {
    const unreadCount =
      await this.notificationsService.getUnreadCount(userId);
    return { unreadCount };
  }

  // ดึงข้อมูล Course Recommendations เพื่อแสดงในส่วนแนะนำคอร์สของหน้าแรก
  private async getRecommendations() {
    const take = 3; // default จำนวนคอร์สที่จะแนะนำ

    const recommendedCourses = await this.courseRepository.find({
      where: { isPublished: true },
      order: { updatedAt: 'DESC' },
      take,
    });

    const courses = recommendedCourses.map((course) => ({
      course_id: course.course_id,
      course_title: course.course_title,
      reason: 'คอร์สยอดนิยม',
      course_imageUrl: course.course_imageUrl ?? null,
      level_name: 'ระดับพื้นฐาน',
      course_totalChapter: 6,
    }));

    return { courses };
  }
}