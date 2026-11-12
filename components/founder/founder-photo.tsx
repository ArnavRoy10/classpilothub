'use client'

import Image from 'next/image'
import { useState } from 'react'
import { FOUNDER, initialsOf } from '@/lib/founder-profile'
import { cn } from '@/lib/utils'

export function FounderPhoto({ size = 64, shape = 'circle', className, name = FOUNDER.name }: { size?: number; shape?: 'circle' | 'rounded'; className?: string; name?: string }) {
  const [failed, setFailed] = useState(false)
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-3xl'

  if (failed) {
    return (
      <div
        role="img"
        aria-label={name}
        className={cn('grid shrink-0 place-items-center bg-primary/20 font-display font-semibold text-primary', radius, className)}
        style={{ width: size, height: size, fontSize: size / 3 }}
      >
        {initialsOf(name)}
      </div>
    )
  }

  return (
    <Image
      src={FOUNDER.photo}
      alt={`Photo of ${name}`}
      width={size * 2}
      height={size * 2}
      onError={() => setFailed(true)}
      className={cn('shrink-0 object-cover ring-2 ring-white/15', radius, className)}
      style={{ width: size, height: size }}
    />
  )
}
