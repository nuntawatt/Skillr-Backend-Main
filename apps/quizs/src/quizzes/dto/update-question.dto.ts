import { PartialType } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-quiz.dto';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}

