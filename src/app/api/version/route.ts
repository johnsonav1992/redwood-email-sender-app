import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse<{ buildId: string }>> {
  return NextResponse.json(
    {
      buildId: process.env.NEXT_PUBLIC_APP_BUILD_ID || 'development'
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    }
  );
}
