import { Leaf } from 'lucide-react';

interface HealthyBadgeProps {
  small?: boolean;
}

/**
 * "Nutritionist approved" marker shown on recipes tagged `healthy`.
 * Rendered alongside the meal-type badges on cards and the detail view.
 */
export function HealthyBadge({ small = false }: HealthyBadgeProps) {
  return (
    <span
      title="Nutritionist approved"
      className={`inline-flex items-center gap-1 rounded-full font-medium bg-emerald-100 text-emerald-700 ${
        small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Leaf size={small ? 11 : 12} aria-hidden />
      Healthy
    </span>
  );
}
