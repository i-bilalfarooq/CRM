import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';

const { Client, LocalAuth } = pkg;

// ─── Uploads directory ───────────────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Media helper ────────────────────────────────────────────────────────────
// Returns ONLY the fields that are set (avoids Prisma rejecting null on String?)
async function processMedia(msg: any): Promise<{
  mediaUrl?: string;
  fileName?: string;
  fileMimeType?: string;
}> {
  if (!msg.hasMedia) return {};
  try {
    const media = await msg.downloadMedia();
    if (media && media.data) {
      let ext = '';
      if (media.mimetype) {
        const sub = media.mimetype.split('/')[1];
        if (sub) ext = `.${sub.split(';')[0]}`;
      }
      const rawName = media.filename || `media_${Date.now()}${ext}`;
      // Sanitize filename
      const safeFileName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = path.join(uploadsDir, safeFileName);
      fs.writeFileSync(filePath, media.data, 'base64');
      return {
        mediaUrl: `/uploads/${safeFileName}`,
        fileName: rawName,
        fileMimeType: media.mimetype,
      };
    }
  } catch (e) {
    console.error('Failed to download media for msg', msg.id?.id, e);
  }
  return {};
}

// ─── DB setup ────────────────────────────────────────────────────────────────
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

// ─── Express / Socket.IO ─────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadsDir));

// ─── WhatsApp Client ─────────────────────────────────────────────────────────
const whatsapp = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    handleSIGINT: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

whatsapp.on('qr', (qr) => {
  console.log('SCAN THIS QR CODE:');
  qrcode.generate(qr, { small: true });
  io.emit('whatsapp_qr', qr);
});

whatsapp.on('ready', async () => {
  console.log('WhatsApp Client is ready!');
  io.emit('whatsapp_status', 'ready');

  try {
    console.log('Fetching existing chats...');
    const chats = await whatsapp.getChats();
    console.log(`Found ${chats.length} chats. Syncing to database...`);

    for (const chat of chats) {
      try {
        const contactName = chat.name || chat.id.user;
        const phone = chat.id._serialized;

        // Skip broadcast/status chats
        if (phone === 'status@broadcast') continue;

        let contact = await prisma.contact.findUnique({ where: { phone } });
        if (!contact) {
          contact = await prisma.contact.create({
            data: { phone, name: contactName },
          });
        } else if (!contact.name && contactName) {
          contact = await prisma.contact.update({
            where: { id: contact.id },
            data: { name: contactName },
          });
        }

        // Fetch last 50 messages per chat
        let chatMessages: any[] = [];
        try {
          chatMessages = await chat.fetchMessages({ limit: 50 });
        } catch (e) {
          console.error(`Could not fetch messages for ${phone}:`, e);
          continue;
        }

        for (const msg of chatMessages) {
          try {
            const exists = await prisma.message.findUnique({
              where: { whatsappMessageId: msg.id.id },
            });
            if (exists) continue;

            const mediaFields = await processMedia(msg);
            const isFromMe = msg.id?.fromMe || msg.fromMe || (whatsapp.info && msg.from === whatsapp.info.wid._serialized);

            await prisma.message.create({
              data: {
                whatsappMessageId: msg.id.id,
                from: msg.from || 'me',
                to: msg.to || phone,
                body: msg.body || '',
                type: msg.type || 'text',
                isIncoming: !isFromMe,
                contactId: contact.id,
                status: 'delivered',
                timestamp: new Date(msg.timestamp * 1000),
                ...mediaFields,
              },
            });
          } catch (msgErr) {
            console.error(`Skipping msg ${msg.id?.id}:`, (msgErr as any).message);
          }
        }
      } catch (chatErr) {
        console.error(`Error syncing chat:`, (chatErr as any).message);
      }
    }
    console.log('Initial sync completed!');
  } catch (error) {
    console.error('Error during initial sync:', error);
  }
});

