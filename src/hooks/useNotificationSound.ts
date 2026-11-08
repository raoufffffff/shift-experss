import { useEffect, useRef } from 'react'
import { logger } from '@/utils/logger'

/**
 * Hook pour jouer un son de notification quand une nouvelle candidature arrive
 * Le son est un simple beep généré via Web Audio API
 */
export function useNotificationSound(count: number, enabled: boolean = true) {
  const previousCount = useRef(count)

  useEffect(() => {
    // Si le compteur augmente et que les notifications sont activées
    if (enabled && count > previousCount.current && previousCount.current !== undefined) {
      playNotificationSound()
    }
    previousCount.current = count
  }, [count, enabled])
}

/**
 * Joue un son de notification simple
 */
function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioContext = new AudioContextClass()

    // Créer un oscillateur pour générer un ton
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Configuration du son (ton agréable)
    oscillator.frequency.value = 800 // Fréquence en Hz
    oscillator.type = 'sine' // Type de forme d'onde

    // Volume (commence à 0.3 et diminue progressivement)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    // Jouer le son pendant 300ms
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    logger.error('Error playing notification sound:', error)
  }
}
