import { ImageIcon } from 'lucide-react';

interface RecipeImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function RecipeImage({ src, alt, className = '' }: RecipeImageProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
      <ImageIcon size={32} className="text-gray-300" />
    </div>
  );
}
