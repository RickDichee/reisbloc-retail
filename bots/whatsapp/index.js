import express from 'express';
import crypto from 'crypto';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const DIFY_API_URL = process.env.DIFY_API_URL || 'http://localhost/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY;

const app = express();
app.use(express.json());

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;
  
  if (body.object !== 'whatsapp_business_account') {
    return res.sendStatus(404);
  }

  res.sendStatus(200);

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages') {
        await handleMessages(change.value);
      }
    }
  }
});

async function handleMessages(value) {
  const messages = value.messages || [];

  for (const message of messages) {
    const from = message.from;
    const body = message.text?.body || '';

    if (!body) continue;

    console.log(`Received from ${from}: ${body}`);

    const response = await getDifyResponse(from, body);
    await sendMessage(from, response);
  }
}

async function getDifyResponse(userId, query) {
  try {
    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: query,
        response_mode: 'streaming',
        user: userId,
        conversation_id: '',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Dify error:', response.status, error);
      return 'Gracias por tu mensaje. 😊';
    }

    let fullAnswer = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if ((data.event === 'message' || data.event === 'agent_message') && data.answer) {
              fullAnswer += data.answer;
            }
            if (data.event === 'message_end') break;
          } catch (e) {}
        }
      }
    }

    return fullAnswer || 'Gracias por tu mensaje. 😊';
  } catch (error) {
    console.error('Dify connection error:', error);
    return 'Gracias por tu mensaje. 😊';
  }
}

async function sendMessage(to, body) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log('Would send:', body.substring(0, 50));
    return;
  }

  try {
    await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body },
      }),
    });
    console.log(`Sent to ${to}: ${body.substring(0, 30)}...`);
  } catch (error) {
    console.error('Send error:', error);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WhatsApp Bot running on port ${PORT}`);
  console.log(`Webhook URL: /webhook`);
  console.log(`Update Meta webhook to: https://YOUR_NGROK_URL/webhook`);
});
