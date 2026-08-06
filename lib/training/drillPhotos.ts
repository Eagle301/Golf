import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { generateLocalId } from '@/lib/offline/localId';

export type PhotoSource = 'camera' | 'library';

/** Launches the camera or library picker and returns the picked image's local URI, or null if the user cancelled or denied permission. */
export async function pickDrillPhoto(source: PhotoSource): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) return null;

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });

  if (result.canceled || result.assets.length === 0) return null;

  return result.assets[0].uri;
}

/** Uploads a locally-picked photo to the drill-photos bucket and returns its public URL. */
export async function uploadDrillPhoto(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const path = `${userId}/${generateLocalId()}.jpg`;

  const { error } = await supabase.storage
    .from('drill-photos')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('drill-photos').getPublicUrl(path);
  return data.publicUrl;
}
