import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ZoomIn, ZoomOut, RotateCw, RefreshCw, Move, Crop } from 'lucide-react';

export type CropAspectRatio = '1:1' | '16:9' | '21:9' | '4:3' | 'free';

export interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile?: File | null;
  imageUrl?: string | null;
  title?: string;
  defaultAspectRatio?: CropAspectRatio;
  allowedAspectRatios?: CropAspectRatio[];
  onCropComplete: (croppedFile: File, previewUrl: string) => void;
}

const ASPECT_RATIO_VALUES: Record<CropAspectRatio, number | null> = {
  '1:1': 1,
  '16:9': 16 / 9,
  '21:9': 21 / 9,
  '4:3': 4 / 3,
  'free': null
};

const ASPECT_RATIO_LABELS: Record<CropAspectRatio, string> = {
  '1:1': '1:1 (Avatar/Token)',
  '16:9': '16:9 (Memória)',
  '21:9': '21:9 (Capa/Banner)',
  '4:3': '4:3 (Retrato)',
  'free': 'Livre'
};

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  imageUrl,
  title = 'Ajustar Enquadramento da Imagem',
  defaultAspectRatio = '1:1',
  allowedAspectRatios = ['1:1', '16:9', '21:9', '4:3', 'free'],
  onCropComplete
}) => {
  const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>(defaultAspectRatio);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sourceImageSrc, setSourceImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Initialize or update source image
  useEffect(() => {
    if (!isOpen) return;

    setAspectRatio(defaultAspectRatio);
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });

    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setSourceImageSrc(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (imageUrl) {
      setSourceImageSrc(imageUrl);
    } else {
      setSourceImageSrc(null);
    }
  }, [isOpen, imageFile, imageUrl, defaultAspectRatio]);

  // Handle Dragging / Panning (Mouse and Touch)
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - pan.x,
      y: clientY - pan.y
    });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPan({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel for smooth zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(0.5, Number((prev + delta).toFixed(2))), 4));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Calculate Crop Box Dimensions based on Container and Aspect Ratio
  const getCropBoxDimensions = useCallback(() => {
    if (!containerRef.current) return { width: 300, height: 300 };
    const containerRect = containerRef.current.getBoundingClientRect();
    const padding = 32;
    const maxWidth = containerRect.width - padding;
    const maxHeight = containerRect.height - padding;

    const targetRatio = ASPECT_RATIO_VALUES[aspectRatio] || (maxWidth / maxHeight);

    let cropWidth = maxWidth;
    let cropHeight = cropWidth / targetRatio;

    if (cropHeight > maxHeight) {
      cropHeight = maxHeight;
      cropWidth = cropHeight * targetRatio;
    }

    return {
      width: Math.round(cropWidth),
      height: Math.round(cropHeight)
    };
  }, [aspectRatio]);

  // Execute Canvas Crop and Generate High-Quality File
  const handleConfirmCrop = async () => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    setIsProcessing(true);

    try {
      const cropBox = getCropBoxDimensions();
      const containerRect = container.getBoundingClientRect();

      // Output resolution target (high resolution up to 1920px max dimension)
      const targetRatio = cropBox.width / cropBox.height;
      let outputWidth = Math.min(Math.max(cropBox.width * 2, 800), 1920);
      let outputHeight = Math.round(outputWidth / targetRatio);

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Não foi possível inicializar o contexto de desenho.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill canvas with background (in case of transparent margins)
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      // Coordinates mapping:
      // The center of the canvas corresponds to the center of the cropBox
      ctx.save();
      ctx.translate(outputWidth / 2, outputHeight / 2);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Scale factor between screen cropBox and output canvas
      const scaleToCanvas = outputWidth / cropBox.width;

      // Current on-screen rendered size of the image
      const imgRect = img.getBoundingClientRect();
      const renderedImgWidth = imgRect.width * scaleToCanvas;
      const renderedImgHeight = imgRect.height * scaleToCanvas;

      // Pan translation adjusted for scale and rotation
      const rad = (-rotation * Math.PI) / 180;
      const rotatedPanX = pan.x * Math.cos(rad) - pan.y * Math.sin(rad);
      const rotatedPanY = pan.x * Math.sin(rad) + pan.y * Math.cos(rad);

      ctx.drawImage(
        img,
        -renderedImgWidth / 2 + (rotatedPanX * scaleToCanvas),
        -renderedImgHeight / 2 + (rotatedPanY * scaleToCanvas),
        renderedImgWidth,
        renderedImgHeight
      );

      ctx.restore();

      // Export canvas to Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      });

      if (!blob) {
        throw new Error('Falha ao processar recorte da imagem.');
      }

      const fileName = imageFile?.name
        ? imageFile.name.replace(/\.[^/.]+$/, '') + '_cropped.jpg'
        : 'recorte_medieval.jpg';

      const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      onCropComplete(croppedFile, previewUrl);
      onClose();
    } catch (err) {
      console.error('Erro ao recortar imagem:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !sourceImageSrc) return null;

  const cropBox = getCropBoxDimensions();

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex justify-center items-center p-3 sm:p-4 animate-fade-in select-none">
      <div className="w-full max-w-2xl bg-medieval-charcoal grimoire-card border-medieval-gold/30 p-4 md:p-6 relative max-h-[95vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-medieval-gold/15 pb-3 mb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <Crop className="w-5 h-5 text-medieval-gold" />
            <h3 className="text-lg md:text-xl font-medieval text-medieval-gold tracking-wide">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded hover:bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-all duration-300"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Selector (if multiple allowed) */}
        {allowedAspectRatios.length > 1 && (
          <div className="flex items-center space-x-2 pb-2 overflow-x-auto scrollbar-none shrink-0 text-xs">
            <span className="text-medieval-silver font-serif shrink-0">Formato:</span>
            {allowedAspectRatios.map(ratio => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={`py-1 px-2.5 rounded transition-all duration-300 font-serif ${
                  aspectRatio === ratio
                    ? 'bg-medieval-gold text-medieval-charcoal font-semibold shadow-sm'
                    : 'bg-medieval-stone/70 text-medieval-silver hover:text-medieval-gold border border-medieval-gold/15'
                }`}
              >
                {ASPECT_RATIO_LABELS[ratio]}
              </button>
            ))}
          </div>
        )}

        {/* Viewport / Crop Canvas Area */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 1) {
              handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchEnd={handlePointerUp}
          className="relative flex-1 w-full min-h-[260px] md:min-h-[340px] bg-black/80 rounded border border-medieval-gold/20 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        >
          {/* Target Image to be Cropped */}
          <img
            ref={imageRef}
            src={sourceImageSrc}
            alt="Imagem para recorte"
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              maxWidth: 'none'
            }}
            className="pointer-events-none select-none max-h-[75vh]"
          />

          {/* Darkened Overlay around Crop Box */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Top mask */}
            <div
              className="absolute bg-black/60 backdrop-blur-[2px] transition-all"
              style={{
                top: 0,
                left: 0,
                right: 0,
                bottom: `calc(50% + ${cropBox.height / 2}px)`
              }}
            />
            {/* Bottom mask */}
            <div
              className="absolute bg-black/60 backdrop-blur-[2px] transition-all"
              style={{
                top: `calc(50% + ${cropBox.height / 2}px)`,
                left: 0,
                right: 0,
                bottom: 0
              }}
            />
            {/* Left mask */}
            <div
              className="absolute bg-black/60 backdrop-blur-[2px] transition-all"
              style={{
                top: `calc(50% - ${cropBox.height / 2}px)`,
                bottom: `calc(50% - ${cropBox.height / 2}px)`,
                left: 0,
                right: `calc(50% + ${cropBox.width / 2}px)`
              }}
            />
            {/* Right mask */}
            <div
              className="absolute bg-black/60 backdrop-blur-[2px] transition-all"
              style={{
                top: `calc(50% - ${cropBox.height / 2}px)`,
                bottom: `calc(50% - ${cropBox.height / 2}px)`,
                left: `calc(50% + ${cropBox.width / 2}px)`,
                right: 0
              }}
            />

            {/* Glowing Golden Crop Box with Rule of Thirds Guides */}
            <div
              className="border-2 border-medieval-gold shadow-[0_0_20px_rgba(212,175,55,0.35)] relative transition-all duration-200 pointer-events-none"
              style={{
                width: `${cropBox.width}px`,
                height: `${cropBox.height}px`,
                borderRadius: aspectRatio === '1:1' ? '8px' : '6px'
              }}
            >
              {/* Optional circular guide for 1:1 avatars */}
              {aspectRatio === '1:1' && (
                <div className="absolute inset-0 rounded-full border border-medieval-gold/40 border-dashed pointer-events-none" />
              )}

              {/* Rule of Thirds Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                <div className="border-r border-b border-medieval-gold/20" />
                <div className="border-r border-b border-medieval-gold/20" />
                <div className="border-b border-medieval-gold/20" />
                <div className="border-r border-b border-medieval-gold/20" />
                <div className="border-r border-b border-medieval-gold/20" />
                <div className="border-b border-medieval-gold/20" />
                <div className="border-r border-medieval-gold/20" />
                <div className="border-r border-medieval-gold/20" />
                <div />
              </div>

              {/* Corner accent markers */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-medieval-brightGold" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-medieval-brightGold" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-medieval-brightGold" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-medieval-brightGold" />
            </div>
          </div>

          {/* Quick Helper Badge */}
          <div className="absolute bottom-2 left-2 bg-medieval-charcoal/80 text-[10px] text-medieval-silver px-2 py-1 rounded border border-medieval-gold/20 backdrop-blur-sm pointer-events-none flex items-center space-x-1">
            <Move className="w-3 h-3 text-medieval-gold" />
            <span>Arraste para mover • Scroll para zoom</span>
          </div>
        </div>

        {/* Toolbar & Controls */}
        <div className="mt-3 pt-3 border-t border-medieval-gold/15 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Zoom controls */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(0.5, Number((prev - 0.2).toFixed(2))))}
              className="p-1.5 rounded bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-colors"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24 sm:w-32 accent-medieval-gold cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(3, Number((prev + 0.2).toFixed(2))))}
              className="p-1.5 rounded bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-medieval-silver min-w-[3ch]">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleRotate}
              className="btn-stone py-1.5 px-2.5 text-xs flex items-center space-x-1"
              title="Girar 90 graus"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Girar</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="btn-stone py-1.5 px-2.5 text-xs flex items-center space-x-1"
              title="Centralizar e resetar ajustes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Centralizar</span>
            </button>
          </div>

          {/* Submit / Cancel Buttons */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="btn-stone py-1.5 px-4 text-xs font-serif"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={isProcessing}
              className="btn-gold py-1.5 px-4 text-xs font-serif flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Enquadrando...' : 'Confirmar Enquadramento'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
};
