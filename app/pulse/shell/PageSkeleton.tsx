/* Umumiy sahifa skeleti — hali Pulse'ga ko'chirilmagan bo'limlarning
 * loading.tsx'i va sessiya tekshiruvi paytida. Ko'chirilgan sahifalar
 * o'zining aniq skeletini oladi (§6.11). Server komponent — JS'siz ham
 * birinchi bo'yashda ko'rinadi. */

import { Skeleton } from "../ui/primitives";

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-5" data-testid="PAGE-SKELETON">
      <div className="flex items-end justify-between gap-6 pt-[10px]">
        <div>
          <Skeleton w={240} h={12} r={6} />
          <Skeleton w={300} h={40} r={10} className="mt-[10px]" />
        </div>
        <div className="flex gap-[10px] max-md:hidden">
          <Skeleton w={200} h={46} r={999} />
          <Skeleton w={46} h={46} r={999} />
        </div>
      </div>
      <div className="grid grid-cols-4 grid-rows-[172px_172px] gap-4 max-lg:grid-cols-2 max-lg:grid-rows-none">
        <Skeleton h="100%" r={26} className="col-span-2 row-span-2 max-lg:row-span-1 max-lg:h-[172px]!" />
        <Skeleton h={172} r={26} />
        <Skeleton h={172} r={26} />
        <Skeleton h={172} r={26} className="col-span-2" />
      </div>
      <div className="flex gap-4 max-lg:flex-col">
        <Skeleton h={372} r={26} className="flex-[1.9]" />
        <Skeleton h={372} r={26} className="flex-1" />
      </div>
    </div>
  );
}
