'use client';

import { useEffect, useRef } from 'react';
import { useAlfredStore } from '../store/useAlfredStore';

export default function Matrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { matrixText, contextText } = useAlfredStore();
  const matrixTextRef = useRef(matrixText);
  const contextTextRef = useRef(contextText);

  useEffect(() => {
    matrixTextRef.current = matrixText;
    contextTextRef.current = contextText;
  }, [matrixText, contextText]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const ctx = c.getContext('2d');
    if (!ctx) return;

    let speed = 2;
    let letterSpacing = 20;
    let count = 0, count2 = 0;

    const toCamelCase = (str: string) => {
      return str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');
    };

    const getActiveText = () => {
      const sourceText = matrixTextRef.current || contextTextRef.current;
      if (!sourceText) return "ALFRED";
      return toCamelCase(sourceText);
    };

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
    let nextCharIndex = 0;
    const r = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

    const manageSize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    
    window.addEventListener('resize', manageSize);
    manageSize();

    const createText = () => {
      const currentText = getActiveText();
      const charIndex = nextCharIndex % currentText.length;
      const letter = currentText[charIndex];
      const maxCols = Math.floor(c.width / letterSpacing);
      const x = (charIndex % maxCols) * letterSpacing;

      textCreatedArray.push({
        letter,
        x,
        y: -20,
        color: textColors[0]
      });

      nextCharIndex++;
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
