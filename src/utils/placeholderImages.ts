import placeholder1 from '../assets/placeholders/placeholder-1.jpg';
import placeholder2 from '../assets/placeholders/placeholder-2.jpg';
import placeholder3 from '../assets/placeholders/placeholder-3.jpg';
import placeholder4 from '../assets/placeholders/placeholder-4.jpg';
import placeholder5 from '../assets/placeholders/placeholder-5.jpg';

const PLACEHOLDER_IMAGES = [placeholder1, placeholder2, placeholder3, placeholder4, placeholder5];

/**
 * Returns a deterministic placeholder image path based on a seed string
 * (e.g. content identifier), so the same item always shows the same image.
 */
export const getPlaceholderImage = (seed: string): string => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0; // Convert to 32-bit integer
    }
    return PLACEHOLDER_IMAGES[Math.abs(hash) % PLACEHOLDER_IMAGES.length];
};
