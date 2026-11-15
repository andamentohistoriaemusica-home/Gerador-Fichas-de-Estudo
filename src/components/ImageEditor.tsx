import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, Link, Trash2, Image, Sparkles } from "lucide-react";

interface ImageEditorProps {
  currentUrl?: string;
  onChange: (newUrl: string) => void;
  onRemove?: () => void;
  label?: string;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  currentUrl,
  onChange,
  onRemove,
  label = "Foto de Destaque"
}) => {
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState(currentUrl || "");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Downscale image to max size using canvas to keep base64 overhead minimum
  const processImageFile = (file: File) => {
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas arquivos de imagem.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = window.document.createElement("img");
      img.onload = () => {
        const canvas = window.document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        // Target max 500px on either dimension
        const MAX_DIM = 500;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          // Draw image compressed
          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as compressed jpeg (quality 0.82)
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.82);
          onChange(compressedBase64);
          setUrlInput(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  // Detect unsplash reference to suggest we can replace it
  const isDefaultUnsplash = currentUrl?.includes("images.unsplash.com");

  return (
    <div className="w-full max-w-[200px] flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-500 font-bold block">{label}</span>
        {currentUrl && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-zinc-600 hover:text-red-400 p-0.5 rounded transition cursor-pointer"
            title="Remover Imagem"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Main Drag-Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileBrowser}
        className={`relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer select-none transition-all duration-300 ${
          isDragging
            ? "border-[#c4a35a] bg-[#c4a35a]/10 scale-[1.01]"
            : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700/80 hover:bg-zinc-900/15"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {currentUrl ? (
          <>
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              {/* Dynamic ambient blurred background to ensure visual harmony regardless of aspect ratio */}
              <img
                src={currentUrl}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md select-none pointer-events-none"
              />
              {/* Contained image rendering so the user sees the complete, unclipped photo */}
              <img
                src={currentUrl}
                alt="Visualização"
                referrerPolicy="no-referrer"
                className="relative z-10 max-w-full max-h-full object-contain transition-all duration-300 p-0.5"
              />
            </div>
            <div className="absolute inset-0 bg-black/65 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-all duration-200 z-20">
              <Upload className="w-5 h-5 text-[#ebdcb9] mb-1" />
              <span className="font-mono text-[8px] uppercase tracking-wider text-[#ebdcb9] font-bold">Importar Novo Arquivo</span>
              <span className="text-[7.5px] text-zinc-400 mt-1">Ou arraste e solte</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <Image className="w-4 h-4 text-[#c4a35a]" />
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 block font-bold">Importar Imagem</span>
              <span className="text-[8px] text-zinc-500 block mt-0.5">Arraste aqui ou clique</span>
            </div>
            {isDefaultUnsplash && (
              <div className="flex items-center gap-1 bg-[#c4a35a]/5 px-2 py-0.5 rounded border border-[#c4a35a]/20">
                <Sparkles className="w-2 h-2 text-[#c4a35a]" />
                <span className="text-[7px] text-[#ebdcb9] font-mono">Foto Padrão do AI</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor method toggler */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsUrlMode(!isUrlMode);
          }}
          className="text-[9px] font-mono text-zinc-400 hover:text-[#c4a35a] flex items-center gap-1 transition"
        >
          <Link className="w-2.5 h-2.5" />
          <span>{isUrlMode ? "Ocultar URL de Imagem" : "Trocar via URL externo"}</span>
        </button>
      </div>

      {isUrlMode && (
        <div className="space-y-1.5 animate-fadeIn">
          <input
            type="text"
            placeholder="Cole o link da foto..."
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              onChange(e.target.value);
            }}
            onBlur={handleUrlSubmit}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleUrlSubmit();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-850 hover:border-zinc-750/80 text-[10px] p-1.5 text-zinc-350 placeholder-zinc-700 rounded transition font-sans outline-none focus:border-[#c4a35a]/80"
          />
          <span className="text-[8px] text-zinc-500 block leading-tight">
            Pressione Enter ou clique fora para aplicar o link.
          </span>
        </div>
      )}
    </div>
  );
};
