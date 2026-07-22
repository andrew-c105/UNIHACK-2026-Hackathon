import { useState, useRef } from "react";

export function ImageUploadField({ value, onChange, className }) {
  const fileInputRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onChange) {
         onChange(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={`relative flex flex-col items-center justify-center border border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden ${
        isHovered ? 'border-white/50 bg-white/5' : 'border-white/20 bg-[#111]'
      } ${className || ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ aspectRatio: '1/1' }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />
      
      {value ? (
        <div className="absolute inset-0 group">
          <img 
            src={typeof value === 'string' ? value : URL.createObjectURL(value)} 
            alt="Upload preview" 
            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-50"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
             <svg className="w-8 h-8 text-white mb-2 shadow-sm drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
             </svg>
             <span className="text-white text-sm font-semibold tracking-wide drop-shadow-md">Click to change</span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className={`w-12 h-12 mb-3 rounded-full flex items-center justify-center transition-colors ${
              isHovered ? 'bg-[#e0e0e0]/20 text-white' : 'bg-[#e0e0e0]/5 text-[#e0e0e0]/50'
          }`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
          </div>
          <span className={`text-sm font-semibold tracking-wide transition-colors ${isHovered ? 'text-white' : 'text-[#e0e0e0]/70'}`}>
            Click to upload
          </span>
          <span className="text-xs text-[#e0e0e0]/40 mt-1 font-medium">
            PNG, JPG up to 5MB
          </span>
        </div>
      )}
    </div>
  );
}
