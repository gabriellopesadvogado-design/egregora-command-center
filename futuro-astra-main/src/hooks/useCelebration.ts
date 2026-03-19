import { useCallback } from "react";
import confetti from "canvas-confetti";

export function useCelebration() {
  // Small confetti burst - for meetings that happened
  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#22c55e", "#3b82f6", "#f59e0b"],
    });
  }, []);

  // Fireworks - for won deals
  const triggerFireworks = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#22c55e", "#10b981", "#059669"],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#f59e0b", "#fbbf24", "#fcd34d"],
      });
    }, 250);
  }, []);

  // Massive celebration - for goal completion
  const triggerGoalCelebration = useCallback(() => {
    const duration = 5000;
    const animationEnd = Date.now() + duration;
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

    // Initial burst
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 },
      colors,
    });

    // Continuous confetti rain
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      // Left side
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });

      // Right side
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      // Center burst
      if (Math.random() > 0.7) {
        confetti({
          particleCount: 20,
          spread: 70,
          origin: { x: Math.random(), y: Math.random() * 0.4 },
          colors,
        });
      }
    }, 100);

    // Final big burst
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 180,
        origin: { y: 0.5 },
        colors,
        startVelocity: 45,
      });
    }, duration - 500);
  }, []);

  return {
    triggerConfetti,
    triggerFireworks,
    triggerGoalCelebration,
  };
}
