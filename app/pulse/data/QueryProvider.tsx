"use client";

/* TanStack Query — yagona klient keshi (spetsifikatsiya §3.2).
 *
 * IndexedDB'ga saqlash: faqat `meta.persist === true` so'rovlar (sahifa
 * so'rovlari, /me, /dictionaries). /calls ro'yxatlari, qo'ng'iroq
 * tafsilotlari va transkriptlar HECH QACHON saqlanmaydi. throttle 5 s,
 * maxAge 12 soat, buster = build id, kalit foydalanuvchi + kompaniya
 * bo'yicha. Chiqishda va kompaniya almashganda tozalanadi. */

import { useState, type ReactNode } from "react";
import { QueryCache, QueryClient, MutationCache } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistedClient } from "@tanstack/query-persist-client-core";
import { get, set, del, keys, delMany } from "idb-keyval";
import { ApiError } from "./api";
import { clearSession, loadSession } from "../../lib/auth";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
const PERSIST_PREFIX = "sp-rq:";
const MAX_AGE = 12 * 60 * 60 * 1000;

function onAuthLost() {
  clearSession();
  void clearPersistedCaches();
  if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
    location.replace("/login");
  }
}

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError;
}

function makeClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (err) => {
        if (err instanceof ApiError && err.status === 401) onAuthLost();
      },
    }),
    mutationCache: new MutationCache({
      onError: (err) => {
        if (err instanceof ApiError && err.status === 401) onAuthLost();
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        // Saqlangan kesh tiklangach darhol o'chib ketmasin (maxAge dan katta).
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: true,
        // Faqat tarmoq xatosida bitta qayta urinish (apiFetch ichida ham bor).
        retry: (count, err) => count < 1 && isNetworkError(err),
      },
      mutations: { retry: false },
    },
  });
}

/* Kalit foydalanuvchi bo'yicha. Kompaniya bo'yicha ajratish so'rov
 * kalitlarida (['v2', companyId, …]) va kompaniya almashganda butun kesh
 * tozalanadi — kalitga kompaniyani qo'shsak, birinchi yuklashda u hali
 * noma'lum bo'lib, kesh keyingi safar topilmay qolardi. */
function persistKey(): string {
  const s = loadSession();
  return `${PERSIST_PREFIX}${s?.employeeId ?? s?.email ?? "anon"}`;
}

/* Chiqish / kompaniya almashtirish: IndexedDB'dagi hamma sp-rq:* yozuvlari. */
export async function clearPersistedCaches(): Promise<void> {
  try {
    const all = await keys();
    const mine = all.filter((k) => typeof k === "string" && k.startsWith(PERSIST_PREFIX));
    if (mine.length) await delMany(mine);
  } catch {
    /* IndexedDB yopiq (maxfiy oyna) — saqlanmagan ham edi */
  }
}

function makePersister() {
  const server = typeof window === "undefined";
  return createAsyncStoragePersister({
    // Serverda (prerender) localStorage/IndexedDB yo'q — saqlovchi o'chiq.
    key: server ? `${PERSIST_PREFIX}ssr` : persistKey(),
    throttleTime: 5000,
    storage: server
      ? undefined
      : {
            getItem: async (k: string) => ((await get(k)) as string | undefined) ?? null,
            setItem: (k: string, v: string) => set(k, v),
            removeItem: (k: string) => del(k),
          },
    // IndexedDB obyektni o'zi (structured clone) saqlaydi — JSON.stringify
    // bilan asosiy oqimni band qilmaymiz.
    serialize: (c: PersistedClient) => c as unknown as string,
    deserialize: (c: string) => c as unknown as PersistedClient,
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  const [persister] = useState(makePersister);
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: MAX_AGE,
        buster: BUILD_ID,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === "success" && q.meta?.persist === true,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
