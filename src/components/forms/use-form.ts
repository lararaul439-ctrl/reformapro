"use client";

import { useCallback, useState } from "react";

/** Estado de formulario sencillo: valores, errores por campo y marca de "modificado". */
export function useForm<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      if (!(key as string in e)) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }, []);

  return { values, set, setValues, errors, setErrors, dirty, setDirty };
}
