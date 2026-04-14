// src/lib/permissions.ts

import { UserRole, roleHierarchy } from '@/types/rbac'

// Permission definitions
export const permissions = {
  // ========== ADMINISTRATION ==========
  canManageUsers: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  canCreateAdmin: (role: UserRole): boolean => {
    return role === 'MASTER_ADMIN' || role === 'SUPER_ADMIN'
  },
  canDeleteAdmin: (role: UserRole): boolean => {
    return role === 'MASTER_ADMIN' // Only Master Admin can delete admins
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
    return roleHierarchy[role] >= 40 // Most staff can submit requests
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
    return roleHierarchy[role] >= 45 // DATA_ENTRY_OFFICER and above
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

// Helper function to check if user has a certain role level
export const hasRoleLevel = (userRole: UserRole, requiredLevel: number): boolean => {
  return roleHierarchy[userRole] >= requiredLevel
}

// Helper to get accessible data scope based on role
export const getDataScope = (role: UserRole): 'national' | 'district' | 'facility' | 'assigned_only' | 'self' => {
  switch(role) {
    case 'MASTER_ADMIN':
    case 'SUPER_ADMIN':
      return 'national'
    case 'SYSTEM_ADMIN':
      return 'district'
    case 'FACILITY_ADMIN':
    case 'SENIOR_DOCTOR':
    case 'SENIOR_NURSE':
    case 'SENIOR_PHARMACIST':
    case 'SENIOR_LAB_TECH':
      return 'facility'
    case 'DOCTOR':
    case 'NURSE':
    case 'MIDWIFE':
    case 'PHARMACIST':
    case 'LAB_TECHNICIAN':
    case 'DATA_ENTRY_OFFICER':
    case 'CHO':
      return 'assigned_only'
    case 'CHW':
    case 'TBA':
      return 'assigned_only'
    case 'PATIENT':
      return 'self'
    case 'VIEWER':
      return 'assigned_only'
    default:
      return 'assigned_only'
  }
}