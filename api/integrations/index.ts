import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireGatewayOriginFromEnv } from '../../lib/gatewayOrigin.js';
import { formatHandlerError, partnerAuthEnvFromProcess } from '../../lib/partnerAuthCore.js';

function forwardHeader(req: VercelRequest, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/** Path after `/integrations/` (rewrite preserves original URL on `req.url`). */
function integrationSubPath(req: VercelRequest): string {
  const pathname = (req.url ?? '/').split('?')[0] ?? '/';
  for (const prefix of ['/integrations/', '/api/integrations/']) {
    const index = pathname.indexOf(prefix);
    if (index !== -1) {
      return pathname.slice(index + prefix.length).replace(/^\/+/, '');
    }
  }
  return '';
}

function queryStringFromRequest(req: VercelRequest): string {
  const raw = req.url ?? '';
  const q = raw.indexOf('?');
  return q === -1 ? '' : raw.slice(q);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const env = partnerAuthEnvFromProcess();
    const gateway = requireGatewayOriginFromEnv(env.VITE_GATEWAY_ORIGIN);
    const subPath = integrationSubPath(req);
    const base = `${gateway.replace(/\/$/, '')}/integrations/${subPath}`.replace(/\/$/, '');
    const upstream = `${base}${queryStringFromRequest(req)}`;

    const method = req.method ?? 'GET';
    const headers = new Headers();
    const authorization = forwardHeader(req, 'authorization');
    const accept = forwardHeader(req, 'accept');
    const contentType = forwardHeader(req, 'content-type');
    if (authorization) {
      headers.set('authorization', authorization);
    }
    if (accept) {
      headers.set('accept', accept);
    }
    if (contentType) {
      headers.set('content-type', contentType);
    }

    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      body =
        typeof req.body === 'string'
          ? req.body
          : req.body != null
            ? JSON.stringify(req.body)
            : undefined;
    }

    const upstreamResponse = await fetch(upstream, { method, headers, body });
    const text = await upstreamResponse.text();
    res.status(upstreamResponse.status);
    const upstreamContentType = upstreamResponse.headers.get('content-type');
    if (upstreamContentType) {
      res.setHeader('Content-Type', upstreamContentType);
    }
    res.end(text);
  } catch (error) {
    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(formatHandlerError(error));
  }
}
