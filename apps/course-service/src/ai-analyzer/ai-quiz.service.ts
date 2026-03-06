import {
    BadRequestException,
    BadGatewayException,
    HttpException,
    Injectable,
    NotFoundException,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
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
    private readonly modelName = process.env.HUGGINGFACE_MODEL;

    constructor(
        @InjectRepository(AiQuizGeneration)
        private readonly aiRepo: Repository<AiQuizGeneration>,

        @InjectRepository(Lesson)
        private readonly lessonRepo: Repository<Lesson>,

        @InjectRepository(Quizs)
        private readonly quizRepo: Repository<Quizs>,
    ) { }

    private async callHuggingFace(prompt: string) {
        const apiKey = process.env.HUGGINGFACE_API_KEY;

        if (!apiKey) {
            throw new ServiceUnavailableException(
                'HUGGINGFACE_API_KEY is not configured',
            );
        }

        const response = await axios.post(
            'https://router.huggingface.co/v1/chat/completions',
            {
                model: this.modelName,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an expert educational quiz generator. Return ONLY JSON.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.4,
                max_tokens: 500,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30_000,
            },
        );

        return response.data;
    }

    private rethrowHuggingFaceAxiosError(
        error: unknown,
        message: string,
    ): never {
        if (!axios.isAxiosError(error)) {
            throw new ServiceUnavailableException(
                `HuggingFace request failed: ${message}`,
            );
        }

        const status = error.response?.status;
        const data = error.response?.data as any;

        if (status === 400) {
            const hfCode = data?.code ?? data?.error?.code;
            if (hfCode === 'model_not_supported') {
                throw new BadRequestException(
                    `HuggingFace rejected request: ${message}. Hint: set HUGGINGFACE_MODEL to a model supported by your enabled HuggingFace Inference Provider(s), or enable a provider for this model in your HuggingFace account settings.`,
                );
            }

            throw new BadRequestException(`HuggingFace rejected request: ${message}`);
        }

        if (status === 401 || status === 403) {
            throw new UnauthorizedException(
                `HuggingFace authentication/permission failed: ${message}`,
            );
        }

        if (status === 429) {
            throw new HttpException(
                `HuggingFace rate limited: ${message}`,
                429,
            );
        }

        if (typeof status === 'number' && status >= 400 && status < 500) {
            throw new BadGatewayException(`HuggingFace client error: ${message}`);
        }

        throw new ServiceUnavailableException(
            `HuggingFace request failed: ${message}`,
        );
    }

    private safeStringify(value: unknown) {
        if (typeof value === 'string') {
            return value;
        }

        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    private truncate(value: string, maxLength = 2_000) {
        if (value.length <= maxLength) {
            return value;
        }

        return `${value.slice(0, maxLength)}…`;
    }

    private formatHttpException(error: HttpException) {
        const response = error.getResponse();

        if (typeof response === 'string') {
            return response;
        }

        const message = (response as any)?.message;

        if (Array.isArray(message)) {
            return message.join('; ');
        }

        if (typeof message === 'string') {
            return message;
        }

        return this.truncate(this.safeStringify(response));
    }

    private formatHuggingFaceError(error: unknown) {
        if (!axios.isAxiosError(error)) {
            const message = (error as any)?.message;
            return typeof message === 'string' ? message : this.safeStringify(error);
        }

        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const data = error.response?.data;

        const upstreamError = (data as any)?.error ?? data;
        const upstreamText = this.truncate(this.safeStringify(upstreamError));

        if (status) {
            return statusText
                ? `HTTP ${status} ${statusText}: ${upstreamText}`
                : `HTTP ${status}: ${upstreamText}`;
        }

        return upstreamText || error.message;
    }

    async generateQuizFromLesson(
        lessonId: number,
        options?: GenerateAiQuizDto,
    ) {
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
            const response = await this.callHuggingFace(prompt);

            const content = response?.choices?.[0]?.message?.content;

            if (!content) {
                throw new BadRequestException('AI returned empty response');
            }

            const parsed = this.parseAndValidateQuizJson(content);

            const saved = this.aiRepo.create({
                lessonId,
                prompt_used: prompt,
                ai_response: parsed,
                model_name: this.modelName,
                status: 'PENDING',
            });

            return await this.aiRepo.save(saved);
        } catch (error: unknown) {
            const message =
                error instanceof HttpException
                    ? this.formatHttpException(error)
                    : this.formatHuggingFaceError(error);

            const failed = this.aiRepo.create({
                lessonId,
                prompt_used: prompt,
                ai_response: {},
                model_name: this.modelName,
                status: 'REJECTED',
                error_message: message,
            });

            await this.aiRepo.save(failed);

            if (error instanceof HttpException) {
                throw error;
            }

            this.rethrowHuggingFaceAxiosError(error, message);
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
            throw new BadRequestException('AI response must be JSON object');
        }

        const obj = data as Record<string, unknown>;
        const questions = obj.questions;

        if (!Array.isArray(questions) || questions.length < 1) {
            throw new BadRequestException('AI response must include questions[]');
        }

        const first = questions[0] as any;

        if (!first || typeof first !== 'object') {
            throw new BadRequestException('AI response questions[0] invalid');
        }

        const question = first.question;
        const choices = first.choices;
        const answerIndex = first.answerIndex;
        const explanation = first.explanation;

        if (typeof question !== 'string' || !question.trim()) {
            throw new BadRequestException('Invalid question');
        }

        if (
            !Array.isArray(choices) ||
            choices.length !== 4 ||
            choices.some((c) => typeof c !== 'string')
        ) {
            throw new BadRequestException('choices must be 4 strings');
        }

        if (
            typeof answerIndex !== 'number' ||
            answerIndex < 0 ||
            answerIndex > 3
        ) {
            throw new BadRequestException('answerIndex must be 0-3');
        }

        if (typeof explanation !== 'string') {
            throw new BadRequestException('explanation must be string');
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
        const languageLine = options?.language
            ? `Language: ${options.language}`
            : '';

        const difficultyLine = options?.difficulty
            ? `Difficulty: ${options.difficulty}`
            : '';

        const admin = options?.admin ?? options?.prompt;

        const promptLine = admin?.trim()
            ? `admin: ${admin.trim()}`
            : '';

        const meta = [languageLine, difficultyLine, promptLine]
            .filter(Boolean)
            .join('\n');

        return `
Generate 1 multiple choice quiz from the lesson below.

${meta ? `Constraints:\n${meta}\n` : ''}

Rules:
- 4 choices
- Only 1 correct answer
- Wrong answers must be realistic
- Question must test understanding
- Return ONLY JSON

Return format:

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