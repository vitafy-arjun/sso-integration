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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const env = partnerAuthEnvFromProcess();
    const gateway = requireGatewayOriginFromEnv(env.VITE_GATEWAY_ORIGIN);
    const pathParam = req.query.path;
    const segments = Array.isArray(pathParam)
      ? pathParam
      : typeof pathParam === 'string'
        ? [pathParam]
        : [];

    const upstreamPath = segments.map((segment) => encodeURIComponent(segment)).join('/');
    const upstream = new URL(`${gateway.replace(/\/$/, '')}/integrations/${upstreamPath}`);

    for (const [key, value] of Object.entries(req.query)) {
      if (key === 'path') {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          upstream.searchParams.append(key, item);
        }
      } else if (value != null) {
        upstream.searchParams.set(key, String(value));
      }
    }

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

    const upstreamResponse = await fetch(upstream.toString(), { method, headers, body });
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
