import { NextResponse } from 'next/server';
import { orchestrationService } from '@/services/orchestration';

export async function GET() {
  try {
    const models = await orchestrationService.getModels();
    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models', models: [] },
      { status: 500 }
    );
  }
}