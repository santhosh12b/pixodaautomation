import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const VALID_USERNAME = 'theeditingcrew';
const VALID_PASSWORD = 'Dunesday@17';

router.post('/login', (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Username and password are required',
    });
  }

  const { username, password } = parsed.data;

  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    return res.status(200).json({
      status: 'ok',
      token: 'tec_auth_token_' + Buffer.from(`${VALID_USERNAME}:${Date.now()}`).toString('base64'),
      user: {
        username: VALID_USERNAME,
        name: 'The Editing Crew',
        role: 'admin',
      },
    });
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid username or password',
  });
});

router.get('/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer tec_auth_token_')) {
    return res.status(200).json({
      status: 'ok',
      valid: true,
      user: {
        username: VALID_USERNAME,
        name: 'The Editing Crew',
        role: 'admin',
      },
    });
  }

  return res.status(401).json({
    error: 'Unauthorized',
    valid: false,
    message: 'Invalid or expired session token',
  });
});

export default router;

