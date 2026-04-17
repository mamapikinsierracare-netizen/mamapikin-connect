// src/app/guides/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

type Guide = {
  id: string
  category: string
  title: string
  description: string
  content: string
  imageUrl?: string
  audioUrl?: string
  videoUrl?: string
  applicableTo: string[]
}

const guides: Guide[] = [
  // Danger Signs Guides
  { id: 'ds1', category: 'Danger Signs', title: 'Severe Headache', description: 'A severe headache that won\'t go away could be a sign of pre-eclampsia', content: 'Do NOT take any medication without consulting a doctor. Go to your nearest health facility IMMEDIATELY.', applicableTo: ['pregnant'], imageUrl: '/guides/danger-signs/headache.png' },
  { id: 'ds2', category: 'Danger Signs', title: 'Blurred Vision', description: 'Blurred vision or seeing spots/flashes of light is a sign of severe pre-eclampsia', content: 'Do NOT drive. Go to your nearest health facility IMMEDIATELY.', applicableTo: ['pregnant'], imageUrl: '/guides/danger-signs/blurred-vision.png' },
  { id: 'ds3', category: 'Danger Signs', title: 'Swelling of Hands and Face', description: 'Sudden swelling in your hands, face, or feet can be a sign of pre-eclampsia', content: 'Remove any tight rings or jewelry. Go to your nearest health facility IMMEDIATELY.', applicableTo: ['pregnant'], imageUrl: '/guides/danger-signs/swelling.png' },
  { id: 'ds4', category: 'Danger Signs', title: 'Fever', description: 'A fever during pregnancy could mean you have an infection', content: 'Drink plenty of water. Go to your nearest health facility TODAY.', applicableTo: ['pregnant', 'child'], imageUrl: '/guides/danger-signs/fever.png' },
  { id: 'ds5', category: 'Danger Signs', title: 'Reduced Fetal Movement', description: 'If your baby is moving less than usual, it could mean your baby is in distress', content: 'Lie on your left side for 1 hour. Count movements. If less than 10 movements → Go to hospital NOW.', applicableTo: ['pregnant'], imageUrl: '/guides/danger-signs/reduced-movement.png' },
  
  // Family Planning Guides
  { id: 'fp1', category: 'Family Planning', title: 'Family Planning Methods', description: 'Your options: pills, injection, implant, IUD, condoms', content: 'Ask your nurse which method is best for you. All methods are safe and effective.', applicableTo: ['breastfeeding'], imageUrl: '/guides/family-planning/methods.png' },
  { id: 'fp2', category: 'Family Planning', title: 'When to Start Family Planning', description: 'After delivery, you can start most methods immediately', content: 'For IUD or implant, wait 4-6 weeks. Ask your nurse.', applicableTo: ['breastfeeding'], imageUrl: '/guides/family-planning/when-to-start.png' },
  
  // Breastfeeding Guides
  { id: 'bf1', category: 'Breastfeeding', title: 'How to Breastfeed', description: 'Step-by-step guide to proper latching', content: 'Hold baby close. Touch baby\'s lips with nipple. Baby opens mouth wide, latch on. Baby\'s chin touches breast, nose free.', applicableTo: ['breastfeeding'], imageUrl: '/guides/breastfeeding/latch.png' },
  { id: 'bf2', category: 'Breastfeeding', title: 'Who Should Not Breastfeed', description: 'Medical conditions that may affect breastfeeding', content: 'If mother has HIV with high viral load or uses certain medications. In most cases, breastfeeding is safe and beneficial.', applicableTo: ['breastfeeding'], imageUrl: '/guides/breastfeeding/contraindications.png' },
  { id: 'bf3', category: 'Breastfeeding', title: 'How to Increase Breast Milk', description: 'Tips for increasing milk supply', content: 'Breastfeed frequently (every 2-3 hours). Drink plenty of fluids. Eat well. Rest. Avoid stress.', applicableTo: ['breastfeeding'], imageUrl: '/guides/breastfeeding/increase-milk.png' },
  
  // Nutrition Guides
  { id: 'n1', category: 'Nutrition', title: 'Foods to Eat During Pregnancy', description: 'Iron-rich and protein-rich foods', content: 'Iron-rich: beans, spinach, lean meat. Protein: fish, eggs, poultry. Fruits and vegetables. Drink plenty of water.', applicableTo: ['pregnant'], imageUrl: '/guides/nutrition/healthy-foods.png' },
  { id: 'n2', category: 'Nutrition', title: 'Foods to Avoid During Pregnancy', description: 'Foods that may harm you or your baby', content: 'Avoid raw meat, unpasteurised milk, raw eggs, liver, alcohol, and excessive caffeine.', applicableTo: ['pregnant'], imageUrl: '/guides/nutrition/foods-to-avoid.png' },
  { id: 'n3', category: 'Nutrition', title: 'Healthy Eating for Breastfeeding Mothers', description: 'Nutrition tips while breastfeeding', content: 'Eat a balanced diet with extra protein and fluids. Breastfeeding burns extra calories – eat when hungry.', applicableTo: ['breastfeeding'], imageUrl: '/guides/nutrition/breastfeeding-diet.png' },
  
  // Newborn Care Guides
  { id: 'nb1', category: 'Newborn Care', title: 'How to Bathe a Newborn', description: 'Step-by-step bathing guide', content: 'Use warm water. Support head. Wash gently. Keep cord dry and clean. No soap on face. Pat dry, dress warmly.', applicableTo: ['child'], imageUrl: '/guides/newborn/bathing.png' },
  { id: 'nb2', category: 'Newborn Care', title: 'Umbilical Cord Care', description: 'How to care for the umbilical cord stump', content: 'Keep cord clean and dry. Do not apply anything. If red, smelly, or oozing, see clinic.', applicableTo: ['child'], imageUrl: '/guides/newborn/cord-care.png' },
  { id: 'nb3', category: 'Newborn Care', title: 'Safe Sleeping', description: 'How to reduce the risk of SIDS', content: 'Place baby on back to sleep. Use a crib or clean surface. No soft toys or loose bedding. Room-share, not bed-share.', applicableTo: ['child'], imageUrl: '/guides/newborn/safe-sleep.png' },
  
  // Emergency First Aid Guides
  { id: 'fa1', category: 'Emergency First Aid', title: 'Choking (Infant)', description: 'How to help a choking infant under 1 year', content: '5 back blows (between shoulder blades), then 5 chest thrusts (two fingers). Repeat. If object not expelled, seek help.', applicableTo: ['child'], imageUrl: '/guides/first-aid/choking.png' },
  { id: 'fa2', category: 'Emergency First Aid', title: 'Burns', description: 'First aid for burns', content: 'Cool with running (not cold) water for 10-15 minutes. Cover with clean, dry cloth. Do not apply oil, butter, or toothpaste.', applicableTo: ['all'], imageUrl: '/guides/first-aid/burns.png' },
  { id: 'fa3', category: 'Emergency First Aid', title: 'Convulsions (Seizures)', description: 'What to do during a seizure', content: 'Place person on side (recovery position). Clear area of objects. Time the seizure. Do not put anything in mouth. Seek care immediately.', applicableTo: ['all'], imageUrl: '/guides/first-aid/convulsions.png' },
]

