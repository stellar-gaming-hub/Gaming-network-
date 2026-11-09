import { createHmac, timingSafeEqual } from 'node:crypto';
import express from 'express';

export function verifyGameWebhookSignature(rawBody, signature, secret) {
  if (!Buffer.isBuffer(rawBody) || typeof signature !== 'string' || typeof secret !== 'string' || !secret) {
    return false;
  }

  const match = /^sha256=([a-f0-9]{64})$/i.exec(signature);
  if (!match) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const supplied = Buffer.from(match[1], 'hex');
  return timingSafeEqual(expected, supplied);
}

export function createGameWebhookHandler({ secret, updateSessionState }) {
  if (typeof secret !== 'string' || !secret) {
    throw new TypeError('A non-empty webhook secret is required');
  }
  if (typeof updateSessionState !== 'function') {
    throw new TypeError('A session state updater is required');
  }

  return async function handleGameWebhook({ rawBody, signature }) {
    if (!verifyGameWebhookSignature(rawBody, signature, secret)) {
      const error = new Error('Invalid webhook signature');
      error.statusCode = 401;
      throw error;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      const error = new Error('Invalid JSON payload');
      error.statusCode = 400;
      throw error;
    }

    return updateSessionState(payload);
  };
}

export function createGameWebhookRouter({ secret, updateSessionState }) {
  const router = express.Router();
  const handleWebhook = createGameWebhookHandler({ secret, updateSessionState });

  router.post('/', express.raw({ type: 'application/json' }), async (request, response) => {
    try {
      await handleWebhook({
        rawBody: request.body,
        signature: request.get('x-game-signature'),
      });
      response.sendStatus(204);
    } catch (error) {
      const statusCode = error.statusCode === 400 || error.statusCode === 401 ? error.statusCode : 500;
      response.status(statusCode).json({
        error: statusCode === 500 ? 'Webhook processing failed' : error.message,
      });
    }
  });

  return router;
}