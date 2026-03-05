import { ConfigService } from '@nestjs/config';

import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  it('validate maps Google profile to user payload and calls done', async () => {
    const cfg = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'client',
          GOOGLE_CLIENT_SECRET: 'secret',
          GOOGLE_CALLBACK_URL: 'http://localhost/callback',
        };
        return map[key] ?? '';
      }),
    } as unknown as ConfigService;

    const strategy = new GoogleStrategy(cfg);

    const done = jest.fn();
    await strategy.validate(
      'at',
      'rt',
      {
        id: 'google-1',
        name: { givenName: 'A', familyName: 'B' },
        emails: [{ value: 'a@b.com' }],
        photos: [{ value: 'https://img' }],
      } as any,
      done as any,
    );

    expect(done).toHaveBeenCalledWith(null, {
      googleId: 'google-1',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
      avatar: 'https://img',
    });
  });
});
