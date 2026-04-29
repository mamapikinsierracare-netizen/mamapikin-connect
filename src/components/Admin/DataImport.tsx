'use client';
import { useState } from 'react';

export default function DataImport() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData([]);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setMessage('Processing file...');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/import', {
      method: 'POST',
      body: formData,
    });
    const result = await res.json();

    if (res.ok) {
      setPreviewData(result.data);
      setMessage(`Successfully parsed ${result.total} records. Ready for import.`);
    } else {
      setMessage(`Error: ${result.error}`);
    }
    setLoading(false);
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setMessage('Importing data...');
    // This will call the confirmation endpoint (we'll build next)
    const res = await fetch('/api/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: previewData }),
    });

    if (res.ok) {
      setMessage('Import completed successfully!');
      setPreviewData([]);
      setFile(null);
    } else {
      const error = await res.json();
      setMessage(`Import failed: ${error.error}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Bulk Data Import</h2>
      <div className="mb-4">
        <input type="file" accept=".xlsx, .csv" onChange={handleFileChange} />
        <button
          onClick={handlePreview}
          disabled={!file || loading}
          className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Preview
        </button>
      </div>
      {previewData.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold">Preview (first 5 rows)</h3>
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                {Object.keys(previewData[0] || {}).map(key => (
                  <th key={key} className="border p-2">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.slice(0, 5).map((row, idx) => (
                <tr key={idx}>
                  {Object.values(row).map((val: any, i) => (
                    <td key={i} className="border p-2">{String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={handleConfirmImport}
            disabled={loading}
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
          >
            Confirm Import
          </button>
        </div>
      )}
      {message && <p className="text-gray-700">{message}</p>}
    </div>
  );
}