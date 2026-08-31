/**
 * Thuso Animation & Transition Utilities
 * Micro-interactions and polish for Command & AI Workspace
 */

export const animationClasses = {
  // Fade animations
  fadeIn: "animate-fade-in",
  fadeOut: "animate-fade-out",
  fadeInUp: "animate-fade-in-up",
  fadeInDown: "animate-fade-in-down",

  // Scale animations
  scaleIn: "animate-scale-in",
  scaleUp: "animate-scale-up",

  // Slide animations
  slideInLeft: "animate-slide-in-left",
  slideInRight: "animate-slide-in-right",
  slideInUp: "animate-slide-in-up",

  // Pulse & bounce
  pulse: "animate-pulse",
  bounce: "animate-bounce",
  spin: "animate-spin",

  // Status indicators
  statusPulse: "animate-status-pulse",
  statusGlow: "animate-status-glow",
}

export const transitionDurations = {
  fast: 150,
  base: 300,
  slow: 500,
  slower: 700,
}

export const easing = {
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  easeInCubic: "cubic-bezier(0.32, 0, 0.67, 0)",
  easeOutCubic: "cubic-bezier(0.33, 1, 0.68, 1)",
  easeInExpo: "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
  easeOutExpo: "cubic-bezier(0.19, 1, 0.22, 1)",
}

/**
 * Smooth scroll to element
 */
export function smoothScroll(element: HTMLElement) {
  element.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  })
}

/**
 * Stagger animation helper
 */
export function getStaggerDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay
}

/**
 * Keyboard animation shorthand
 */
export function createKeyframe(name: string, frames: Record<string, string>): string {
  const keyframeStr = Object.entries(frames)
    .map(([key, value]) => `${key} { ${value} }`)
    .join(" ")
  return `@keyframes ${name} { ${keyframeStr} }`
}

/**
 * Loading state animation variants
 */
export const loadingVariants = {
  skeleton: "bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse",
  spinner: "border-4 border-gray-200 border-t-primary animate-spin",
  dots: "flex gap-1",
}

/**
 * Generate random delay for staggered effects
 */
export function getRandomDelay(min: number = 0, max: number = 300): number {
  return Math.random() * (max - min) + min
}

/**
 * Debounce animation frame
 */
export function debounceAnimationFrame(callback: () => void, delay: number = 300) {
  let timeoutId: NodeJS.Timeout | null = null

  return () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(callback, delay)
  }
}

/**
 * CSS transition builder
 */
export function buildTransition(
  properties: string[],
  duration: number = 300,
  timingFunction: string = "ease-in-out",
  delay: number = 0
): string {
  return properties
    .map((prop) => `${prop} ${duration}ms ${timingFunction} ${delay}ms`)
    .join(", ")
}
