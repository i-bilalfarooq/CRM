import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const msgs = await prisma.message.findMany({ 
    where: { body: { in: ['He is here', 'With me', 'Tell him to call me'] } }, 
    orderBy: { timestamp: 'desc' }, 
    take: 10 
  });
  console.log(msgs.map(m => ({ 
    id: m.whatsappMessageId, 
    from: m.from, 
    to: m.to, 
    isIncoming: m.isIncoming, 
    body: m.body
  })));
  process.exit(0);
}

main().catch(console.error);
