// src/app/admin/users/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useRBAC, UserRole, roleDisplayNames, roleHierarchy } from '@/hooks/useRBAC'

type User = {
  id: string
  email: string
  role: UserRole
  full_name: string
  facility_code: string | null
  facility_name: string | null
  district: string | null
  district_name: string | null
  region: string | null
  employee_id: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  created_by: string | null
  last_login: string | null
}

type NewUser = {
  email: string
  full_name: string
  role: UserRole
  facility_code: string
  district: string
  phone: string
  employee_id: string
}

async function isSupabaseReachable(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return false
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?limit=1`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    return response.ok
  } catch { return false }
}

async function fetchUsers(): Promise<User[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const users: User[] = []
  
  const localUsers = localStorage.getItem('system_users')
  if (localUsers) {
    const parsed = JSON.parse(localUsers)
    users.push(...parsed)
  }
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/user_roles?order=created_at.desc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudUsers = await response.json()
        const existingIds = new Set(users.map(u => u.id))
        cloudUsers.forEach((u: User) => {
          if (!existingIds.has(u.id)) {
            users.push(u)
          }
        })
      }
    } catch { /* ignore */ }
  }
  
  if (users.length === 0) {
    const demoUsers: User[] = [
      {
        id: 'user-master-001',
        email: 'master@mamapikin.com',
        role: 'MASTER_ADMIN',
        full_name: 'Master Administrator',
        facility_code: null,
        facility_name: null,
        district: null,
        district_name: null,
        region: null,
        employee_id: 'ADM001',
        phone: '076000001',
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: 'system',
        last_login: null
      },
      {
        id: 'user-super-001',
        email: 'super@mamapikin.com',
        role: 'SUPER_ADMIN',
        full_name: 'Super Administrator',
        facility_code: null,
        facility_name: null,
        district: null,
        district_name: null,
        region: null,
        employee_id: 'ADM002',
        phone: '076000002',
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: 'master',
        last_login: null
      },
      {
        id: 'user-system-001',
        email: 'system@mamapikin.com',
        role: 'SYSTEM_ADMIN',
        full_name: 'System Administrator',
        facility_code: null,
        facility_name: null,
        district: 'Kabala',
        district_name: 'Kabala District',
        region: 'Northern',
        employee_id: 'ADM003',
        phone: '076000003',
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: 'super',
        last_login: null
      },
      {
        id: 'user-facility-001',
        email: 'facility@mamapikin.com',
        role: 'FACILITY_ADMIN',
        full_name: 'Facility Administrator',
        facility_code: 'KAB001',
        facility_name: 'Kabala District Hospital',
        district: 'Kabala',
        district_name: 'Kabala District',
        region: 'Northern',
        employee_id: 'ADM004',
        phone: '076000004',
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: 'system',
        last_login: null
      },
      {
        id: 'user-nurse-001',
        email: 'nurse@mamapikin.com',
        role: 'NURSE',
        full_name: 'Mariama Koroma',
        facility_code: 'KAB001',
        facility_name: 'Kabala District Hospital',
        district: 'Kabala',
        district_name: 'Kabala District',
        region: 'Northern',
        employee_id: 'NUR001',
        phone: '076123456',
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: 'facility',
        last_login: null
      },
      {
        id: 'user-doctor-001',
        email: 'doctor@mamapikin.com',
        role: 'DOCTOR',
        full_name: 'Dr. James Sesay',
        facility_code: 'KAB001',
        facility_name: 'Kabala District Hospital',
        district: 'Kabala',
        district_name: 'Kabala District',
        region: 'Northern',
        employee_id: 'DOC001',
        phone: '076123457',
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: 'facility',
        last_login: null
      }
    ]
    users.push(...demoUsers)
    localStorage.setItem('system_users', JSON.stringify(demoUsers))
  }
  
  return users
}

async function saveUser(user: {
  email: string
  full_name: string
  role: UserRole
  facility_code: string | null
  facility_name: string | null
  district: string | null
  district_name: string | null
  region: string | null
  employee_id: string | null
  phone: string | null
  is_active: boolean
  last_login: string | null
}): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const newUser: User = {
    ...user,
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString(),
    created_by: 'admin'
  }
  
  const existing = localStorage.getItem('system_users')
  const users = existing ? JSON.parse(existing) : []
  users.push(newUser)
  localStorage.setItem('system_users', JSON.stringify(users))
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      })
      return response.ok
    } catch { return false }
  }
  
  return true
}

async function updateUserStatus(userId: string, isActive: boolean): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const existing = localStorage.getItem('system_users')
  if (existing) {
    const users = JSON.parse(existing)
    const updated = users.map((u: User) =>
      u.id === userId ? { ...u, is_active: isActive } : u
    )
    localStorage.setItem('system_users', JSON.stringify(updated))
  }
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/user_roles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      })
      return response.ok
    } catch { return false }
  }
  
  return true
}

async function updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const existing = localStorage.getItem('system_users')
  if (existing) {
    const users = JSON.parse(existing)
    const updated = users.map((u: User) =>
      u.id === userId ? { ...u, role: newRole } : u
    )
    localStorage.setItem('system_users', JSON.stringify(updated))
  }
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/user_roles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })
      return response.ok
    } catch { return false }
  }
  
  return true
}

async function deleteUser(userId: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const existing = localStorage.getItem('system_users')
  if (existing) {
    const users = JSON.parse(existing)
    const updated = users.filter((u: User) => u.id !== userId)
    localStorage.setItem('system_users', JSON.stringify(updated))
  }
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/user_roles?id=eq.${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      })
      return response.ok
    } catch { return false }
  }
  
  return true
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function getRoleBadgeColor(role: UserRole): string {
  if (role === 'MASTER_ADMIN') return 'bg-purple-100 text-purple-800'
  if (role === 'SUPER_ADMIN') return 'bg-indigo-100 text-indigo-800'
  if (role === 'SYSTEM_ADMIN') return 'bg-blue-100 text-blue-800'
  if (role === 'FACILITY_ADMIN') return 'bg-cyan-100 text-cyan-800'
  if (role.includes('SENIOR')) return 'bg-teal-100 text-teal-800'
  if (role === 'DOCTOR') return 'bg-emerald-100 text-emerald-800'
  if (role === 'NURSE' || role === 'MIDWIFE') return 'bg-green-100 text-green-800'
  if (role === 'PHARMACIST') return 'bg-lime-100 text-lime-800'
  if (role === 'LAB_TECHNICIAN') return 'bg-amber-100 text-amber-800'
  if (role === 'DATA_ENTRY_OFFICER') return 'bg-orange-100 text-orange-800'
  if (role === 'CHO' || role === 'CHW') return 'bg-yellow-100 text-yellow-800'
  if (role === 'TBA') return 'bg-rose-100 text-rose-800'
  if (role === 'PATIENT') return 'bg-gray-100 text-gray-800'
  if (role === 'VIEWER') return 'bg-slate-100 text-slate-800'
  return 'bg-gray-100 text-gray-800'
}

function getAvailableRoles(currentUserRole: UserRole): UserRole[] {
  const allRoles: UserRole[] = [
    'MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN',
    'SENIOR_DOCTOR', 'DOCTOR', 'SENIOR_NURSE', 'NURSE', 'MIDWIFE',
    'SENIOR_PHARMACIST', 'PHARMACIST', 'SENIOR_LAB_TECH', 'LAB_TECHNICIAN',
    'DATA_ENTRY_OFFICER', 'CHO', 'CHW', 'TBA', 'VIEWER'
  ]
  
  const currentLevel = roleHierarchy[currentUserRole]
  return allRoles.filter(role => roleHierarchy[role] <= currentLevel)
}

export default function UserManagementPage() {
  const { user, isAdmin, isMasterAdmin, hasPermission } = useRBAC()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    full_name: '',
    role: 'VIEWER',
    facility_code: '',
    district: '',
    phone: '',
    employee_id: ''
  })

  // Check if user can manage users
  const canManageUsers = hasPermission('canManageUsers')

  // Load users - wrapped in useCallback with no dependencies to maintain stability
  const loadUsers = useCallback(async () => {
    setLoading(true)
    const allUsers = await fetchUsers()
    setUsers(allUsers)
    setLoading(false)
  }, [])

  // Load users on mount and when permission changes
  useEffect(() => {
    if (canManageUsers) {
      loadUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageUsers]) // Intentionally not including loadUsers to avoid re-triggering

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    
    if (!newUser.email || !newUser.full_name) {
      setMessage('❌ Email and Full Name are required')
      setMessageType('error')
      return
    }
    
    const success = await saveUser({
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role,
      facility_code: newUser.facility_code || null,
      facility_name: null,
      district: newUser.district || null,
      district_name: null,
      region: null,
      employee_id: newUser.employee_id || null,
      phone: newUser.phone || null,
      is_active: true,
      last_login: null
    })
    
    if (success) {
      setMessage('✅ User created successfully')
      setMessageType('success')
      setShowCreateModal(false)
      setNewUser({
        email: '',
        full_name: '',
        role: 'VIEWER',
        facility_code: '',
        district: '',
        phone: '',
        employee_id: ''
      })
      loadUsers()
    } else {
      setMessage('❌ Failed to create user')
      setMessageType('error')
    }
    
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleToggleStatus(userId: string, currentStatus: boolean) {
    const success = await updateUserStatus(userId, !currentStatus)
    if (success) {
      setMessage(`✅ User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      setMessageType('success')
      loadUsers()
    } else {
      setMessage('❌ Failed to update user status')
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const success = await updateUserRole(userId, newRole)
    if (success) {
      setMessage(`✅ User role updated to ${roleDisplayNames[newRole]}`)
      setMessageType('success')
      loadUsers()
    } else {
      setMessage('❌ Failed to update user role')
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      const success = await deleteUser(userId)
      if (success) {
        setMessage(`✅ User "${userName}" deleted successfully`)
        setMessageType('success')
        loadUsers()
      } else {
        setMessage('❌ Failed to delete user')
        setMessageType('error')
      }
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const filteredUsers = users.filter(u => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchesSearch = u.full_name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.employee_id && u.employee_id.toLowerCase().includes(term))
      if (!matchesSearch) return false
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    return true
  })

  if (!canManageUsers && !loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-red-100 text-red-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p>You do not have permission to manage users. Only Administrators can access this page.</p>
              <Link href="/" className="text-green-600 underline mt-4 inline-block">Return to Dashboard</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  const availableRoles = user ? getAvailableRoles(user.role) : []

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-green-700">User Management</h1>
              <p className="text-gray-600">Manage system users and their roles</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <span className="text-xl">+</span> Add New User
            </button>
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-800' :
              messageType === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}
          
          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or employee ID..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Filter by Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="all">All Roles</option>
                  {availableRoles.map(role => (
                    <option key={role} value={role}>{roleDisplayNames[role]}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadUsers}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
          
          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No users found.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-green-600 underline mt-2"
                >
                  Create your first user →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facility/District</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{u.full_name}</div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                          {u.phone && <div className="text-xs text-gray-400">{u.phone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-1 rounded-full text-xs inline-block w-fit ${getRoleBadgeColor(u.role)}`}>
                              {roleDisplayNames[u.role]}
                            </span>
                            {isAdmin() && u.role !== 'MASTER_ADMIN' && (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                className="text-xs border rounded px-1 py-0.5"
                              >
                                {availableRoles.map(role => (
                                  <option key={role} value={role}>{roleDisplayNames[role]}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {u.facility_name || u.facility_code || '-'}
                          {u.district && <div className="text-xs text-gray-400">District: {u.district}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm">{u.employee_id || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleStatus(u.id, u.is_active)}
                              className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            {isMasterAdmin() && u.role !== 'MASTER_ADMIN' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.full_name)}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Stats Footer */}
          <div className="mt-4 text-sm text-gray-500 text-center">
            Total Users: {filteredUsers.length} | Active: {filteredUsers.filter(u => u.is_active).length} | Inactive: {filteredUsers.filter(u => !u.is_active).length}
          </div>
        </div>
      </div>
      
      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Create New User</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleCreateUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., Mariama Koroma"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="user@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {availableRoles.map(role => (
                        <option key={role} value={role}>{roleDisplayNames[role]}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Facility Code</label>
                    <input
                      type="text"
                      value={newUser.facility_code}
                      onChange={(e) => setNewUser({ ...newUser, facility_code: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., KAB001"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">District</label>
                    <input
                      type="text"
                      value={newUser.district}
                      onChange={(e) => setNewUser({ ...newUser, district: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., Kabala"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={newUser.employee_id}
                      onChange={(e) => setNewUser({ ...newUser, employee_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., NUR001"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., 076123456"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}