"use client";

/**
 * Nested navigation that drives Telegram's NATIVE back button instead of any
 * in-app back UI. Each screen registers a "go back" handler; the top of the
 * stack is what the native back button invokes. Works nested (a view and its
 * sub-views each push their own entry).
 */
import { createContext, useContext, useEffect, useRef } from "react";

export interface Nav {
  /** Register a back handler; returns an unregister fn. */
  push: (handler: () => void) => () => void;
}

export const NavContext = createContext<Nav>({ push: () => () => {} });

/**
 * Register `handler` as the active back action while `active` is true. The
 * handler may change between renders without re-registering (kept in a ref).
 */
export function useBackEntry(active: boolean, handler: () => void): void {
  const nav = useContext(NavContext);
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    return nav.push(() => ref.current());
  }, [active, nav]);
}
