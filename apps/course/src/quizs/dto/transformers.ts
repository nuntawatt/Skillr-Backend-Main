import { TransformFnParams } from 'class-transformer';

// แปลง string -> int (ปล่อย undefined ถ้าไม่มีค่า)
export const toInt = ({ value }: TransformFnParams) => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = parseInt(value as any, 10);
  return isNaN(parsed) ? value : parsed;
};

// รองรับ:
// - array จริง
// - JSON string e.g. '["a","b"]'
// - comma separated e.g. "a,b,c"
// - single string -> [single]
export const toStringArray = ({ value }: TransformFnParams) => {
  if (value == null) return value;
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {}

    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return [trimmed];
  }

  return value;
};

// ถ้าต้องการให้ answer เก็บเป็น string เสมอ (ป้องกัน any)
export const toString = ({ value }: TransformFnParams) => {
  if (value === null || value === undefined) return value;
  return String(value);
};