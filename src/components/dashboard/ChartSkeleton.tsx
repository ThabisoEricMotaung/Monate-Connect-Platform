export default function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="w-full animate-pulse bg-slate-100 rounded-lg" style={{ height: `${height}px` }}>
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading chart...</div>
      </div>
    </div>
  )
}
