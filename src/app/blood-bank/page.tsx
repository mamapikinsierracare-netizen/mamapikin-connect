'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';

type BloodDonor = {
  donor_id?: string;
  donor_code: string;
  full_name: string;
  blood_group: string;
  phone: string;
  last_donation_date?: string;
  total_donations: number;
  is_eligible: boolean;
};

type BloodUnit = {
  unit_id?: string;
  batch_number: string;
  blood_group: string;
  component: string;
  collection_date: string;
  expiry_date: string;
  status: string;
};

type BloodRequest = {
  request_code: string;
  patient_id: string;
  patient_name: string;
  units_requested: number;
  blood_group_needed: string;
  urgency: string;
  cross_match_status: string;
};

// Blood groups with compatibility
const bloodCompatibility: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-']
};

// Generate unique codes
function generateDonorCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `DON-${year}-${random}`;
}

function generateBatchNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BLOOD-${dateStr}-${random}`;
}

function generateRequestCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `REQ-${dateStr}-${random}`;
}

// Save to localStorage (offline-first)
function saveToLocalStorage(key: string, data: any) {
  const existing = localStorage.getItem(key);
  const items = existing ? JSON.parse(existing) : [];
  items.push(data);
  localStorage.setItem(key, JSON.stringify(items));
}

function getFromLocalStorage(key: string): any[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export default function BloodBankPage() {
  const [activeTab, setActiveTab] = useState<'donors' | 'inventory' | 'requests' | 'issues'>('donors');
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  // Donor form
  const [donorForm, setDonorForm] = useState({
    full_name: '',
    blood_group: '',
    phone: '',
    district: '',
    medical_conditions: '',
    is_eligible: true
  });
  
  // Inventory form
  const [inventoryForm, setInventoryForm] = useState({
    donor_code: '',
    blood_group: '',
    component: 'Whole Blood',
    collection_date: '',
    expiry_date: '',
    volume_ml: 450
  });
  
  // Request form
  const [requestForm, setRequestForm] = useState({
    patient_name: '',
    patient_id: '',
    patient_blood_group: '',
    units_requested: 1,
    blood_group_needed: '',
    urgency: 'routine',
    clinical_indication: '',
    requesting_doctor: ''
  });
  
  // Data
  const [donors, setDonors] = useState<BloodDonor[]>([]);
  const [inventory, setInventory] = useState<BloodUnit[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');

  useEffect(() => {
    // Load data from localStorage
    setDonors(getFromLocalStorage('blood_donors'));
    setInventory(getFromLocalStorage('blood_inventory'));
    setRequests(getFromLocalStorage('blood_requests'));
    
    // Check online status
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate available units by blood group
  const availableUnits = inventory.filter(u => u.status === 'available');
  const availableByGroup: Record<string, number> = {};
  availableUnits.forEach(unit => {
    availableByGroup[unit.blood_group] = (availableByGroup[unit.blood_group] || 0) + 1;
  });

  // Handle donor registration
  function handleDonorSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const donor: BloodDonor = {
      donor_code: generateDonorCode(),
      full_name: donorForm.full_name,
      blood_group: donorForm.blood_group,
      phone: donorForm.phone,
      total_donations: 0,
      is_eligible: donorForm.is_eligible
    };
    
    saveToLocalStorage('blood_donors', donor);
    setDonors([...donors, donor]);
    
    setMessage(`✅ Donor ${donor.full_name} registered successfully! Donor Code: ${donor.donor_code}`);
    setMessageType('success');
    
    // Reset form
    setDonorForm({ full_name: '', blood_group: '', phone: '', district: '', medical_conditions: '', is_eligible: true });
    
    setTimeout(() => setMessage(''), 3000);
  }

  // Handle blood unit addition
  function handleInventorySubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Find donor by code
    const donor = donors.find(d => d.donor_code === inventoryForm.donor_code);
    
    const unit: BloodUnit = {
      batch_number: generateBatchNumber(),
      blood_group: inventoryForm.blood_group,
      component: inventoryForm.component,
      collection_date: inventoryForm.collection_date,
      expiry_date: inventoryForm.expiry_date,
      status: 'available'
    };
    
    saveToLocalStorage('blood_inventory', unit);
    setInventory([...inventory, unit]);
    
    // Update donor's last donation date and count
    if (donor) {
      const updatedDonors = donors.map(d => 
        d.donor_code === inventoryForm.donor_code 
          ? { ...d, last_donation_date: inventoryForm.collection_date, total_donations: d.total_donations + 1 }
          : d
      );
      localStorage.setItem('blood_donors', JSON.stringify(updatedDonors));
      setDonors(updatedDonors);
    }
    
    setMessage(`✅ Blood unit added! Batch: ${unit.batch_number} | ${unit.blood_group}`);
    setMessageType('success');
    
    // Reset form
    setInventoryForm({ donor_code: '', blood_group: '', component: 'Whole Blood', collection_date: '', expiry_date: '', volume_ml: 450 });
    
    setTimeout(() => setMessage(''), 3000);
  }

  // Handle blood request
  function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const request: BloodRequest = {
      request_code: generateRequestCode(),
      patient_id: requestForm.patient_id || `PAT-${Date.now()}`,
      patient_name: requestForm.patient_name,
      units_requested: requestForm.units_requested,
      blood_group_needed: requestForm.blood_group_needed,
      urgency: requestForm.urgency,
      cross_match_status: 'pending'
    };
    
    saveToLocalStorage('blood_requests', request);
    setRequests([...requests, request]);
    
    // Check if enough units available
    const available = availableByGroup[requestForm.blood_group_needed] || 0;
    const statusMessage = available >= requestForm.units_requested 
      ? `✅ Request created. ${available} units available.`
      : `⚠️ LOW STOCK: Only ${available} units available for ${requestForm.blood_group_needed}`;
    
    setMessage(`📋 Request #${request.request_code}\nPatient: ${requestForm.patient_name}\nNeeds: ${requestForm.units_requested} units of ${requestForm.blood_group_needed}\n${statusMessage}`);
    setMessageType(available >= requestForm.units_requested ? 'success' : 'warning');
    
    // Reset form
    setRequestForm({ patient_name: '', patient_id: '', patient_blood_group: '', units_requested: 1, blood_group_needed: '', urgency: 'routine', clinical_indication: '', requesting_doctor: '' });
    
    setTimeout(() => setMessage(''), 5000);
  }

  // Get compatible donors for a patient
  function getCompatibleDonors(patientBloodGroup: string): BloodDonor[] {
    const compatibleGroups = bloodCompatibility[patientBloodGroup] || [];
    return donors.filter(d => 
      compatibleGroups.includes(d.blood_group) && 
      d.is_eligible && 
      (!d.last_donation_date || new Date(d.last_donation_date) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          
          <div className={`mb-4 p-3 rounded-lg text-center ${
            connectionStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {connectionStatus === 'online' ? '✅ Online Mode' : '📡 Offline Mode - Data saved locally'}
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-red-700">🩸 Blood Bank</h1>
            <p className="text-gray-600">Donor management, inventory tracking, and transfusion requests</p>
          </div>
          
          {message && (
            <div className={`mb-4 p-4 rounded-lg whitespace-pre-line ${
              messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-400' :
              messageType === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-400' :
              'bg-red-100 text-red-800 border border-red-400'
            }`}>
              {message}
            </div>
          )}
          
          {/* Inventory Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
              <div key={group} className="bg-white rounded-lg shadow p-3 text-center">
                <div className="text-xl font-bold text-red-600">{group}</div>
                <div className="text-2xl font-bold">{availableByGroup[group] || 0}</div>
                <div className="text-xs text-gray-500">units</div>
              </div>
            ))}
          </div>
          
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab('donors')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'donors' ? 'bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              👥 Donors ({donors.length})
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'inventory' ? 'bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              📦 Inventory ({inventory.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'requests' ? 'bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              📋 Requests ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'issues' ? 'bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              🩸 Compatibility Check
            </button>
          </div>
          
          {/* Donors Tab */}
          {activeTab === 'donors' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donor Registration Form */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Register New Donor</h2>
                <form onSubmit={handleDonorSubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">Full Name *</label>
                    <input type="text" value={donorForm.full_name} onChange={(e) => setDonorForm({...donorForm, full_name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Blood Group *</label>
                      <select value={donorForm.blood_group} onChange={(e) => setDonorForm({...donorForm, blood_group: e.target.value})} required className="w-full px-3 py-2 border rounded-lg">
                        <option value="">Select</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Phone *</label>
                      <input type="tel" value={donorForm.phone} onChange={(e) => setDonorForm({...donorForm, phone: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Register Donor
                  </button>
                </form>
              </div>
              
              {/* Donor List */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Registered Donors</h2>
                <div className="max-h-96 overflow-y-auto">
                  {donors.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No donors registered yet</p>
                  ) : (
                    donors.map(donor => (
                      <div key={donor.donor_code} className="p-3 border-b hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{donor.full_name}</div>
                            <div className="text-sm text-gray-500">Code: {donor.donor_code}</div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                            donor.blood_group === 'O-' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800'
                          }`}>
                            {donor.blood_group}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">📞 {donor.phone}</div>
                        <div className="text-xs text-gray-400">Donations: {donor.total_donations}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Blood Unit Form */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Add Blood Unit</h2>
                <form onSubmit={handleInventorySubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">Donor Code</label>
                    <input type="text" value={inventoryForm.donor_code} onChange={(e) => setInventoryForm({...inventoryForm, donor_code: e.target.value})} placeholder="DON-2024-0001" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Blood Group *</label>
                      <select value={inventoryForm.blood_group} onChange={(e) => setInventoryForm({...inventoryForm, blood_group: e.target.value})} required className="w-full px-3 py-2 border rounded-lg">
                        <option value="">Select</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Component</label>
                      <select value={inventoryForm.component} onChange={(e) => setInventoryForm({...inventoryForm, component: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                        <option value="Whole Blood">Whole Blood</option>
                        <option value="RBC">RBC</option>
                        <option value="Platelets">Platelets</option>
                        <option value="Plasma">Plasma</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Collection Date *</label>
                      <input type="date" value={inventoryForm.collection_date} onChange={(e) => setInventoryForm({...inventoryForm, collection_date: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Expiry Date *</label>
                      <input type="date" value={inventoryForm.expiry_date} onChange={(e) => setInventoryForm({...inventoryForm, expiry_date: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Add Blood Unit
                  </button>
                </form>
              </div>
              
              {/* Inventory List */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Blood Inventory</h2>
                <div className="max-h-96 overflow-y-auto">
                  {inventory.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No blood units in inventory</p>
                  ) : (
                    inventory.map(unit => (
                      <div key={unit.batch_number} className="p-3 border-b hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{unit.blood_group} - {unit.component}</div>
                            <div className="text-xs text-gray-500 font-mono">Batch: {unit.batch_number}</div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                            unit.status === 'available' ? 'bg-green-100 text-green-800' :
                            unit.status === 'issued' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {unit.status}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Collected: {unit.collection_date} | Expires: {unit.expiry_date}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Blood Request Form */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Blood Request (Cross-match)</h2>
                <form onSubmit={handleRequestSubmit}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Patient Name *</label>
                      <input type="text" value={requestForm.patient_name} onChange={(e) => setRequestForm({...requestForm, patient_name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Patient ID</label>
                      <input type="text" value={requestForm.patient_id} onChange={(e) => setRequestForm({...requestForm, patient_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Patient Blood Group</label>
                      <select value={requestForm.patient_blood_group} onChange={(e) => {
                        setRequestForm({...requestForm, patient_blood_group: e.target.value});
                        setSelectedBloodGroup(e.target.value);
                      }} className="w-full px-3 py-2 border rounded-lg">
                        <option value="">Select (for compatibility)</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Blood Group Needed *</label>
                      <select value={requestForm.blood_group_needed} onChange={(e) => setRequestForm({...requestForm, blood_group_needed: e.target.value})} required className="w-full px-3 py-2 border rounded-lg">
                        <option value="">Select</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Units Requested *</label>
                      <input type="number" min="1" max="10" value={requestForm.units_requested} onChange={(e) => setRequestForm({...requestForm, units_requested: parseInt(e.target.value)})} required className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Urgency *</label>
                      <select value={requestForm.urgency} onChange={(e) => setRequestForm({...requestForm, urgency: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg">
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">Clinical Indication</label>
                    <textarea value={requestForm.clinical_indication} onChange={(e) => setRequestForm({...requestForm, clinical_indication: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Severe anemia, postpartum hemorrhage, surgery..." />
                  </div>
                  <button type="submit" className={`w-full py-2 rounded-lg text-white font-medium ${
                    requestForm.urgency === 'emergency' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}>
                    {requestForm.urgency === 'emergency' ? '🚨 EMERGENCY REQUEST' : 'Submit Request'}
                  </button>
                </form>
              </div>
              
              {/* Request List & Compatibility Info */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Requests</h2>
                <div className="max-h-96 overflow-y-auto">
                  {requests.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No blood requests yet</p>
                  ) : (
                    requests.map(req => (
                      <div key={req.request_code} className={`p-3 border-b hover:bg-gray-50 ${
                        req.urgency === 'emergency' ? 'border-l-4 border-l-red-500' : ''
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{req.patient_name}</div>
                            <div className="text-xs text-gray-500 font-mono">{req.request_code}</div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                            req.urgency === 'emergency' ? 'bg-red-600 text-white' :
                            req.urgency === 'urgent' ? 'bg-orange-500 text-white' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {req.urgency}
                          </div>
                        </div>
                        <div className="text-sm mt-1">
                          Needs: {req.units_requested} unit(s) of {req.blood_group_needed}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Available: {availableByGroup[req.blood_group_needed] || 0} units
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Compatibility Info */}
                {selectedBloodGroup && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h3 className="font-bold text-blue-800 mb-2">🩸 Compatible Donors for {selectedBloodGroup}</h3>
                    <div className="text-sm">
                      Can receive from: <strong>{bloodCompatibility[selectedBloodGroup]?.join(', ') || 'Unknown'}</strong>
                    </div>
                    <div className="text-sm mt-1">
                      Compatible donors in registry: <strong>{getCompatibleDonors(selectedBloodGroup).length}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Compatibility Check Tab */}
          {activeTab === 'issues' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Blood Compatibility Guide</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 border text-left">Patient Blood Group</th>
                      <th className="p-3 border text-left">Can Receive From (Donors)</th>
                      <th className="p-3 border text-left">Can Donate To (Patients)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(bloodCompatibility).map(([group, canReceiveFrom]) => {
                      const canDonateTo = Object.entries(bloodCompatibility)
                        .filter(([_, recipients]) => recipients.includes(group))
                        .map(([g]) => g);
                      return (
                        <tr key={group} className="hover:bg-gray-50">
                          <td className="p-3 border font-bold">{group}</td>
                          <td className="p-3 border">{canReceiveFrom.join(', ')}</td>
                          <td className="p-3 border">{canDonateTo.join(', ')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Important:</strong> O- is the universal donor (can give to anyone).<br />
                  AB+ is the universal recipient (can receive from anyone).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}