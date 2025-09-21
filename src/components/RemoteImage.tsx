import { Image } from 'react-native';
import React, { ComponentProps, useEffect, useState, memo } from 'react';
import { supabase } from '../lib/supabase';

type RemoteImageProps = {
  path?: string | null;
  fallback: string;
} & Omit<ComponentProps<typeof Image>, 'source'>;

const RemoteImage = memo(({ path, fallback, ...imageProps }: RemoteImageProps) => {
  const [image, setImage] = useState('');

  useEffect(() => {
    if (!path) return;

    // If the path is already a full URL, use it directly
    if (path.startsWith('http')) {
      setImage(path);
      return;
    }

    // Otherwise, try to download from storage
    (async () => {
      setImage('');
      const { data, error } = await supabase.storage
        .from('app-images')
        .download(path);

     

      if (data) {
        const fr = new FileReader();
        fr.readAsDataURL(data);
        fr.onload = () => {
          setImage(fr.result as string);
        };
      }
    })();
  }, [path]);

  return <Image source={{ uri: image || fallback }} {...imageProps} />;
});

export default RemoteImage; 