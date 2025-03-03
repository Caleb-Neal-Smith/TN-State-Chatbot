import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean database
  await prisma.resourceUsage.deleteMany();
  await prisma.ollamaInstance.deleteMany();
  await prisma.systemLog.deleteMany();
  await prisma.query.deleteMany();
  await prisma.documentSource.deleteMany();
  await prisma.ragModel.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.embeddingsConfig.deleteMany();
  await prisma.systemMetric.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash('adminpass123', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
    },
  });

  // Create test user
  const userPassword = await bcrypt.hash('userpass123', 10);
  const user = await prisma.user.create({
    data: {
      username: 'testuser',
      email: 'user@example.com',
      password: userPassword,
      role: 'user',
    },
  });

  // Create system configurations
  await prisma.systemConfig.createMany({
    data: [
      {
        configKey: 'general',
        configValue: {
          systemName: 'RAG System',
          maxConcurrentRequests: 50,
          defaultModel: 'llama3-70b',
          cacheEnabled: true,
          cacheTTL: 3600,
          logLevel: 'info',
        },
        description: 'General system settings',
        createdBy: admin.id,
      },
      {
        configKey: 'retrieval',
        configValue: {
          defaultChunkSize: 512,
          defaultOverlapSize: 128,
          defaultTopK: 5,
          minRelevanceScore: 0.7,
          retrievalMethod: 'similarity',
          embeddingModel: 'all-MiniLM-L6-v2',
          reindexInterval: 24,
        },
        description: 'Document retrieval settings',
        createdBy: admin.id,
      },
      {
        configKey: 'models',
        configValue: {
          maxInstancesPerModel: 3,
          loadBalancingStrategy: 'round-robin',
          timeoutSeconds: 30,
          defaultParameters: {
            temperature: 0.7,
            maxTokens: 1024,
            topP: 0.9,
            presencePenalty: 1.0,
            frequencyPenalty: 1.0,
          },
        },
        description: 'Model configuration settings',
        createdBy: admin.id,
      },
      {
        configKey: 'security',
        configValue: {
          authenticationRequired: true,
          rateLimiting: {
            enabled: true,
            requestsPerMinute: 30,
            burstLimit: 50,
          },
          apiKeyExpiration: 90,
          ipWhitelist: [],
        },
        description: 'Security settings',
        createdBy: admin.id,
      },
    ],
  });

  // Create RAG models
  const models = await prisma.ragModel.createMany({
    data: [
      {
        modelName: 'Llama 3',
        modelVersion: '70B',
        modelConfig: {
          parameters: {
            temperature: 0.7,
            maxTokens: 2048,
            topP: 0.9,
            frequencyPenalty: 1.0,
            presencePenalty: 1.0,
          },
          ollama: {
            modelId: 'llama3-70b',
          },
        },
        isActive: true,
        createdBy: admin.id,
      },
      {
        modelName: 'Mixtral',
        modelVersion: '8x7B',
        modelConfig: {
          parameters: {
            temperature: 0.8,
            maxTokens: 2048,
            topP: 0.9,
            frequencyPenalty: 1.0,
            presencePenalty: 1.0,
          },
          ollama: {
            modelId: 'mixtral-8x7b',
          },
        },
        isActive: true,
        createdBy: admin.id,
      },
      {
        modelName: 'Phi-3',
        modelVersion: 'Mini',
        modelConfig: {
          parameters: {
            temperature: 0.7,
            maxTokens: 1024,
            topP: 0.9,
            frequencyPenalty: 1.0,
            presencePenalty: 1.0,
          },
          ollama: {
            modelId: 'phi-3-mini',
          },
        },
        isActive: true,
        createdBy: admin.id,
      },
    ],
  });

  // Fetch created models for relations
  const llama = await prisma.ragModel.findFirst({
    where: { modelName: 'Llama 3' },
  });

  // Create embedding configs
  const embedding = await prisma.embeddingsConfig.create({
    data: {
      modelName: 'all-MiniLM-L6-v2',
      vectorDimensions: 384,
      embeddingType: 'sentence-transformers',
      configParams: {
        normalize: true,
        pooling: 'mean',
      },
      createdBy: admin.id,
    },
  });

  // Create document sources
  await prisma.documentSource.createMany({
    data: [
      {
        sourceName: 'Company Knowledge Base',
        sourceType: 'pdf',
        sourceConfig: {
          path: '/data/company_kb',
          recursive: true,
          fileTypes: ['.pdf', '.docx', '.txt'],
        },
        isActive: true,
        createdBy: admin.id,
        embeddingId: embedding.id,
      },
      {
        sourceName: 'Product Documentation',
        sourceType: 'web',
        sourceConfig: {
          urls: ['https://example.com/docs'],
          crawlDepth: 2,
          includePatterns: ['/docs/*'],
          excludePatterns: ['/blog/*'],
        },
        isActive: true,
        createdBy: admin.id,
        embeddingId: embedding.id,
      },
    ],
  });

  // Create Mock Ollama instances
  const instances = await prisma.ollamaInstance.createMany({
    data: [
      {
        instanceName: 'Ollama Instance 1',
        hostAddress: '192.168.1.101',
        port: 11434,
        instanceMetrics: {
          totalMemory: 32,
          totalGPU: 1,
          gpuType: 'NVIDIA RTX 4090',
        },
        isActive: true,
        lastHeartbeat: new Date(),
      },
      {
        instanceName: 'Ollama Instance 2',
        hostAddress: '192.168.1.102',
        port: 11434,
        instanceMetrics: {
          totalMemory: 64,
          totalGPU: 2,
          gpuType: 'NVIDIA RTX 4090',
        },
        isActive: true,
        lastHeartbeat: new Date(),
      },
      {
        instanceName: 'Ollama Instance 3',
        hostAddress: '192.168.1.103',
        port: 11434,
        instanceMetrics: {
          totalMemory: 32,
          totalGPU: 1,
          gpuType: 'NVIDIA RTX 4090',
        },
        isActive: false,
        lastHeartbeat: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
    ],
  });

  // Fetch instances for relations
  const ollamaInstances = await prisma.ollamaInstance.findMany();

  // Create resource usage data
  const now = new Date();
  const resourceUsageData = [];

  for (const instance of ollamaInstances) {
    // Skip inactive instances
    if (!instance.isActive) continue;

    // Generate Mock resource usage data for the past 24 hours (hourly)
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      resourceUsageData.push({
        instanceId: instance.id,
        cpuUsage: Math.floor(Math.random() * 40) + 30, // 30-70%
        memoryUsage: Math.floor(Math.random() * 30) + 40, // 40-70%
        gpuUsage: Math.floor(Math.random() * 50) + 30, // 30-80%
        activeRequests: Math.floor(Math.random() * 5), // 0-5
        collectedAt: timestamp,
      });
    }
  }

  await prisma.resourceUsage.createMany({
    data: resourceUsageData,
  });

  // Create system metrics
  const metricNames = ['query_count', 'avg_response_time', 'error_rate', 'token_usage'];
  const metricTypes = ['counter', 'gauge', 'rate', 'counter'];
  const systemMetricsData = [];

  for (let i = 0; i < metricNames.length; i++) {
    // Generate hourly metrics for the past 24 hours
    for (let j = 0; j < 24; j++) {
      const timestamp = new Date(now.getTime() - j * 60 * 60 * 1000);
      
      let value;
      switch (metricNames[i]) {
        case 'query_count':
          value = Math.floor(Math.random() * 20) + 5; // 5-25
          break;
        case 'avg_response_time':
          value = (Math.random() * 2) + 0.5; // 0.5-2.5 seconds
          break;
        case 'error_rate':
          value = Math.random() * 5; // 0-5%
          break;
        case 'token_usage':
          value = Math.floor(Math.random() * 50000) + 10000; // 10K-60K
          break;
        default:
          value = 0;
      }
      
      systemMetricsData.push({
        metricName: metricNames[i],
        metricType: metricTypes[i],
        metricValue: value,
        dimension: 'system',
        collectedAt: timestamp,
      });
    }
  }

  await prisma.systemMetric.createMany({
    data: systemMetricsData,
  });

  // Create sample queries
  if (llama) {
    const queryTexts = [
      'What is the architecture of the RAG system?',
      'How do I set up Ollama?',
      'Explain the difference between similarity search and MMR',
      'What models are supported?',
      'How can I improve response quality?',
    ];
    
    const queryData = [];
    
    for (const text of queryTexts) {
      // Create multiple queries at different times
      for (let i = 0; i < 3; i++) {
        const timestamp = new Date(now.getTime() - i * 3 * 60 * 60 * 1000); // Every 3 hours
        
        queryData.push({
          queryText: text,
          contextUsed: {
            chunks: [
              { source: 'Company Knowledge Base', score: 0.89, content: 'Sample content...' },
              { source: 'Product Documentation', score: 0.76, content: 'More sample content...' },
            ],
          },
          response: {
            text: 'This is a sample response to the query.',
            tokensUsed: {
              prompt: Math.floor(Math.random() * 500) + 500,
              completion: Math.floor(Math.random() * 300) + 200,
              total: Math.floor(Math.random() * 500) + 700,
            },
          },
          responseTime: (Math.random() * 2) + 0.5,
          userId: i % 2 === 0 ? admin.id : user.id,
          modelId: llama.id,
          createdAt: timestamp,
        });
      }
    }
    
    await prisma.query.createMany({
      data: queryData,
    });
  }

  // Create system logs
  const logLevels = ['info', 'warn', 'error', 'debug'];
  const components = ['API', 'Orchestration', 'Database', 'Cache', 'Ollama'];
  const logMessages = [
    'System started',
    'Query received',
    'Authentication failed',
    'Connection timeout',
    'Response generated successfully',
    'Cache miss',
    'Vector search completed',
    'Model loaded',
  ];
  
  const logData = [];
  
  for (let i = 0; i < 50; i++) {
    const logLevel = logLevels[Math.floor(Math.random() * logLevels.length)];
    const component = components[Math.floor(Math.random() * components.length)];
    const message = logMessages[Math.floor(Math.random() * logMessages.length)];
    const timestamp = new Date(now.getTime() - Math.floor(Math.random() * 24) * 60 * 60 * 1000);
    
    logData.push({
      logLevel,
      component,
      message,
      metadata: {
        ip: '192.168.1.1',
        user: Math.random() > 0.5 ? 'admin' : 'testuser',
        duration: Math.random() * 1000,
      },
      createdAt: timestamp,
    });
  }
  
  await prisma.systemLog.createMany({
    data: logData,
  });

  console.log('Database has been seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });