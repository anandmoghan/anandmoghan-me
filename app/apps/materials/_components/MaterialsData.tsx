'use client';

// Loads materials from Cloud Storage with the signed-in user's auth (storage.rules: admins and
// the materials app only). The index is loaded once per visit to /apps/materials (the layout
// keeps this provider mounted across routes); chapter HTML is loaded per route.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getBytes, ref } from 'firebase/storage';
import { getFirebaseStorage } from '@/common/firebase/client';
import type { MaterialsIndex } from '@/common/types/materials';
import { MATERIALS_INDEX_OBJECT } from '@/common/utils/materials-paths';

type Load<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

async function readText(objectPath: string): Promise<string> {
  const bytes = await getBytes(ref(getFirebaseStorage(), objectPath));
  return new TextDecoder().decode(bytes);
}

const IndexContext = createContext<Load<MaterialsIndex> | undefined>(undefined);

export function MaterialsIndexProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<Load<MaterialsIndex>>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    readText(MATERIALS_INDEX_OBJECT)
      .then((text) => {
        if (live) setIndex({ status: 'ready', data: JSON.parse(text) as MaterialsIndex });
      })
      .catch((err) => {
        console.error('Loading the materials index failed', err);
        if (live) setIndex({ status: 'error' });
      });
    return () => {
      live = false;
    };
  }, []);

  return <IndexContext.Provider value={index}>{children}</IndexContext.Provider>;
}

export function useMaterialsIndex(): Load<MaterialsIndex> {
  const index = useContext(IndexContext);
  if (index === undefined) throw new Error('useMaterialsIndex must be used within MaterialsIndexProvider');
  return index;
}

/** One article (chapter or /all) as an HTML string from Storage. */
export function useMaterialsHtml(objectPath: string | null): Load<string> {
  const [state, setState] = useState<{ path: string | null; load: Load<string> }>({
    path: null,
    load: { status: 'loading' },
  });

  useEffect(() => {
    if (!objectPath) return;
    let live = true;
    readText(objectPath)
      .then((html) => {
        if (live) setState({ path: objectPath, load: { status: 'ready', data: html } });
      })
      .catch((err) => {
        console.error('Loading materials failed', err);
        if (live) setState({ path: objectPath, load: { status: 'error' } });
      });
    return () => {
      live = false;
    };
  }, [objectPath]);

  // A result for an earlier route counts as loading for this one.
  return state.path === objectPath ? state.load : { status: 'loading' };
}