// ─── Incoming messages ────────────────────────────────────────────────────────
whatsapp.on('message', async (msg) => {
  try {
    const from = msg.from;
    const body = msg.body || '';

    if (from === 'status@broadcast') return;

    let contactName: string = from;
    try {
      const c = await msg.getContact();
      contactName = c.pushname || c.name || from;
    } catch (_) {}

    let contact = await prisma.contact.findUnique({ where: { phone: from } });
    if (!contact) {
      contact = await prisma.contact.create({
        data: { phone: from, name: contactName },
      });
    }

    const mediaFields = await processMedia(msg);

    const savedMessage = await prisma.message.create({
      data: {
        whatsappMessageId: msg.id.id,
        from,
        to: 'me',
        body,
        type: msg.type || 'text',
        isIncoming: true,
        contactId: contact.id,
        status: 'delivered',
        timestamp: new Date(),
        ...mediaFields,
      },
    });

    console.log(`New message from ${from}: ${body}`);
    io.emit('new_message', savedMessage);

    // Also emit updated chat info so sidebar updates live
    io.emit('chat_updated', {
      contactId: contact.id,
      name: contact.name,
      phone: contact.phone,
      lastMessage: body || ((savedMessage as any).fileName ? (savedMessage as any).fileName : ''),
      lastMessageTime: savedMessage.timestamp,
    });
  } catch (error) {
    console.error('Error syncing incoming message:', error);
  }
});

whatsapp.initialize();

// ─── Socket.IO events ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.emit('whatsapp_status', 'initializing');

  socket.on('join_chat', (contactId) => socket.join(contactId));

  socket.on('send_message', async (data) => {
    try {
      const { to, body } = data;
      const sentMsg = await whatsapp.sendMessage(to, body);

      let contact = await prisma.contact.findUnique({ where: { phone: to } });
      if (!contact) {
        contact = await prisma.contact.create({ data: { phone: to, name: to } });
      }

      const savedMsg = await prisma.message.create({
        data: {
          whatsappMessageId: sentMsg.id.id,
          from: 'me',
          to,
          body,
          type: 'text',
          isIncoming: false,
          status: 'sent',
          timestamp: new Date(),
          contactId: contact.id,
        },
      });

      io.emit('new_message', savedMsg);
      io.emit('chat_updated', {
        contactId: contact.id,
        name: contact.name,
        phone: contact.phone,
        lastMessage: body,
        lastMessageTime: savedMsg.timestamp,
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('disconnect', () => console.log('User disconnected'));
});

// ─── REST API ────────────────────────────────────────────────────────────────
app.get('/api/chats', async (req, res) => {
  try {
    // Get contacts that have at least one message, ordered by last message time
    const contacts = await prisma.contact.findMany({
      where: {
        messages: { some: {} },
      },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    // Sort by most recent message first
    contacts.sort((a, b) => {
      const aTime = a.messages[0]?.timestamp?.getTime() ?? 0;
      const bTime = b.messages[0]?.timestamp?.getTime() ?? 0;
      return bTime - aTime;
    });

    const chats = contacts.map(contact => {
      const lastMsg = contact.messages[0];
      const lastMessageText = lastMsg?.body || (lastMsg as any)?.fileName || (lastMsg ? '📎 Media' : '');
      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        lastMessage: lastMessageText,
        lastMessageTime: lastMsg?.timestamp || contact.updatedAt,
        unreadCount: 0,
      };
    });

    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

app.get('/api/messages/:contactId', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { contactId: req.params.contactId },
      orderBy: { timestamp: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/chats/:contactId/sync', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { limit } = req.body || {};
    const fetchLimit = limit ? parseInt(limit) : 500;

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    let chat;
    try {
      chat = await whatsapp.getChatById(contact.phone);
    } catch (e) {
      res.status(404).json({ error: 'Chat not found on WhatsApp' });
      return;
    }

    const messages = await chat.fetchMessages({ limit: fetchLimit });
    let addedCount = 0;

    for (const msg of messages) {
      try {
        const mediaFields = await processMedia(msg);
        
        // msg.id.fromMe is the most reliable source of truth, but fallback to wid match
        const isFromMe = msg.id?.fromMe || msg.fromMe || (whatsapp.info && msg.from === whatsapp.info.wid._serialized);
        const actualIsIncoming = !isFromMe;

        await prisma.message.upsert({
          where: { whatsappMessageId: msg.id.id },
          update: {
            isIncoming: actualIsIncoming,
            body: msg.body || '',
          },
          create: {
            whatsappMessageId: msg.id.id,
            from: msg.from || 'me',
            to: msg.to || contact.phone,
            body: msg.body || '',
            type: msg.type || 'text',
            isIncoming: actualIsIncoming,
            contactId: contact.id,
            status: 'delivered',
            timestamp: new Date(msg.timestamp * 1000),
            ...mediaFields,
          },
        });
        
        addedCount++;
      } catch (err) {
        console.error(`Error syncing historical msg ${msg.id?.id}:`, err);
      }
    }
    
    res.json({ success: true, addedCount });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync chat history' });
  }
});

app.get('/', (_, res) => res.send('WhatsApp CRM Companion Backend is running'));

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

export { io, prisma, whatsapp };
