import dynamic from 'next/dynamic';
import { lazy } from 'react';

// Lazy load heavy libraries
export const LazyChart = dynamic(
  () => import('recharts').then((mod) => ({
    default: mod.LineChart,
  })),
  { ssr: false, loading: () => <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart...</div> }
);

export const LazyLine = dynamic(
  () => import('recharts').then((mod) => ({
    default: mod.Line,
  })),
  { ssr: false }
);

export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => ({
    default: mod.ResponsiveContainer,
  })),
  { ssr: false }
);

export const LazyXAxis = dynamic(
  () => import('recharts').then((mod) => ({
    default: mod.XAxis,
  })),
  { ssr: false }
);

export const LazyTooltip = dynamic(
  () => import('recharts').then((mod) => ({
    default: mod.Tooltip,
  })),
  { ssr: false }
);

export const LazyCartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({
    default: mod.CartesianGrid,
  })),
  { ssr: false }
);

// Lazy load framer-motion
export const LazyMotion = dynamic(
  () => import('framer-motion').then((mod) => ({
    default: mod.motion.div,
  })),
  { ssr: false }
);

// Lazy load modal components
export const createLazyModal = (importFn) => {
  return dynamic(importFn, {
    ssr: false,
    loading: () => null,
  });
};

