jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: jest.fn() } },
}));

import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { pickDrillPhoto, uploadDrillPhoto } from '../drillPhotos';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('pickDrillPhoto', () => {
  it('returns null when camera permission is denied', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    const result = await pickDrillPhoto('camera');

    expect(result).toBeNull();
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('returns null when the user cancels the camera', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });

    const result = await pickDrillPhoto('camera');

    expect(result).toBeNull();
  });

  it('returns the picked asset uri from the camera', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///photo.jpg' }],
    });

    const result = await pickDrillPhoto('camera');

    expect(result).toBe('file:///photo.jpg');
  });

  it('uses the media library picker for the "library" source', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///library.jpg' }],
    });

    const result = await pickDrillPhoto('library');

    expect(result).toBe('file:///library.jpg');
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });
});

describe('uploadDrillPhoto', () => {
  it('uploads the photo and returns its public url', async () => {
    const fakeArrayBuffer = new ArrayBuffer(4);
    global.fetch = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(fakeArrayBuffer) }) as any;
    const upload = jest.fn().mockResolvedValue({ error: null });
    const getPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } });
    (supabase.storage.from as jest.Mock).mockReturnValue({ upload, getPublicUrl });

    const url = await uploadDrillPhoto('user-1', 'file:///photo.jpg');

    expect(url).toBe('https://example.com/photo.jpg');
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^user-1\//), fakeArrayBuffer, {
      contentType: 'image/jpeg',
    });
  });

  it('throws when the upload fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) as any;
    const upload = jest.fn().mockResolvedValue({ error: { message: 'storage full' } });
    (supabase.storage.from as jest.Mock).mockReturnValue({ upload, getPublicUrl: jest.fn() });

    await expect(uploadDrillPhoto('user-1', 'file:///photo.jpg')).rejects.toEqual({ message: 'storage full' });
  });
});
