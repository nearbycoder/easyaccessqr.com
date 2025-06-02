'use client';

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function QRCodeGenerator() {
  const [link, setLink] = useState('https://easyaccessqr.com');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [size, setSize] = useState(256);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoSizeRatio, setLogoSizeRatio] = useState(0.2); // 20% of QR size
  const qrRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDownload = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const url = (canvas as HTMLCanvasElement).toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'easyaccessqr.png';
      a.click();
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-background shadow p-8 flex flex-col md:flex-row gap-8 items-center justify-center">
      {/* Modal for fullscreen QR code */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-lg flex flex-col items-center justify-center max-w-[95vw]  p-4 md:p-8"
            style={{ boxSizing: 'border-box' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-4 text-2xl text-gray-500 hover:text-gray-800 focus:outline-none"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="flex-1 flex items-center justify-center w-full h-full">
              <QRCodeCanvas
                value={link || 'https://easyaccessqr.com'}
                size={Math.min(
                  window.innerWidth * 0.8,
                  window.innerHeight * 0.8,
                  600
                )}
                fgColor={fgColor}
                bgColor={bgColor}
                includeMargin={true}
                className="rounded bg-white"
                level="H"
                imageSettings={
                  logo
                    ? {
                        src: logo,
                        width:
                          Math.min(
                            window.innerWidth * 0.8,
                            window.innerHeight * 0.8,
                            600
                          ) * logoSizeRatio,
                        height:
                          Math.min(
                            window.innerWidth * 0.8,
                            window.innerHeight * 0.8,
                            600
                          ) * logoSizeRatio,
                        excavate: true,
                      }
                    : undefined
                }
              />
            </div>
            <div className="mt-4 text-center text-gray-600 text-sm">
              Scan or share this QR code
            </div>
          </div>
        </div>
      )}
      {/* End Modal */}
      <form
        className="flex flex-col gap-4 w-full max-w-sm"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="url"
          required
          placeholder="https://your-link.com"
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <div className="flex gap-2 items-center">
          <label className="text-sm">Foreground</label>
          <input
            type="color"
            value={fgColor}
            onChange={(e) => setFgColor(e.target.value)}
            className="w-8 h-8 border rounded"
          />
          <label className="text-sm ml-4">Background</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="w-8 h-8 border rounded"
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm">Size</label>
          <input
            type="range"
            min="128"
            max="512"
            step="16"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-xs w-10 text-right">{size}px</span>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm">Logo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => setLogo(ev.target?.result as string);
                reader.readAsDataURL(file);
              } else {
                setLogo(null);
              }
            }}
            className="text-xs"
          />
          {logo && (
            <button
              type="button"
              className="ml-2 text-xs text-red-500 underline"
              onClick={() => setLogo(null)}
            >
              Remove
            </button>
          )}
        </div>
        {logo && (
          <div className="flex gap-2 items-center">
            <label className="text-sm">Logo Size</label>
            <input
              type="range"
              min="0.1"
              max="0.25"
              step="0.01"
              value={logoSizeRatio}
              onChange={(e) => setLogoSizeRatio(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs w-10 text-right">
              {Math.round(logoSizeRatio * 100)}%
            </span>
          </div>
        )}
      </form>
      <div className="flex flex-col items-center gap-4" ref={qrRef}>
        <QRCodeCanvas
          value={link || 'https://easyaccessqr.com'}
          size={size}
          fgColor={fgColor}
          bgColor={bgColor}
          includeMargin={true}
          className="shadow-lg rounded bg-white"
          level="H"
          imageSettings={
            logo
              ? {
                  src: logo,
                  width: size * logoSizeRatio,
                  height: size * logoSizeRatio,
                  excavate: true,
                }
              : undefined
          }
        />
        <div className="flex gap-2 mt-2">
          <a
            href="#"
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
            onClick={handleDownload}
          >
            Download PNG
          </a>
          <button
            type="button"
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition"
            onClick={() => setIsModalOpen(true)}
          >
            Full Screen
          </button>
        </div>
      </div>
    </div>
  );
}
