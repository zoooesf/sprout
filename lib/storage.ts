import { supabase } from './supabase';

const BUCKET = 'photos';

export async function uploadPhoto(
  subjectId: string,
  localUri: string,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  // Local URIs vary by platform (file:// on native, blob:/data: on web) and
  // don't reliably carry a file extension, so derive it from the blob's
  // actual MIME type instead of parsing the URI.
  const contentType = blob.type || 'image/jpeg';
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const path = `${subjectId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
