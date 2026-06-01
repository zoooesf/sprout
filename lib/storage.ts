import { supabase } from './supabase';

const BUCKET = 'photos';

export async function uploadPhoto(
  subjectId: string,
  localUri: string,
  base64: string,
): Promise<string> {
  const cleanUri = localUri.split('?')[0];
  const ext = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${subjectId}/${Date.now()}.${ext}`;

  // Decode base64 string into bytes for upload
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
