import React from 'react';

const Card = ({ children, title, className = '', noPadding = false, footer, onClick, ...props }) => {
  return (
    <div 
      className={`bg-white rounded-xl shadow-soft border border-[#F1F3F6] overflow-hidden ${className}`}
      onClick={onClick}
      {...props}
    >
      {title && (
        <div className="px-6 py-4 border-b border-[#F1F3F6] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#1F2937] leading-none">{title}</h3>
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 bg-[#F7F9FC] border-t border-[#F1F3F6]">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
