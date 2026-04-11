'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'

export default function RegisterPage() {
  // State for form data
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    phone: '',
    village: '',
    district: '',
    blood_group: '',
    allergies: '',
    guardian_name: '',
    guardian_phone: '',
    is_pregnant: false,
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [generatedId, setGeneratedId] = useState('')

  // Handle form input changes
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  // Generate Patient ID
  function generatePatientId() {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `MCH-KAB-${year}-${random}`
  }

  // Check for duplicate patient
  async function checkDuplicate(phone: string, name: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, phone')
      .or(`phone.eq.${phone},full_name.ilike.%${name}%`)
      .limit(3)
    
    if (error) {
      console.error('Duplicate check error:', error)
      return []
    }
    
    return data || []
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      // Check for duplicates
      const duplicates = await checkDuplicate(formData.phone, formData.full_name)
      
      if (duplicates.length > 0) {
        setMessageType('error')
        setMessage(`⚠️ Possible duplicate found! A patient named "${duplicates[0].full_name}" or with phone "${formData.phone}" already exists. Please verify before registering.`)
        setLoading(false)
        return
      }
      
      // Generate unique patient ID
      const patientId = generatePatientId()
      
      // Prepare data for database
      const patientData = {
        id: patientId,
        facility_code: 'KAB001', // Will be dynamic based on logged-in user
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth || null,
        phone: formData.phone || null,
        village: formData.village || null,
        district: formData.district || null,
        blood_group: formData.blood_group || null,
        allergies: formData.allergies || null,
        guardian_name: formData.guardian_name || null,
        guardian_phone: formData.guardian_phone || null,
        is_pregnant: formData.is_pregnant,
        consent_timestamp: new Date().toISOString(),
      }
      
      // Save to Supabase
      const { error } = await supabase
        .from('patients')
        .insert([patientData])
      
      if (error) {
        throw new Error(error.message)
      }
      
      // Success!
      setGeneratedId(patientId)
      setMessageType('success')
      setMessage(`✅ Patient registered successfully! ID: ${patientId}`)
      
      // Reset form
      setFormData({
        full_name: '',
        date_of_birth: '',
        phone: '',
        village: '',
        district: '',
        blood_group: '',
        allergies: '',
        guardian_name: '',
        guardian_phone: '',
        is_pregnant: false,
      })
      
    } catch (err: any) {
      setMessageType('error')
      setMessage(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
  <>
    <Navigation />
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
          <p className="text-gray-600">Patient Registration - SierraCare</p>
        </div>
        
        {/* Message display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 'bg-red-100 text-red-700 border border-red-400'
          }`}>
            {message}
          </div>
        )}
        
        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              placeholder="e.g., Fatmata Kamara"
            />
          </div>
          
          {/* Date of Birth */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
          
          {/* Phone Number */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              placeholder="e.g., 076123456"
            />
          </div>
          
          {/* Village */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Village / Town
            </label>
            <input
              type="text"
              name="village"
              value={formData.village}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              placeholder="e.g., Kabala Town"
            />
          </div>
          
          {/* District */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              District
            </label>
            <select
              name="district"
              value={formData.district}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            >
              <option value="">Select District</option>
              <option value="Kailahun">Kailahun</option>
              <option value="Kenema">Kenema</option>
              <option value="Kono">Kono</option>
              <option value="Bombali">Bombali</option>
              <option value="Kambia">Kambia</option>
              <option value="Koinadugu">Koinadugu</option>
              <option value="Tonkolili">Tonkolili</option>
              <option value="Port Loko">Port Loko</option>
              <option value="Western Area Urban">Western Area Urban</option>
              <option value="Western Area Rural">Western Area Rural</option>
              <option value="Bo">Bo</option>
              <option value="Bonthe">Bonthe</option>
              <option value="Pujehun">Pujehun</option>
              <option value="Moyamba">Moyamba</option>
            </select>
          </div>
          
          {/* Blood Group */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Blood Group
            </label>
            <select
              name="blood_group"
              value={formData.blood_group}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          
          {/* Allergies */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Allergies
            </label>
            <input
              type="text"
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              placeholder="e.g., Penicillin, Peanuts, None"
            />
          </div>
          
          {/* Guardian Name */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Guardian / Next of Kin
            </label>
            <input
              type="text"
              name="guardian_name"
              value={formData.guardian_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              placeholder="e.g., Mohamed Kamara"
            />
          </div>
          
          {/* Guardian Phone */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Guardian Phone
            </label>
            <input
              type="tel"
              name="guardian_phone"
              value={formData.guardian_phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              placeholder="e.g., 076123456"
            />
          </div>
          
          {/* Pregnancy Status */}
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_pregnant"
                checked={formData.is_pregnant}
                onChange={handleChange}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="ml-2 text-gray-700">Patient is pregnant</span>
            </label>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-medium ${
              loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
            } transition-colors`}
          >
            {loading ? 'Registering...' : 'Register Patient'}
          </button>
          
          {/* Consent Note */}
          <p className="text-xs text-gray-500 text-center mt-4">
            By registering, the patient consents to data collection and treatment per Ministry of Health guidelines.
          </p>
        </form>
      </div>
          </div>
    </>
  )
}