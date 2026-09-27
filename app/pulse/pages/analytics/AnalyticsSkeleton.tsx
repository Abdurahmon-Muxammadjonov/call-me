/* Analitika skeleti (§6.11): haqiqiy bloklar bilan bir xil joylashuv va
 * radiuslar — navigatsiyada ≤100 ms ichida chiziladi (loading.tsx). */

import { Skeleton } from "../../ui/primitives";

export function AnalyticsSkeleton({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <div className="@container/an flex flex-col gap-5" aria-busy="true" data-testid="AN-SKELETON">
      {withHeader && (
        <div className="flex flex-wrap items-end justify-between gap-6 pt-[10px]">
          <div>
            <Skeleton w={300} h={14} r={7} />
            <Skeleton w={210} h={40} r={10} className="mt-[10px]" />
          </div>
          <div className="flex items-center gap-[10px]">
            <Skeleton w={198} h={46} r={999} />
            <Skeleton w={46} h={46} r={999} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 @min-[560px]/an:grid-cols-2 @min-[1040px]/an:grid-cols-4 @min-[1040px]/an:grid-rows-[172px_172px]">
        <Skeleton h={360} r={26} className="@min-[560px]/an:col-span-2 @min-[1040px]/an:row-span-2 @min-[1040px]/an:h-full!" />
        <Skeleton h={172} r={26} />
        <Skeleton h={172} r={26} />
        <Skeleton h={172} r={26} className="@min-[560px]/an:col-span-2" />
      </div>
      <div className="flex flex-col gap-4 @min-[1040px]/an:flex-row">
        <Skeleton h={372} r={26} className="@min-[1040px]/an:flex-[1.9_1_0]" />
        <Skeleton h={372} r={26} className="@min-[1040px]/an:flex-[1_1_0]" />
      </div>
      <div className="overflow-hidden rounded-[26px] border border-pn-border bg-pn-panel">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <Skeleton w={230} h={22} r={8} />
            <Skeleton w={300} h={12} r={6} className="mt-2" />
          </div>
          <Skeleton w={260} h={42} r={999} />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-[58px] items-center gap-4 border-t border-pn-divider px-6">
            <Skeleton w={16} h={12} />
            <Skeleton w={44} h={32} r={10} />
            <Skeleton w="24%" h={12} />
            <Skeleton w="12%" h={12} />
            <Skeleton w="16%" h={12} />
          </div>
        ))}
      </div>
    </div>
  );
}
