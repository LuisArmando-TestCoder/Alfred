'use client';

import { useEffect, useRef } from 'react';

export default function Matrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const ctx = c.getContext('2d');
    if (!ctx) return;

    let speed = 2;
    let letterSpacing = 20;
    let count = 0, count2 = 0;

    const textArray = [
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
      'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O',
      'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W',
      'X', 'Y', 'Z', '1', '2', '3', '4', '5',
      '6', '7', '8', '9', '0', '#', '%', '&',
      '@', '<', '>', '^', ';', '.', '|', '-',
      '_', '°', '¬', '+', '*', '/'
    ];

    let textColors = ['#00FF41', '#008F11', '#003B00', '#0D0208'];
    const allTextColors = [
      ['#00FF41', '#008F11', '#003B00', '#0D0208'],
      ['#00FFDF', '#4CFFE8', '#267F74', '#0D0208'],
      ['#AF00FF', '#C74CFF', '#57007F', '#0D0208'],
    ];

    let colorIndex = 0;
    const colorInterval = setInterval(() => {
      colorIndex++;
      if (colorIndex > allTextColors.length - 1) colorIndex = 0;
      textColors = allTextColors[colorIndex];
    }, 10000);

    const textCreatedArray: any[] = [];
    const r = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

    const manageSize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    
    window.addEventListener('resize', manageSize);
    manageSize();

    const createText = () => {
      textCreatedArray.push({
        letter: textArray[r(0, textArray.length - 1)],
        x: Math.floor(r(0, c.width) / letterSpacing) * letterSpacing,
        y: -20,
        color: textColors[0]
      });
    };

    let animationFrameId: number;
    
    const drawer = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      count2++;
      if (count2 === letterSpacing / 2) {
        count2 = 0;
        for (let i = 0; i < Math.floor(c.width / 70 * 2); i++) {
          createText();
        }
      }
      
      for (let i = textCreatedArray.length - 1; i >= 0; i--) {
        const item = textCreatedArray[i];
        item.y += speed;
        
        count++;
        if (count === 10) {
          count = 0;
          item.color = textColors[r(0, textColors.length - 1)];
        }
        
        ctx.fillStyle = item.color;
        ctx.font = `${letterSpacing}px Arial`;
        ctx.fillText(item.letter, item.x, item.y);
        
        if (item.y > c.height + letterSpacing) {
           textCreatedArray.splice(i, 1);
        }
      }
      
      animationFrameId = requestAnimationFrame(drawer);
    };

    drawer();

    return () => {
      clearInterval(colorInterval);
      window.removeEventListener('resize', manageSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10 bg-black" />;
}
