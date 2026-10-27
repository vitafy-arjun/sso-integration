import type { Connect } from 'vite';
import {
  buildAuthorizeUrlResponse,
  createPartnerAuthContext,
  exchangeAuthorizationCode,
  formatHandlerError,
} from '../lib/partnerAuthCore.js';

function readJsonBody(req: Connect.IncomingMessage): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as Record<string, string>) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export function createPartnerAuthApiMiddleware(env: Record<string, string>): Connect.NextHandleFunction {
  const ctx = createPartnerAuthContext(env);

  return async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '';

    if (url === '/auth/vitafy/authorize-url' && req.method === 'GET') {
      try {
        const query = new URL(req.url ?? '', 'http://localhost').searchParams;
        const state = query.get('state')?.trim();
        const codeChallenge = query.get('code_challenge')?.trim();
        if (!state || !codeChallenge) {
          res.statusCode = 400;
          res.end('state and code_challenge query params are required');
          return;
        }
        if (state.length > 512 || codeChallenge.length > 256) {
          res.statusCode = 400;
          res.end('state or code_challenge is too long');
          return;
        }
        const payload = await buildAuthorizeUrlResponse(ctx, { state, codeChallenge });
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(formatHandlerError(error));
      }
      return;
    }

    if (url !== '/auth/vitafy/token' || req.method !== 'POST') {
      next();
      return;
    }

    try {
      const body = await readJsonBody(req);
      const code = body.code?.trim();
      const codeVerifier = body.code_verifier?.trim();
      if (!code || !codeVerifier) {
        res.statusCode = 400;
        res.end('code and code_verifier are required');
        return;
      }

      const text = await exchangeAuthorizationCode(ctx, { code, codeVerifier });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(text);
    } catch (error) {
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode: unknown }).statusCode)
          : 500;
      res.statusCode = Number.isFinite(statusCode) && statusCode >= 400 ? statusCode : 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(formatHandlerError(error));
    }
  };
}
