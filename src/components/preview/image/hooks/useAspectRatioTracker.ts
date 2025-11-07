import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Ref, RefObject } from 'react';

const DEFAULT_ASPECT_RATIO = 16 / 9;
const MAX_RATIO_HISTORY = 6;
const ROUND_RATIO_PRECISION = 2;

const getBucketKey = (value: number): number => Number(value.toFixed(ROUND_RATIO_PRECISION));

interface UseAspectRatioTrackerParams {
  initialAspectRatio?: number | null;
  onAspectRatioChange?: (ratio: number) => void;
  imageUrl: string;
  imgRef?: Ref<HTMLImageElement | null>;
  onLoad: () => void;
}

interface UseAspectRatioTrackerResult {
  dominantAspectRatio: number;
  processAspectRatioFromImage: (img: HTMLImageElement | null) => void;
  handleImageRef: (img: HTMLImageElement | null) => void;
}

export const useAspectRatioTracker = ({
  initialAspectRatio,
  onAspectRatioChange,
  imageUrl,
  imgRef,
  onLoad,
}: UseAspectRatioTrackerParams): UseAspectRatioTrackerResult => {
  const resolvedInitialAspectRatio = useMemo(() => {
    if (typeof initialAspectRatio === 'number' && Number.isFinite(initialAspectRatio) && initialAspectRatio > 0) {
      return initialAspectRatio;
    }
    return DEFAULT_ASPECT_RATIO;
  }, [initialAspectRatio]);

  const ratioSamplesRef = useRef<number[]>([resolvedInitialAspectRatio]);
  const ratioBucketsRef = useRef<Map<number, number>>(new Map([[getBucketKey(resolvedInitialAspectRatio), 1]]));
  const lastProcessedImageRef = useRef<string | null>(null);
  const previousNotifiedRatioRef = useRef<number>(resolvedInitialAspectRatio);
  const internalImgRef = useRef<HTMLImageElement | null>(null);
  const [dominantAspectRatio, setDominantAspectRatio] = useState<number>(resolvedInitialAspectRatio);

  const addAspectRatioSample = useCallback((ratio: number): void => {
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return;
    }

    const normalized = Number(ratio.toFixed(4));
    const bucketKey = getBucketKey(normalized);

    const samples = [...ratioSamplesRef.current, normalized];
    if (samples.length > MAX_RATIO_HISTORY) {
      const removed = samples.shift();
      if (removed !== undefined) {
        const removedKey = getBucketKey(removed);
        const currentCount = ratioBucketsRef.current.get(removedKey);
        if (currentCount !== undefined) {
          if (currentCount <= 1) {
            ratioBucketsRef.current.delete(removedKey);
          } else {
            ratioBucketsRef.current.set(removedKey, currentCount - 1);
          }
        }
      }
    }
    ratioSamplesRef.current = samples;

    const existingCount = ratioBucketsRef.current.get(bucketKey) ?? 0;
    ratioBucketsRef.current.set(bucketKey, existingCount + 1);

    let dominantBucket = bucketKey;
    let dominantCount = ratioBucketsRef.current.get(bucketKey) ?? 1;

    ratioBucketsRef.current.forEach((count, key) => {
      if (count > dominantCount) {
        dominantBucket = key;
        dominantCount = count;
      } else if (count === dominantCount && Math.abs(key - bucketKey) < Math.abs(dominantBucket - bucketKey)) {
        dominantBucket = key;
        dominantCount = count;
      }
    });

    const dominantSamples = ratioSamplesRef.current.filter(sample => getBucketKey(sample) === dominantBucket);
    const averageDominantRatio = dominantSamples.reduce((sum, sample) => sum + sample, 0) /
      (dominantSamples.length > 0 ? dominantSamples.length : 1);

    if (Number.isFinite(averageDominantRatio) && averageDominantRatio > 0) {
      setDominantAspectRatio(prev => (Math.abs(prev - averageDominantRatio) < 0.0001 ? prev : averageDominantRatio));
    }
  }, []);

  const processAspectRatioFromImage = useCallback((img: HTMLImageElement | null): void => {
    if (img === null) {
      return;
    }

    const src = img.currentSrc !== '' ? img.currentSrc : img.src;
    if (typeof src !== 'string' || src === '') {
      return;
    }

    if (lastProcessedImageRef.current === src && img.dataset['rvAspectProcessed'] === 'true') {
      return;
    }

    if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      return;
    }

    const ratio = img.naturalWidth / img.naturalHeight;
    addAspectRatioSample(ratio);
    lastProcessedImageRef.current = src;
    img.dataset['rvAspectProcessed'] = 'true';
  }, [addAspectRatioSample]);

  useEffect(() => {
    lastProcessedImageRef.current = null;
    const currentImage = internalImgRef.current;
    if (currentImage !== null) {
      delete currentImage.dataset['rvAspectProcessed'];
    }
  }, [imageUrl]);

  useEffect(() => {
    if (typeof onAspectRatioChange === 'function' &&
      Math.abs(previousNotifiedRatioRef.current - dominantAspectRatio) >= 0.0001) {
      previousNotifiedRatioRef.current = dominantAspectRatio;
      onAspectRatioChange(dominantAspectRatio);
    }
  }, [dominantAspectRatio, onAspectRatioChange]);

  const handleImageRef = useCallback((img: HTMLImageElement | null): void => {
    if (typeof imgRef === 'object' && imgRef !== null && 'current' in imgRef) {
      (imgRef as RefObject<HTMLImageElement | null> & { current: HTMLImageElement | null }).current = img;
    }

    internalImgRef.current = img;

    if (img !== null) {
      delete img.dataset['rvAspectProcessed'];
    }

    if (img !== null && img.complete && img.naturalHeight !== 0) {
      processAspectRatioFromImage(img);
      onLoad();
    }
  }, [imgRef, onLoad, processAspectRatioFromImage]);

  return {
    dominantAspectRatio,
    processAspectRatioFromImage,
    handleImageRef,
  };
};

export { DEFAULT_ASPECT_RATIO };

