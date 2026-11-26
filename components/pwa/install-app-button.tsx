'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Props = {
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm'
  // Show only the icon on small screens (used in tight headers).
  compact?: boolean
}

// "Install app" button. It appears only when installing is possible and the app is not already installed:
// - Chrome, Edge, Brave and Android: opens the browser's install prompt.
// - iPhone / iPad Safari: has no install prompt, so it shows the "Add to Home Screen" steps.
export function InstallAppButton({ className, variant = 'outline', size = 'sm', compact = false }: Props) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(true) // hidden until we know
  const [ios, setIos] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

    const onPrompt = (event: Event) => { event.preventDefault(); setPromptEvent(event as InstallPromptEvent) }
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); setShowHelp(false) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || (!promptEvent && !ios)) return null

  async function handleClick() {
    if (!promptEvent) { setShowHelp(true); return }
    await promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null) // the browser only allows one prompt per event
  }

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => void handleClick()}>
        <Download data-icon="inline-start" />
        <span className={compact ? 'hidden sm:inline' : undefined}>Install app</span>
      </Button>
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setShowHelp(false)}>
          <Card className="w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
            <CardHeader><CardTitle>Install ClassPilot</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="flex items-start gap-2"><span className="font-semibold">1.</span><span>Open this page in <strong>Safari</strong>, then tap the <Share className="mx-1 inline size-4 align-text-bottom" /><strong>Share</strong> button.</span></p>
              <p className="flex items-start gap-2"><span className="font-semibold">2.</span><span>Scroll down and tap <strong>Add to Home Screen</strong>.</span></p>
              <p className="flex items-start gap-2"><span className="font-semibold">3.</span><span>Tap <strong>Add</strong>. ClassPilot now opens like an app.</span></p>
              <Button type="button" variant="outline" className="mt-1 w-full" onClick={() => setShowHelp(false)}><X data-icon="inline-start" />Close</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
