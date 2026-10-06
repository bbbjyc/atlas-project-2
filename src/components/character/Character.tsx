import { AnimationEvent, useId } from 'react';
import { charMarkup, CharConfig } from './charConfig';

// 캐릭터 SVG. viewBox 를 바꾸면 얼굴만(아바타·꾸미기 타일) 보여 줄 수 있다
export default function Character({ cfg, war = false, headOnly = false, viewBox = '0 0 200 264', className, onAnimationEnd }: {
  cfg: CharConfig; war?: boolean; headOnly?: boolean; viewBox?: string; className?: string;
  onAnimationEnd?: (e: AnimationEvent<SVGSVGElement>) => void;
}) {
  const id = 'c' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox={viewBox} className={className} aria-hidden="true" onAnimationEnd={onAnimationEnd}
      dangerouslySetInnerHTML={{ __html: charMarkup(cfg, id, { headOnly, war }) }} />
  );
}
