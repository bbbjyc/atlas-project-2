// public/sprites/icons.svg 의 아이콘 하나. 크기는 className 으로 준다 (기본 20px)
export default function Icon({ name, className = 'size-5' }: { name: string; className?: string }) {
  return (
    <svg className={`flex-none fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round] ${className}`} aria-hidden="true">
      <use href={`/sprites/icons.svg#${name}`} />
    </svg>
  );
}
