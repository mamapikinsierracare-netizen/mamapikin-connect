import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.user_metadata?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

  const requiredKeys = ['patient_name', 'facility_id', 'date_of_birth'];
  const isValid = rawData.every(row => requiredKeys.every(key => row.hasOwnProperty(key)));

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid file structure. Missing required columns.' }, { status: 400 });
  }

  return NextResponse.json({ data: rawData, total: rawData.length });
}