const categories = ['All', 'Danger Signs', 'Family Planning', 'Breastfeeding', 'Nutrition', 'Newborn Care', 'Emergency First Aid']

export default function GuidesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online')
  const [language, setLanguage] = useState<'English' | 'Krio' | 'Temne' | 'Mende'>('English')

  useEffect(() => {
    const handleOffline = () => setConnectionStatus('offline')
    const handleOnline = () => setConnectionStatus('online')
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const filteredGuides = guides.filter(guide => {
    if (selectedCategory !== 'All' && guide.category !== selectedCategory) return false
    if (searchTerm && !guide.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const handlePrint = () => {
    if (selectedGuide) {
      const printContent = `
        <html>
          <head>
            <title>${selectedGuide.title} - MamaPikin Connect</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #1a7a2e; padding-bottom: 10px; margin-bottom: 20px; }
              .title { font-size: 24px; color: #1a7a2e; }
              .content { margin: 20px 0; }
              .footer { text-align: center; font-size: 10px; color: #666; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">MamaPikin Connect</div>
              <div>${selectedGuide.title}</div>
            </div>
            <div class="content">
              <p>${selectedGuide.description}</p>
              <p>${selectedGuide.content}</p>
            </div>
            <div class="footer">
              MamaPikin Connect - Protecting Mothers and Children in Sierra Leone
            </div>
          </body>
        </html>
      `
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.print()
        printWindow.close()
      }
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">📚 Patient Education Guides</h1>
            <p className="text-gray-600">Health information you can trust – available offline</p>
            {connectionStatus === 'offline' && (
              <div className="mt-2 inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                📡 Offline Mode - All guides cached
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Language:</span>
                <div className="flex gap-2">
                  {(['English', 'Krio', 'Temne', 'Mende'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`px-3 py-1 rounded-lg text-sm ${language === lang ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {language !== 'English' && "⚠️ Partial translation - some content in English"}
              </div>
            </div>
          </div>

          {/* Search and Categories */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Search guides..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm ${selectedCategory === cat ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Guides Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map(guide => (
              <div
                key={guide.id}
                onClick={() => setSelectedGuide(guide)}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="h-32 bg-gradient-to-r from-green-400 to-teal-400 flex items-center justify-center">
                  <span className="text-5xl">
                    {guide.category === 'Danger Signs' ? '⚠️' :
                     guide.category === 'Family Planning' ? '👨‍👩‍👧' :
                     guide.category === 'Breastfeeding' ? '🤱' :
                     guide.category === 'Nutrition' ? '🍎' :
                     guide.category === 'Newborn Care' ? '🍼' : '📖'}
                  </span>
                </div>
                <div className="p-4">
                  <div className="text-xs text-green-600 mb-1">{guide.category}</div>
                  <h3 className="font-bold text-lg mb-2">{guide.title}</h3>
                  <p className="text-sm text-gray-600">{guide.description.substring(0, 100)}...</p>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {guide.applicableTo.includes('pregnant') && '🤰 '}
                      {guide.applicableTo.includes('breastfeeding') && '🤱 '}
                      {guide.applicableTo.includes('child') && '👶 '}
                    </span>
                    <span className="text-green-600 text-sm">Read more →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredGuides.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No guides found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Guide Detail Modal */}
      {selectedGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-sm text-green-600">{selectedGuide.category}</div>
                <h2 className="text-xl font-bold">{selectedGuide.title}</h2>
              </div>
              <button onClick={() => setSelectedGuide(null)} className="text-gray-400 text-2xl">×</button>
            </div>
            
            <div className="bg-gradient-to-r from-green-400 to-teal-400 h-40 rounded-lg flex items-center justify-center mb-4">
              <span className="text-6xl">
                {selectedGuide.category === 'Danger Signs' ? '⚠️' :
                 selectedGuide.category === 'Family Planning' ? '👨‍👩‍👧' :
                 selectedGuide.category === 'Breastfeeding' ? '🤱' :
                 selectedGuide.category === 'Nutrition' ? '🍎' :
                 selectedGuide.category === 'Newborn Care' ? '🍼' : '📖'}
              </span>
            </div>
            
            <div className="prose max-w-none">
              <p className="text-gray-700 mb-4">{selectedGuide.description}</p>
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <p className="font-bold">What to do:</p>
                <p>{selectedGuide.content}</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={handlePrint} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                🖨️ Print Guide
              </button>
              <button
                onClick={() => {
                  if (selectedGuide.audioUrl) {
                    const audio = new Audio(selectedGuide.audioUrl)
                    audio.play()
                  } else {
                    alert('Audio version coming soon')
                  }
                }}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                🔊 Listen (Krio)
              </button>
              <button
                onClick={() => {
                  navigator.share?.({
                    title: selectedGuide.title,
                    text: selectedGuide.description,
                    url: window.location.href
                  }).catch(() => alert('Share not supported'))
                }}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                📤 Share
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}