'use client';

interface Facility {
  id: string;
  name: string;
  district?: string;
  phone: string;
  category: string;
}

interface SimpleMapProps {
  facilities: Facility[];
}

export default function SimpleMap({ facilities }: SimpleMapProps) {
  // Group facilities by district
  const facilitiesByDistrict = facilities.reduce((acc, facility) => {
    const district = facility.district || 'Unknown';
    if (!acc[district]) acc[district] = [];
    acc[district].push(facility);
    return acc;
  }, {} as Record<string, Facility[]>);

  // Sort districts alphabetically
  const sortedDistricts = Object.keys(facilitiesByDistrict).sort();

  return (
    <div className="bg-gray-100 rounded-lg p-4">
      <div className="text-center mb-4">
        <p className="text-sm text-gray-600">
          📍 {facilities.length} facilities with location data
        </p>
        <p className="text-xs text-gray-500">
          Showing facilities by district (GPS coordinates coming soon)
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {sortedDistricts.map((district) => (
          <div key={district} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <h3 className="font-bold text-blue-700 mb-2 border-b pb-1">📍 {district}</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {facilitiesByDistrict[district].slice(0, 5).map((facility) => (
                <div key={facility.id} className="text-sm border-b border-gray-100 pb-2">
                  <div className="font-medium text-gray-800">{facility.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                    <span>{getCategoryIcon(facility.category)}</span>
                    <span>📞 {facility.phone}</span>
                  </div>
                </div>
              ))}
              {facilitiesByDistrict[district].length > 5 && (
                <div className="text-xs text-gray-400 text-center pt-1">
                  +{facilitiesByDistrict[district].length - 5} more facilities
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-2 pt-1 border-t">
              Total: {facilitiesByDistrict[district].length} facilities
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-4 pt-3 border-t">
        <p className="text-xs text-gray-500">
          🗺️ Click &quot;Show Map&quot; to view facilities grouped by district
        </p>
        <p className="text-xs text-gray-400 mt-1">
          💡 Full interactive map with GPS navigation coming soon
        </p>
      </div>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    national: '🚨', hospital: '🏥', maternity: '🤰',
    fire: '🔥', police: '👮', ambulance: '🚑', chw: '👩‍⚕️'
  };
  return icons[category] || '📞';
}