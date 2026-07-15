import { memo } from 'react';

export const MemoizedTableRow = memo(function MemoizedTableRow({ 
  children, 
  className,
  onClick,
  ...props 
}) {
  return (
    <div className={className} onClick={onClick} {...props}>
      {children}
    </div>
  );
});

export default MemoizedTableRow;

