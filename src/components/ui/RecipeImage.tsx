import type { MealType } from '../../types';

interface RecipeImageProps {
  src?: string;
  alt: string;
  title?: string;
  mealTypes?: MealType[];
  className?: string;
}

// Tailwind-safe gradient classes. Keep the full class strings so JIT picks them up.
const GRADIENTS = [
  'from-amber-200 via-orange-200 to-rose-300',
  'from-emerald-200 via-teal-200 to-cyan-300',
  'from-rose-200 via-pink-200 to-fuchsia-300',
  'from-sky-200 via-indigo-200 to-violet-300',
  'from-lime-200 via-green-200 to-emerald-300',
  'from-yellow-200 via-amber-200 to-orange-300',
  'from-pink-200 via-rose-200 to-orange-300',
  'from-violet-200 via-purple-200 to-pink-300',
];

const EMOJI_RULES: Array<[RegExp, string]> = [
  [/pasta|spaghetti|noodle|bolognese|lasagne|lasagna|carbonara|ragu|linguine|fettuccine|penne/i, '🍝'],
  [/ramen/i, '🍜'],
  [/pizza/i, '🍕'],
  [/burger/i, '🍔'],
  [/taco/i, '🌮'],
  [/burrito|quesadilla|enchilada/i, '🌯'],
  [/sushi|sashimi|maki/i, '🍣'],
  [/soup|broth|chowder|bisque/i, '🍲'],
  [/salad|slaw/i, '🥗'],
  [/sandwich|wrap|panini|sub|bagel/i, '🥪'],
  [/curry|tikka|masala|biryani|dal|dhal|korma|vindaloo/i, '🍛'],
  [/stir.?fry/i, '🥢'],
  [/risotto|paella|jambalaya|rice/i, '🍚'],
  [/oat|porridge|granola|muesli/i, '🥣'],
  [/pancake|waffle|crepe|crêpe|french toast/i, '🥞'],
  [/omelette|frittata|shakshuka|scrambled|egg/i, '🍳'],
  [/bread|toast|loaf|focaccia|sourdough/i, '🍞'],
  [/croissant|pastry|brioche/i, '🥐'],
  [/salmon|tuna|cod|hake|bass|trout|haddock|mackerel|fish/i, '🐟'],
  [/prawn|shrimp|lobster|crab/i, '🦐'],
  [/chicken|turkey|roast/i, '🍗'],
  [/beef|steak|mince|brisket/i, '🥩'],
  [/pork|bacon|sausage|ham/i, '🥓'],
  [/cake|brownie|cookie|biscuit|muffin|pie|tart|dessert/i, '🍰'],
  [/smoothie|shake|juice/i, '🥤'],
  [/banana/i, '🍌'],
  [/apple/i, '🍎'],
  [/berry|berries|strawberr|raspberr|blueberr/i, '🍓'],
  [/mango/i, '🥭'],
  [/avocado|guac/i, '🥑'],
  [/tomato/i, '🍅'],
  [/cheese/i, '🧀'],
  [/potato|chip|fries|wedge|mash/i, '🥔'],
  [/broccoli|kale|spinach|greens/i, '🥦'],
  [/carrot/i, '🥕'],
  [/dumpling|gyoza|bao/i, '🥟'],
  [/curry|stew|casserole|tagine/i, '🍲'],
];

const MEAL_TYPE_EMOJI: Record<MealType, string> = {
  breakfast: '🥐',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🥨',
  baby: '🍼',
};

function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickEmoji(title?: string, mealTypes?: MealType[]): string {
  const haystack = title ?? '';
  for (const [pattern, emoji] of EMOJI_RULES) {
    if (pattern.test(haystack)) return emoji;
  }
  if (mealTypes && mealTypes.length > 0) {
    return MEAL_TYPE_EMOJI[mealTypes[0]];
  }
  return '🍽️';
}

function pickGradient(title?: string): string {
  const seed = title ?? 'recipe';
  return GRADIENTS[hash(seed) % GRADIENTS.length];
}

export function RecipeImage({ src, alt, title, mealTypes, className = '' }: RecipeImageProps) {
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
  const gradient = pickGradient(title);
  const emoji = pickEmoji(title, mealTypes);
  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* Soft radial highlight for a bit of depth */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 55%)',
        }}
      />
      <span
        aria-hidden
        className="relative text-6xl sm:text-7xl drop-shadow-sm select-none leading-none"
        style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }}
      >
        {emoji}
      </span>
    </div>
  );
}
