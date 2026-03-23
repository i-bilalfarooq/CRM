import fs from 'fs';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

const whatsapp = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    handleSIGINT: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

whatsapp.on('ready', async () => {
  console.log('WhatsApp Client is ready!');
  try {
    const chat = await whatsapp.getChatById('971505846265@c.us');
    const messages = await chat.fetchMessages({ limit: 15 });
    
    const dump = messages.map(msg => ({
      id: msg.id,
      body: msg.body,
      fromMe: msg.fromMe,
      idFromMe: msg.id?.fromMe,
      timestamp: msg.timestamp,
      jsDate: new Date(msg.timestamp * 1000).toISOString(),
      type: msg.type
    }));
    
    fs.writeFileSync('wa-dump.json', JSON.stringify(dump, null, 2));
    console.log('Dumped 15 messages to wa-dump.json');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

whatsapp.initialize();
