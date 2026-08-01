import { useState, useEffect } from 'react';
import { MediaService } from '../services/media';

/**
 * React hook to retrieve an object URL for media from IndexedDB.
 * Automatically handles cleaning up/revoking the URL when unmounted or changed.
 *
 * @param mediaId - The ID of the media record.
 * @param isThumbnail - Whether to retrieve the optimized thumbnail or the original image.
 */
export function useMediaUrl(mediaId?: string, isThumbnail = false): string {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    if (!mediaId) {
      setUrl('');
      return;
    }

    let active = true;
    let createdUrl = '';

    const loadUrl = async () => {
      try {
        const objectUrl = isThumbnail
          ? await MediaService.getThumbnailUrl(mediaId)
          : await MediaService.getMediaUrl(mediaId);

        if (active && objectUrl) {
          createdUrl = objectUrl;
          setUrl(objectUrl);
        }
      } catch (err) {
        console.error('Failed to load media URL for ID:', mediaId, err);
      }
    };

    loadUrl();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [mediaId, isThumbnail]);

  return url;
}
