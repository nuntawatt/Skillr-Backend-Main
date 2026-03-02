import {
    BadRequestException,
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import OpenAI from 'openai';
import { Repository } from 'typeorm';

import { Lesson } from '../lessons/entities/lesson.entity';
import { AiQuizGeneration } from './entities/ai-analyzer-entity';
import { Quizs } from '../quizs/entities/quizs.entity';
import type { GenerateAiQuizDto } from './dto/generate-ai-quiz.dto';

type AiQuizQuestion = {
    question: string;
    choices: string[];
    answerIndex: number;
    explanation: string;
};

type AiQuizResponse = {
    questions: AiQuizQuestion[];
};

@Injectable()
export class AiQuizService {
    private readonly modelName = 'gpt-4o-mini';

    constructor(
        @InjectRepository(AiQuizGeneration)
        private readonly aiRepo: Repository<AiQuizGeneration>,

        @InjectRepository(Lesson)
        private readonly lessonRepo: Repository<Lesson>,

        @InjectRepository(Quizs)
        private readonly quizRepo: Repository<Quizs>,
    ) { }

    private getOpenAIClient(): OpenAI {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
        }

        return new OpenAI({ apiKey });
    }

    async generateQuizFromLesson(lessonId: number, options?: GenerateAiQuizDto) {
        const lesson = await this.lessonRepo.findOne({
            where: { lesson_id: lessonId },
        });

        if (!lesson) {
            throw new NotFoundException('Lesson not found');
        }

        const description = lesson.lesson_description;
        if (typeof description !== 'string' || !description.trim()) {
            throw new BadRequestException('Lesson description is empty');
        }

        const prompt = this.buildPrompt(description, options);

        try {
            const openai = this.getOpenAIClient();
            const response = await openai.chat.completions.create({
                model: this.modelName,
                temperature: 0.4,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an expert educational quiz generator. Only use the provided lesson content. Return ONLY valid JSON.',
                    },
                    { role: 'user', content: prompt },
                ],
            });

            const content = response.choices?.[0]?.message?.content;
            if (!content) {
                throw new BadRequestException('AI returned an empty response');
            }

            const parsed = this.parseAndValidateQuizJson(content);

            const saved = this.aiRepo.create({
                lessonId,
                prompt_used: prompt,
                ai_response: parsed,
                model_name: this.modelName,
                prompt_tokens: response.usage?.prompt_tokens,
                completion_tokens: response.usage?.completion_tokens,
                total_tokens: response.usage?.total_tokens,
                status: 'PENDING',
            });

            return await this.aiRepo.save(saved);
        } catch (error: any) {
            const status = error?.status;
            const code = error?.code;
            const type = error?.type;
            const message =
                error?.error?.message ?? error?.message ?? 'Unknown OpenAI error';

            const failed = this.aiRepo.create({
                lessonId,
                prompt_used: prompt,
                ai_response: {},
                model_name: this.modelName,
                status: 'REJECTED',
                error_message: message,
            });

            await this.aiRepo.save(failed);

            if (
                status === 429 ||
                code === 'insufficient_quota' ||
                type === 'insufficient_quota'
            ) {
                throw new HttpException(
                    {
                        message: 'OpenAI quota exceeded (insufficient_quota). Please check billing/quota and try again.',
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            if (status === 401 || status === 403) {
                throw new ServiceUnavailableException(
                    'OpenAI authentication failed (check OPENAI_API_KEY and permissions).',
                );
            }

            if (typeof status === 'number' && status >= 400) {
                throw new ServiceUnavailableException(
                    `OpenAI request failed (${status}): ${message}`,
                );
            }

            throw error;
        }
    }

    async approveAiQuiz(aiQuizId: number) {
        const ai = await this.aiRepo.findOne({
            where: { ai_quiz_id: aiQuizId },
        });

        if (!ai) {
            throw new NotFoundException('AI quiz not found');
        }

        if (ai.status === 'APPROVED') {
            throw new BadRequestException('AI quiz already approved');
        }

        const validated = this.validateAiQuizResponse(ai.ai_response);
        const question = validated.questions[0];
        const correctChoice = question.choices[question.answerIndex];

        const quizData: Partial<Quizs> = {
            lessonId: ai.lessonId,
            quizsType: 'multiple_choice',
            quizsQuestions: question.question,
            quizsOption: question.choices,

            // เก็บเป็นข้อความคำตอบที่ถูก เพื่อให้เข้ากับ flow เดิม (frontend ส่งเป็น string)
            quizsAnswer: correctChoice,
            quizsExplanation: question.explanation,
        };

        const existing = await this.quizRepo.findOne({
            where: { lessonId: ai.lessonId },
        });

        const quiz = existing
            ? Object.assign(existing, quizData)
            : this.quizRepo.create(quizData);

        const savedQuiz = await this.quizRepo.save(quiz);

        ai.status = 'APPROVED';
        await this.aiRepo.save(ai);

        return savedQuiz;
    }

    private parseAndValidateQuizJson(content: string): AiQuizResponse {
        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch {
            throw new BadRequestException('AI returned invalid JSON');
        }

        return this.validateAiQuizResponse(parsed);
    }

    private validateAiQuizResponse(data: unknown): AiQuizResponse {
        if (!data || typeof data !== 'object') {
            throw new BadRequestException('AI response must be a JSON object');
        }

        const obj = data as Record<string, unknown>;
        const questions = obj.questions;

        if (!Array.isArray(questions) || questions.length < 1) {
            throw new BadRequestException('AI response must include questions[]');
        }

        const first = questions[0] as any;

        if (!first || typeof first !== 'object') {
            throw new BadRequestException('AI response questions[0] must be an object');
        }

        const question = first.question;
        const choices = first.choices;
        const answerIndex = first.answerIndex;
        const explanation = first.explanation;

        if (typeof question !== 'string' || !question.trim()) {
            throw new BadRequestException('AI response question must be a non-empty string');
        }

        if (
            !Array.isArray(choices) ||
            choices.length !== 4 ||
            choices.some((c) => typeof c !== 'string')
        ) {
            throw new BadRequestException('AI response choices must be an array of 4 strings');
        }

        if (
            typeof answerIndex !== 'number' ||
            !Number.isInteger(answerIndex) ||
            answerIndex < 0 ||
            answerIndex > 3
        ) {
            throw new BadRequestException('AI response answerIndex must be an integer 0-3');
        }

        if (typeof explanation !== 'string') {
            throw new BadRequestException('AI response explanation must be a string');
        }

        return {
            questions: [
                {
                    question,
                    choices,
                    answerIndex,
                    explanation,
                },
            ],
        };
    }

    private buildPrompt(content: string, options?: GenerateAiQuizDto) {
        const languageLine = options?.language?.trim()
            ? `Language: ${options.language.trim()}`
            : '';

        const difficultyLine = options?.difficulty
            ? `Difficulty: ${options.difficulty}`
            : '';

        const meta = [languageLine, difficultyLine].filter(Boolean).join('\n');

        return `Generate 1 multiple choice quiz from the lesson below.

        ${meta ? `Constraints:\n${meta}\n` : ''}

        Rules:
            - 4 choices
            - Only 1 correct answer
            - Wrong answers must be realistic
            - Question must test understanding
            - Return JSON format

        Return:

        {
        "questions": [
            {
            "question": "",
            "choices": ["", "", "", ""],
            "answerIndex": 0,
            "explanation": ""
            }
        ]
        }

        Lesson Content:
        ${content}
    `;
    }
}