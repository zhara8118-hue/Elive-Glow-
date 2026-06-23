import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, role, branch_id } = await req.json();

    if (!full_name || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Invite the user - they'll receive an email to set their password
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name,
        role,
        branch_id: branch_id || null,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update the auto-created profile with correct data
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name,
        email,
        role,
        branch_id: branch_id || null,
        status: 'invited',
        invited_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, userId: data.user?.id });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
