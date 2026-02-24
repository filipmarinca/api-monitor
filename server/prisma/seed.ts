import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@apimonitor.dev' },
    update: {},
    create: {
      email: 'demo@apimonitor.dev',
      name: 'Demo User',
      passwordHash,
      role: 'ADMIN',
      apiKey: 'demo_' + Math.random().toString(36).substring(2, 15),
    },
  });

  console.log('Created user:', user.email);

  // Create demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo-workspace' },
    update: {},
    create: {
      name: 'Demo Workspace',
      slug: 'demo-workspace',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  console.log('Created workspace:', workspace.name);

  // Create demo monitors
  const monitors = [
    {
      name: 'Google Homepage',
      url: 'https://www.google.com',
      method: 'GET',
      interval: 60000, // 1 minute
      timeout: 10000,
      expectedStatus: 200,
      regions: ['us-east', 'eu-west'],
    },
    {
      name: 'JSONPlaceholder API',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET',
      interval: 300000, // 5 minutes
      timeout: 15000,
      expectedStatus: 200,
      regions: ['us-east'],
    },
    {
      name: 'GitHub API',
      url: 'https://api.github.com/users/filipmarinca',
      method: 'GET',
      interval: 600000, // 10 minutes
      timeout: 20000,
      expectedStatus: 200,
      regions: ['us-east'],
    },
    {
      name: 'HTTP Status Test (200)',
      url: 'https://httpstat.us/200',
      method: 'GET',
      interval: 300000,
      timeout: 10000,
      expectedStatus: 200,
      regions: ['us-east'],
    },
    {
      name: 'Slow Response Test',
      url: 'https://httpstat.us/200?sleep=2000',
      method: 'GET',
      interval: 300000,
      timeout: 30000,
      expectedStatus: 200,
      regions: ['us-east'],
    },
  ];

  for (const monitorData of monitors) {
    const monitor = await prisma.monitor.create({
      data: {
        ...monitorData,
        workspaceId: workspace.id,
        userId: user.id,
      },
    });
    console.log('Created monitor:', monitor.name);
  }

  // Create public status page
  const statusPage = await prisma.statusPage.create({
    data: {
      slug: 'demo-status',
      title: 'API Monitor Demo Status',
      description: 'Public status page showing all monitored services',
      public: true,
      monitorIds: [],
    },
  });

  console.log('Created status page:', statusPage.slug);

  console.log('\n✅ Seed completed successfully!');
  console.log('\nDemo Credentials:');
  console.log('Email: demo@apimonitor.dev');
  console.log('Password: demo123');
  console.log('API Key:', user.apiKey);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
