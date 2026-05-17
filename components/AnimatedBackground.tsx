'use client';

export default function AnimatedBackground() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${(i * 17 + 7) % 100}%`,
    top: `${(i * 23 + 11) % 100}%`,
    size: 2 + (i % 4),
    delay: `${(i % 8) * 0.7}s`,
    duration: `${12 + (i % 6) * 2}s`,
  }));

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 animated-grid opacity-40" />
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle absolute rounded-full bg-gradient-to-br from-purple-500/40 to-gray-300/40"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}
