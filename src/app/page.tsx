import Navigation from '@/components/Navigation'
import Link from 'next/link'

export default async function Home() {
  // Note: Since this is a server component, we can't use localStorage here
  // The pending sync count will be handled by a client component inside
  
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-green-600 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">MamaPikin Connect</h1>
            <p className="text-xl mb-2">Protecting Mothers and Children in Sierra Leone</p>
            <p className="text-green-100">Prɔtɛktin Mama ɛn Pikin na Salone</p>
          </div>
        </div>
        
        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">System Modules</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Patient Registration Card */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Patient Registration</h3>
              <p className="text-gray-600 mb-4">Register pregnant women, mothers, and children under five.</p>
              <a href="/register" className="text-green-600 hover:text-green-700 font-medium">Register Patient →</a>
            </div>
            
            {/* Sync Queue Card - NEW */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-2 border-blue-300">
              <div className="text-4xl mb-3">🔄</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Sync Queue</h3>
              <p className="text-gray-600 mb-4">Sync offline patients to cloud. Select individual or all pending records.</p>
              <a href="/sync" className="text-blue-600 hover:text-blue-700 font-medium">Sync Data →</a>
            </div>
            
            {/* ANC Card */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-3">🤰</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Antenatal Care (ANC)</h3>
              <p className="text-gray-600 mb-4">Record pregnancy visits, vitals, and danger signs with automatic alerts.</p>
              <a href="/anc" className="text-green-600 hover:text-green-700 font-medium">Record ANC Visit →</a>
            </div>
            
            {/* PNC Card - NEW */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-3">👩‍👧</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Postnatal Care (PNC)</h3>
              <p className="text-gray-600 mb-4">Record mother and baby postnatal visits with EPDS screening.</p>
              <a href="/pnc" className="text-green-600 hover:text-green-700 font-medium">Record PNC Visit →</a>
            </div>
            
            {/* Delivery Card - NEW */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-3">👶</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Labour & Delivery</h3>
              <p className="text-gray-600 mb-4">Record delivery information, APGAR scores, and PPH risk assessment.</p>
              <a href="/delivery" className="text-green-600 hover:text-green-700 font-medium">Record Delivery →</a>
            </div>
            
            {/* Immunisation Card */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-3">💉</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Immunisation Tracking</h3>
              <p className="text-gray-600 mb-4">Track vaccines per Sierra Leone EPI schedule with due date alerts.</p>
              <a href="/immunisation" className="text-green-600 hover:text-green-700 font-medium">Record Vaccine →</a>
            </div>
          </div>
        </div>
        
        {/* Quick Actions Bar - NEW */}
        <div className="bg-blue-50 py-6 border-t border-b border-blue-200">
          <div className="max-w-6xl mx-auto px-4">
            <h3 className="text-lg font-bold text-blue-800 mb-3 text-center">⚡ Quick Actions</h3>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="/register" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">➕ Register Patient</a>
              <a href="/sync" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">🔄 Sync Offline Data</a>
              <a href="/anc" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition">🤰 ANC Visit</a>
              <a href="/delivery" className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">👶 Record Delivery</a>
              <a href="/scheduler" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">📅 Scheduler</a>
            </div>
          </div>
        </div>
        
        {/* Statistics Section */}
        <div className="bg-white py-12 mt-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">System Features</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4">
                <div className="text-3xl mb-2">📋</div>
                <div className="font-bold text-gray-800">Registration</div>
                <div className="text-sm text-gray-500">3 methods</div>
              </div>
              <div className="p-4">
                <div className="text-3xl mb-2">⚠️</div>
                <div className="font-bold text-gray-800">Danger Alerts</div>
                <div className="text-sm text-gray-500">Automatic RED alerts</div>
              </div>
              <div className="p-4">
                <div className="text-3xl mb-2">📱</div>
                <div className="font-bold text-gray-800">Offline-First</div>
                <div className="text-sm text-gray-500">Works without internet</div>
              </div>
              <div className="p-4">
                <div className="text-3xl mb-2">🔒</div>
                <div className="font-bold text-gray-800">Secure</div>
                <div className="text-sm text-gray-500">Patient data protected</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="bg-green-800 text-white py-6 mt-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p>MamaPikin Connect (SierraCare) - Protecting Mothers and Children in Sierra Leone</p>
            <p className="text-green-300 text-sm mt-2">Ministry of Health Approved | Offline-First | Enterprise-Grade</p>
          </div>
        </footer>
      </div>
    </>
  )
}