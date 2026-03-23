const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.message.findMany({ 
  where: { contact: { phone: '971505846265@c.us' } }, 
  orderBy: { timestamp: 'desc' }, 
  take: 10 
}).then(msgs => {
  console.log(msgs.map(m => ({ 
    id: m.whatsappMessageId, 
    from: m.from, 
    to: m.to, 
    isIncoming: m.isIncoming, 
    body: m.body
  })));
  process.exit(0);
});
