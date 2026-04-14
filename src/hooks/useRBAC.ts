// src/hooks/useRBAC.ts
import { useState, useEffect } from 'react'

export type UserRole = 
  | 'MASTER_ADMIN'
  | 'SUPER_ADMIN'
  | 'SYSTEM_ADMIN'
  | 'FACILITY_ADMIN'
  | 'SENIOR_DOCTOR'
  | 'DOCTOR'
  | 'SENIOR_NURSE'
  | 'NURSE'
  | 'MIDWIFE'
  | 'SENIOR_PHARMACIST'
  | 'PHARMACIST'
  | 'SENIOR_LAB_TECH'
  | 'LAB_TECHNICIAN'
  | 'DATA_ENTRY_OFFICER'
  | 'CHO'
  | 'CHW'
  | 'TBA'
  | 'PATIENT'
  | 'VIEWER'

export type User = {
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

// Role hierarchy levels (higher number = more permissions)
export const roleHierarchy: Record<UserRole, number> = {
  'MASTER_ADMIN': 100,
  'SUPER_ADMIN': 95,
  'SYSTEM_ADMIN': 90,
  'FACILITY_ADMIN': 85,
  'SENIOR_DOCTOR': 75,
  'DOCTOR': 70,
  'SENIOR_NURSE': 65,
  'NURSE': 60,
  'MIDWIFE': 60,
  'SENIOR_PHARMACIST': 55,
  'PHARMACIST': 50,
  'SENIOR_LAB_TECH': 55,
  'LAB_TECHNICIAN': 50,
  'DATA_ENTRY_OFFICER': 45,
  'CHO': 40,
  'CHW': 35,
  'TBA': 30,
  'PATIENT': 20,
  'VIEWER': 10
}

// Role display names for UI
export const roleDisplayNames: Record<UserRole, string> = {
  'MASTER_ADMIN': 'Master Administrator',
  'SUPER_ADMIN': 'Super Administrator (National)',
  'SYSTEM_ADMIN': 'System Administrator (District)',
  'FACILITY_ADMIN': 'Facility Administrator',
  'SENIOR_DOCTOR': 'Senior Doctor',
  'DOCTOR': 'Doctor',
  'SENIOR_NURSE': 'Senior Nurse',
  'NURSE': 'Nurse',
  'MIDWIFE': 'Midwife',
  'SENIOR_PHARMACIST': 'Senior Pharmacist',
  'PHARMACIST': 'Pharmacist',
  'SENIOR_LAB_TECH': 'Senior Lab Technician',
  'LAB_TECHNICIAN': 'Lab Technician',
  'DATA_ENTRY_OFFICER': 'Data Entry Officer',
  'CHO': 'Community Health Officer',
  'CHW': 'Community Health Worker',
  'TBA': 'Traditional Birth Attendant',
  'PATIENT': 'Patient',
  'VIEWER': 'Viewer (Read-Only)'
}

// Permission definitions
const permissions = {
  // ========== ADMINISTRATION ==========
  canManageUsers: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  canCreateAdmin: (role: UserRole): boolean => {
    return role === 'MASTER_ADMIN' || role === 'SUPER_ADMIN'
  },
  canDeleteAdmin: (role: UserRole): boolean => {
    return role === 'MASTER_ADMIN'
  },
  canAssignRoles: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(role)
  },
  
  // ========== PATIENT MANAGEMENT ==========
  canRegisterPatient: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 40 // DATA_ENTRY_OFFICER and above
  },
  canEditPatient: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 45 // DATA_ENTRY_OFFICER and above (with approval)
  },
  canEditPatientDirectly: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN', 'SENIOR_DOCTOR'].includes(role)
  },
  canDeletePatient: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  canViewPatient: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 35 // CHW and above
  },
  canViewSensitiveData: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 50 // NURSE/MIDWIFE and above
  },
  
  // ========== APPROVAL WORKFLOW ==========
  canApproveRequests: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN', 'SENIOR_DOCTOR'].includes(role)
  },
  canApproveUrgentRequests: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  canSubmitApprovalRequest: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 40
  },
  
  // ========== CLINICAL MODULES ==========
  canRecordANC: (role: UserRole): boolean => {
    return ['NURSE', 'MIDWIFE', 'DOCTOR', 'SENIOR_DOCTOR', 'SENIOR_NURSE', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canRecordPNC: (role: UserRole): boolean => {
    return ['NURSE', 'MIDWIFE', 'DOCTOR', 'SENIOR_DOCTOR', 'SENIOR_NURSE', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canRecordDelivery: (role: UserRole): boolean => {
    return ['MIDWIFE', 'DOCTOR', 'SENIOR_DOCTOR', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canRecordImmunisation: (role: UserRole): boolean => {
    return ['NURSE', 'MIDWIFE', 'DOCTOR', 'CHO', 'CHW', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  
  // ========== PHARMACY ==========
  canDispenseMedication: (role: UserRole): boolean => {
    return ['PHARMACIST', 'SENIOR_PHARMACIST', 'DOCTOR', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canManageInventory: (role: UserRole): boolean => {
    return ['PHARMACIST', 'SENIOR_PHARMACIST', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canAccessControlledSubstances: (role: UserRole): boolean => {
    return ['SENIOR_PHARMACIST', 'DOCTOR', 'SENIOR_DOCTOR', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  
  // ========== LABORATORY ==========
  canOrderLabTest: (role: UserRole): boolean => {
    return ['DOCTOR', 'SENIOR_DOCTOR', 'NURSE', 'MIDWIFE', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canProcessLabTest: (role: UserRole): boolean => {
    return ['LAB_TECHNICIAN', 'SENIOR_LAB_TECH', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canApproveLabResults: (role: UserRole): boolean => {
    return ['SENIOR_LAB_TECH', 'DOCTOR', 'SENIOR_DOCTOR', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  
  // ========== COMMUNITY HEALTH ==========
  canDoHomeVisits: (role: UserRole): boolean => {
    return ['CHO', 'CHW', 'NURSE', 'MIDWIFE'].includes(role)
  },
  canReferPatients: (role: UserRole): boolean => {
    return ['CHO', 'CHW', 'TBA', 'NURSE', 'MIDWIFE', 'DOCTOR', 'SENIOR_DOCTOR', 'FACILITY_ADMIN'].includes(role)
  },
  canTraceDefaulters: (role: UserRole): boolean => {
    return ['CHO', 'CHW', 'NURSE', 'DATA_ENTRY_OFFICER'].includes(role)
  },
  
  // ========== REPORTS & ANALYTICS ==========
  canViewReports: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 45
  },
  canExportData: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN', 'DATA_ENTRY_OFFICER'].includes(role)
  },
  canViewAuditLog: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  
  // ========== ACCOUNT MANAGEMENT ==========
  canCloseAccount: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  canReactivateAccount: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  
  // ========== SYSTEM CONFIGURATION ==========
  canConfigureSystem: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN'].includes(role)
  },
  canManageFacilities: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(role)
  },
  
  // ========== PATIENT SELF-SERVICE ==========
  canViewOwnRecord: (role: UserRole): boolean => {
    return role === 'PATIENT'
  },
  canGenerateEmergencyToken: (role: UserRole): boolean => {
    return role === 'PATIENT'
  }
}

export function useRBAC() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('current_user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      } else {
        // Default demo user - in production, this would come from login
        const demoUser: User = {
          id: 'demo-nurse-001',
          email: 'nurse@mamapikin.com',
          role: 'NURSE',
          full_name: 'Mariama Koroma',
          facility_code: 'KAB001',
          facility_name: 'Kabala District Hospital',
          district: 'Kabala',
          district_name: 'Kabala District',
          region: 'Northern',
          employee_id: 'EMP001',
          phone: '076123456',
          is_active: true,
          created_at: new Date().toISOString(),
          created_by: 'system',
          last_login: new Date().toISOString()
        }
        setUser(demoUser)
        localStorage.setItem('current_user', JSON.stringify(demoUser))
      }
      setLoading(false)
    }
    loadUser()
  }, [])

  const hasPermission = (permissionName: keyof typeof permissions): boolean => {
    if (!user) return false
    return permissions[permissionName](user.role)
  }

  const hasRoleLevel = (requiredLevel: number): boolean => {
    if (!user) return false
    return roleHierarchy[user.role] >= requiredLevel
  }

  const isAtLeast = (role: UserRole): boolean => {
    if (!user) return false
    return roleHierarchy[user.role] >= roleHierarchy[role]
  }

  // Convenience methods
  const canApprove = (): boolean => hasPermission('canApproveRequests')
  const canEdit = (): boolean => hasPermission('canEditPatient')
  const canEditDirectly = (): boolean => hasPermission('canEditPatientDirectly')
  const canDelete = (): boolean => hasPermission('canDeletePatient')
  const canClose = (): boolean => hasPermission('canCloseAccount')
  const isAdmin = (): boolean => {
    if (!user) return false
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(user.role)
  }
  const isMasterAdmin = (): boolean => user?.role === 'MASTER_ADMIN'
  const isSuperAdmin = (): boolean => user?.role === 'SUPER_ADMIN'
  const isSystemAdmin = (): boolean => user?.role === 'SYSTEM_ADMIN'
  const isFacilityAdmin = (): boolean => user?.role === 'FACILITY_ADMIN'
  const isClinicalStaff = (): boolean => {
    if (!user) return false
    return ['DOCTOR', 'SENIOR_DOCTOR', 'NURSE', 'SENIOR_NURSE', 'MIDWIFE'].includes(user.role)
  }

  return {
    user,
    loading,
    hasPermission,
    hasRoleLevel,
    isAtLeast,
    canApprove,
    canEdit,
    canEditDirectly,
    canDelete,
    canClose,
    isAdmin,
    isMasterAdmin,
    isSuperAdmin,
    isSystemAdmin,
    isFacilityAdmin,
    isClinicalStaff,
    roleHierarchy,
    roleDisplayNames,
    permissions
  }
}