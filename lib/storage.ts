import { supabase } from './supabase';

const BUCKET = 'photos';

export async function uploadPhoto(
  subjectId: string,
  localUri: string,
): Promise<string> {
  const cleanUri = localUri.split('?')[0];
  const ext = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${subjectId}/${Date.now()}.${ext}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
