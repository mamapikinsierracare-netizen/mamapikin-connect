'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';

type ExportData = {
  period: string;
  facility: string;
  anc1: number;
  anc4: number;
  deliveries: number;
  facility_deliveries: number;
  pnc1: number;
  bcg: number;
  penta1: number;
  penta3: number;
  measles1: number;
};

export default function DHIS2ExportPage() {
  const [exportData, setExportData] = useState<ExportData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  useEffect(() => {
    loadAvailablePeriods();
  }, []);

  function loadAvailablePeriods() {
    // Get periods from localStorage data
    const ancVisits = getFromLocalStorage('anc_visits_*');
    const periods = new Set<string>();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('anc_visits_')) {
        const visits = JSON.parse(localStorage.getItem(key) || '[]');
        visits.forEach((visit: any) => {
          const period = visit.visit_date?.slice(0, 7);
          if (period) periods.add(period);
        });
      }
    }
    
    setAvailablePeriods(Array.from(periods).sort().reverse());
    if (availablePeriods.length > 0) {
      setSelectedPeriod(availablePeriods[0]);
    }
  }

  function getFromLocalStorage(pattern: string): any[] {
    const results: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(pattern.replace('*', ''))) {
        const data = localStorage.getItem(key);
        if (data) {
          results.push(...JSON.parse(data));
        }
      }
    }
    return results;
  }

  function generateExportData() {
    setLoading(true);
    
    // Get all data for selected period
    const ancVisits = getFromLocalStorage('anc_visits_');
    const deliveries = getFromLocalStorage('deliveries_');
    const pncVisits = getFromLocalStorage('pnc_visits_');
    const immunisations = getFromLocalStorage('immunisations_');
    
    // Filter by period
    const periodVisits = ancVisits.filter((v: any) => v.visit_date?.startsWith(selectedPeriod));
    const periodDeliveries = deliveries.filter((d: any) => d.delivery_date?.startsWith(selectedPeriod));
    const periodPnc = pncVisits.filter((p: any) => p.visit_date?.startsWith(selectedPeriod));
    const periodImmunisations = immunisations.filter((i: any) => i.administration_date?.startsWith(selectedPeriod));
    
    // Calculate indicators
    const anc1Count = periodVisits.filter((v: any) => v.visit_number === 1).length;
    const anc4Count = periodVisits.filter((v: any) => v.visit_number === 4).length;
    const totalDeliveries = periodDeliveries.length;
    const facilityDeliveries = periodDeliveries.filter((d: any) => d.delivery_place === 'facility').length;
    const pnc1Count = periodPnc.filter((p: any) => p.visit_number === 1).length;
    
    const bcgCount = periodImmunisations.filter((i: any) => i.vaccine_name === 'BCG').length;
    const penta1Count = periodImmunisations.filter((i: any) => i.vaccine_name === 'Penta' && i.dose_number === 1).length;
    const penta3Count = periodImmunisations.filter((i: any) => i.vaccine_name === 'Penta' && i.dose_number === 3).length;
    const measles1Count = periodImmunisations.filter((i: any) => i.vaccine_name === 'Measles' && i.dose_number === 1).length;
    
    const exportDataItem: ExportData = {
      period: selectedPeriod,
      facility: localStorage.getItem('facility_name') || 'MamaPikin Clinic',
      anc1: anc1Count,
      anc4: anc4Count,
      deliveries: totalDeliveries,
      facility_deliveries: facilityDeliveries,
      pnc1: pnc1Count,
      bcg: bcgCount,
      penta1: penta1Count,
      penta3: penta3Count,
      measles1: measles1Count
    };
    
    setExportData([exportDataItem]);
    setLoading(false);
    setMessage(`✅ Data generated for ${selectedPeriod}`);
  }

  function downloadAsCSV() {
    if (exportData.length === 0) return;
    
    const headers = ['Period', 'Facility', 'ANC1', 'ANC4', 'Deliveries', 'Facility Deliveries', 'PNC1', 'BCG', 'Penta1', 'Penta3', 'Measles1'];
    const rows = exportData.map(d => [
      d.period, d.facility, d.anc1, d.anc4, d.deliveries, d.facility_deliveries, d.pnc1, d.bcg, d.penta1, d.penta3, d.measles1
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhis2_export_${selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    setMessage(`✅ CSV exported for ${selectedPeriod}`);
  }

  function downloadAsDHIS2JSON() {
    if (exportData.length === 0) return;
    
    const dhis2Format = {
      dataSet: 'mamapikin_indicators',
      period: selectedPeriod,
      orgUnit: localStorage.getItem('facility_code') || 'FACILITY_001',
      dataValues: exportData.map(d => ({
        dataElement: 'anc1_visits',
        value: d.anc1,
        period: d.period
      }))
    };
    
    const jsonContent = JSON.stringify(dhis2Format, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhis2_export_${selectedPeriod}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    setMessage(`✅ DHIS2 JSON exported for ${selectedPeriod}`);
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-blue-700">📊 DHIS2 Export</h1>
            <p className="text-gray-600">Export health indicators to national DHIS2 system</p>
          </div>
          
          {message && (
            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
              {message}
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Aggregate Export</h2>
            
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Select Period (Year-Month)</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                {availablePeriods.map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 mb-6">
              <button
                onClick={generateExportData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
            
            {exportData.length > 0 && (
              <>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 border">Indicator</th>
                        <th className="p-2 border">Value</th>
                    </tr>
                    </thead>
                    <tbody>
                      <tr><td className="p-2 border">ANC 1st Visit</td><td className="p-2 border font-bold">{exportData[0].anc1}</td></tr>
                      <tr><td className="p-2 border">ANC 4th Visit</td><td className="p-2 border font-bold">{exportData[0].anc4}</td></tr>
                      <tr><td className="p-2 border">Total Deliveries</td><td className="p-2 border font-bold">{exportData[0].deliveries}</td></tr>
                      <tr><td className="p-2 border">Facility Deliveries</td><td className="p-2 border font-bold">{exportData[0].facility_deliveries}</td></tr>
                      <tr><td className="p-2 border">PNC within 48h</td><td className="p-2 border font-bold">{exportData[0].pnc1}</td></tr>
                      <tr><td className="p-2 border">BCG Coverage</td><td className="p-2 border font-bold">{exportData[0].bcg}</td></tr>
                      <tr><td className="p-2 border">Penta1 Coverage</td><td className="p-2 border font-bold">{exportData[0].penta1}</td></tr>
                      <tr><td className="p-2 border">Penta3 Coverage</td><td className="p-2 border font-bold">{exportData[0].penta3}</td></tr>
                      <tr><td className="p-2 border">Measles1 Coverage</td><td className="p-2 border font-bold">{exportData[0].measles1}</td></tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={downloadAsCSV}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    📥 Download as CSV
                  </button>
                  <button
                    onClick={downloadAsDHIS2JSON}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    📥 Download as DHIS2 JSON
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-6 bg-yellow-50 rounded-lg p-4">
            <h3 className="font-bold text-yellow-800 mb-2">📋 Instructions for DHIS2 Upload</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>1. Download the CSV or JSON file above</li>
              <li>2. Log into your DHIS2 instance</li>
              <li>3. Navigate to Data Entry → Import/Export</li>
              <li>4. Upload the file to the corresponding data set</li>
              <li>5. Verify the data and complete the import</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}