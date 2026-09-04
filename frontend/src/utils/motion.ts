/** Timings and variants shared across overlays, menus, and page fades. Keep subtle. */

export const easeOutSoft = [0.22, 1, 0.36, 1] as const

export const duration = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.28,
} as const

export const fadeTransition = {
  duration: duration.normal,
  ease: easeOutSoft,
}

export const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.fast },
}

export const panelMotion = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.98 },
  transition: fadeTransition,
}

export const popoverMotion = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -2, scale: 0.98 },
  transition: { duration: duration.fast, ease: easeOutSoft },
}

export const toastMotion = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.98 },
  transition: fadeTransition,
}

export const pageMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: fadeTransition,
}

export const collapseMotion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: duration.normal, ease: easeOutSoft },
}

export const fadeInMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: fadeTransition,
}
