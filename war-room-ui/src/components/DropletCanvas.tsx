import React, { useEffect, useRef } from 'react';
import { DropletStats } from '../types';

interface DropletCanvasProps {
  packetLossPct: number;
  dropletStats: DropletStats | null;
}

export const DropletCanvas: React.FC<DropletCanvasProps> = ({ packetLossPct, dropletStats }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lossRef = useRef(packetLossPct);

  useEffect(() => {
    lossRef.current = packetLossPct;
  }, [packetLossPct]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const droplets = Array.from({ length: 18 }, () => ({
      x: Math.random() * 320,
      y: 12 + Math.random() * 24,
      vx: 1.4 + Math.random() * 1.1,
      lost: false,
      sparkLife: 0,
    }));

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const w = canvas.clientWidth || 300;
      const h = canvas.clientHeight || 48;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);

      // Subtle guide rail
      ctx.strokeStyle = 'rgba(212,208,202,0.5)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(12, h / 2);
      ctx.lineTo(w - 12, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      droplets.forEach((p) => {
        if (p.sparkLife > 0) {
          p.sparkLife -= 0.04;
          for (let k = 0; k < 4; k++) {
            const ang = (k / 4) * Math.PI * 2 + p.sparkLife * 5;
            const r = (1 - p.sparkLife) * 10;
            ctx.fillStyle = `rgba(200, 144, 122, ${Math.max(0, p.sparkLife)})`;
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          if (p.sparkLife <= 0) {
            p.x = 6;
            p.y = 10 + Math.random() * (h - 20);
            p.lost = false;
          }
          return;
        }

        p.x += p.vx;
        if (!p.lost && p.x > w * 0.42 && p.x < w * 0.56 && Math.random() * 100 < lossRef.current * 0.22) {
          p.lost = true;
          p.sparkLife = 1.0;
          return;
        }
        if (p.x > w - 8) {
          p.x = 6;
          p.y = 10 + Math.random() * (h - 20);
        }
        ctx.fillStyle = '#7BAFD4';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    animate();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="bg-[#F5F0E8] border border-[#E8E4DC] rounded-xl p-3">
      <div className="flex items-center justify-between text-[11px] font-mono-tech text-[#6B6B6B] mb-1.5">
        <span>FOUNTAIN-DROPLET STREAM (XOR LT)</span>
        <span style={{ color: packetLossPct >= 20 ? '#C8907A' : '#4D8FB8' }}>
          {packetLossPct === 0
            ? dropletStats
              ? `0% Loss · ${dropletStats.received_droplets}/${dropletStats.sent_droplets} Rx`
              : '0% Loss · Nominal'
            : `${packetLossPct}% Loss · XOR Recovery Active`}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        id="droplet-canvas"
        className="w-full h-12 rounded-lg bg-[#FAF7F2] border border-[#E8E4DC] block"
      />
    </div>
  );
};
