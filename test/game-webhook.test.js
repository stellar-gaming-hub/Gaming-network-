import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import test from 'node:test';
import { createGameWebhookHandler, createGameWebhookRouter } from '../src/game-webhook.js';

const secret = 'test-secret';
const rawBody = Buffer.from('{"sessionId":"session-1","state":"active"}');
const signature = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

test('updates session state only after verifying the signature', async () => {
  let updatedPayload;
  const handler = createGameWebhookHandler({
    secret,
    updateSessionState: async (payload) => {
      updatedPayload = payload;
    },
  });

  await handler({ rawBody, signature });

  assert.deepEqual(updatedPayload, { sessionId: 'session-1', state: 'active' });
});

test('rejects missing and invalid signatures without updating session state', async () => {
  let updateCount = 0;
  const handler = createGameWebhookHandler({
    secret,
    updateSessionState: () => {
      updateCount += 1;
    },
  });

  for (const invalidSignature of [undefined, 'sha256=invalid']) {
    await assert.rejects(handler({ rawBody, signature: invalidSignature }), { statusCode: 401 });
  }

  assert.equal(updateCount, 0);
});

test('rejects malformed JSON without updating session state', async () => {
  const malformedBody = Buffer.from('{');
  const malformedSignature = `sha256=${createHmac('sha256', secret).update(malformedBody).digest('hex')}`;
  let updateCount = 0;
  const handler = createGameWebhookHandler({
    secret,
    updateSessionState: () => {
      updateCount += 1;
    },
  });

  await assert.rejects(
    handler({ rawBody: malformedBody, signature: malformedSignature }),
    { statusCode: 400 },
  );
  assert.equal(updateCount, 0);
});

test('HTTP route verifies the raw body before updating session state', async () => {
  let updatedPayload;
  const app = express();
  app.use('/webhooks/game', createGameWebhookRouter({
    secret,
    updateSessionState: (payload) => {
      updatedPayload = payload;
    },
  }));

  const accepted = await request(app)
    .post('/webhooks/game')
    .set('content-type', 'application/json')
    .set('x-game-signature', signature)
    .send(rawBody.toString('utf8'));

  assert.equal(accepted.status, 204);
  assert.deepEqual(updatedPayload, { sessionId: 'session-1', state: 'active' });

  const rejected = await request(app)
    .post('/webhooks/game')
    .set('content-type', 'application/json')
    .set('x-game-signature', 'sha256=invalid')
    .send(rawBody.toString('utf8'));

  assert.equal(rejected.status, 401);
  assert.deepEqual(updatedPayload, { sessionId: 'session-1', state: 'active' });
});