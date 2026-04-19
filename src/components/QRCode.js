// components/QRCode.js
// This component creates a QR code from any text you give it

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCode({ value, size = 200 }) {
  // value = the text to encode (like patient ID)
  // size = how big the QR code should be (default 200 pixels)
  
  if (!value) {
    return <p className="text-gray-500">No QR code available</p>;
  }
  
  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-white">
      <QRCodeSVG value={value} size={size} />
      <p className="text-xs text-gray-500 mt-2 break-all text-center">
        {value}
      </p>
      <button
        onClick={() => {
          // Get the SVG element
          const svg = document.querySelector('#qr-code-svg');
          if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              const pngFile = canvas.toDataURL('image/png');
              const downloadLink = document.createElement('a');
              downloadLink.download = `qr-${value}.png`;
              downloadLink.href = pngFile;
              downloadLink.click();
            };
            img.src = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(svg.outerHTML);
          }
        }}
        className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
      >
        Download QR Code
      </button>
    </div>
  );
}