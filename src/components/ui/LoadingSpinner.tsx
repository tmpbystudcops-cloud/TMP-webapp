import type { FC } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-slate-600 border-t-amber-500 ${sizeClasses[size]} ${className}`} />
  );
};

interface LoadingSkeletonProps {
  className?: string;
}

export const LoadingSkeleton: FC<LoadingSkeletonProps> = ({
  className = ''
}) => (
  <div className={`animate-pulse bg-slate-700 rounded h-4 ${className}`} />
);

export const ProductCardSkeleton: FC = () => (
  <div className="bg-slate-800 rounded-lg p-4 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex-1">
        <LoadingSkeleton className="w-3/4 mb-2" />
        <LoadingSkeleton className="w-1/2" />
      </div>
      <div className="flex items-center gap-2">
        <LoadingSkeleton className="w-8" />
        <LoadingSkeleton className="w-8 h-6" />
        <LoadingSkeleton className="w-8" />
      </div>
    </div>
  </div>
);

export const OrderCardSkeleton: FC = () => (
  <div className="bg-slate-800 rounded-lg p-6 animate-pulse">
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
      <div className="flex-1">
        <LoadingSkeleton className="w-1/3 mb-2" />
        <LoadingSkeleton className="w-1/2 mb-1" />
        <LoadingSkeleton className="w-1/4" />
      </div>
      <div className="flex items-center gap-4 mt-4 md:mt-0">
        <LoadingSkeleton className="w-16 h-6" />
        <LoadingSkeleton className="w-20" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <LoadingSkeleton className="w-1/3 mb-1" />
        <LoadingSkeleton className="w-2/3" />
      </div>
      <div>
        <LoadingSkeleton className="w-1/4 mb-1" />
        <LoadingSkeleton className="w-1/2" />
      </div>
    </div>

    <div>
      <LoadingSkeleton className="w-1/6 mb-2" />
      <div className="space-y-1">
        <LoadingSkeleton className="w-full h-8" />
        <LoadingSkeleton className="w-full h-8" />
      </div>
    </div>
  </div>
);

export const TableRowSkeleton: FC = () => (
  <tr>
    <td className="px-6 py-4">
      <LoadingSkeleton className="w-3/4" />
    </td>
    <td className="px-6 py-4">
      <LoadingSkeleton className="w-1/2" />
    </td>
    <td className="px-6 py-4">
      <LoadingSkeleton className="w-1/3" />
    </td>
    <td className="px-6 py-4">
      <LoadingSkeleton className="w-20" />
    </td>
    <td className="px-6 py-4">
      <div className="flex gap-2">
        <LoadingSkeleton className="w-4 h-4" />
        <LoadingSkeleton className="w-4 h-4" />
      </div>
    </td>
  </tr>
);