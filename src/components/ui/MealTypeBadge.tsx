import { MEAL_TYPE_COLOURS, MEAL_TYPE_LABELS } from '../../utils/helpers';
import type { MealType } from '../../types';

interface MealTypeBadgeProps {
  type: MealType;
  small?: boolean;
}

export function MealTypeBadge({ type, small = false }: MealTypeBadgeProps) {
  const colourClass = MEAL_TYPE_COLOURS[type] ?? 'bg-gray-100 text-gray-700';
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colourClass} ${
        small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {MEAL_TYPE_LABELS[type] ?? type}
    </span>
  );
}
