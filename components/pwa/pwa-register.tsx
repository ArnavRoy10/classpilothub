'use client'

import { useEffect } from 'react'

// Registers the service worker that makes the site installable. Production only, so it never gets in the way of local development.
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => console.error('[pwa] service worker failed to register', error))
  }, [])
  return null
}
