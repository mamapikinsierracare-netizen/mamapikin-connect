// src/hooks/useRBAC.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

// Helper to convert string role to UserRole type
function toUserRole(roleStr: string): UserRole {
  if (roleHierarchy.hasOwnProperty(roleStr)) {
    return roleStr as UserRole;
  }
  // Default to CHW if unknown
  return 'CHW';
}

// Permission definitions (same as before, keep as is)
const permissions = {
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
  canRegisterPatient: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 40
  },
  canEditPatient: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 45
  },
  canEditPatientDirectly: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN', 'SENIOR_DOCTOR'].includes(role)
  },
  canDeletePatient: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  canViewPatient: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 35
  },
  canViewSensitiveData: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 50
  },
  canApproveRequests: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN', 'SENIOR_DOCTOR'].includes(role)
  },
  canApproveUrgentRequests: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  canSubmitApprovalRequest: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 40
  },
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
  canDispenseMedication: (role: UserRole): boolean => {
    return ['PHARMACIST', 'SENIOR_PHARMACIST', 'DOCTOR', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canManageInventory: (role: UserRole): boolean => {
    return ['PHARMACIST', 'SENIOR_PHARMACIST', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canAccessControlledSubstances: (role: UserRole): boolean => {
    return ['SENIOR_PHARMACIST', 'DOCTOR', 'SENIOR_DOCTOR', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canOrderLabTest: (role: UserRole): boolean => {
    return ['DOCTOR', 'SENIOR_DOCTOR', 'NURSE', 'MIDWIFE', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canProcessLabTest: (role: UserRole): boolean => {
    return ['LAB_TECHNICIAN', 'SENIOR_LAB_TECH', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canApproveLabResults: (role: UserRole): boolean => {
    return ['SENIOR_LAB_TECH', 'DOCTOR', 'SENIOR_DOCTOR', 'FACILITY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(role)
  },
  canDoHomeVisits: (role: UserRole): boolean => {
    return ['CHO', 'CHW', 'NURSE', 'MIDWIFE'].includes(role)
  },
  canReferPatients: (role: UserRole): boolean => {
    return ['CHO', 'CHW', 'TBA', 'NURSE', 'MIDWIFE', 'DOCTOR', 'SENIOR_DOCTOR', 'FACILITY_ADMIN'].includes(role)
  },
  canTraceDefaulters: (role: UserRole): boolean => {
    return ['CHO', 'CHW', 'NURSE', 'DATA_ENTRY_OFFICER'].includes(role)
  },
  canViewReports: (role: UserRole): boolean => {
    return roleHierarchy[role] >= 45
  },
  canExportData: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN', 'DATA_ENTRY_OFFICER'].includes(role)
  },
  canViewAuditLog: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  canCloseAccount: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  canReactivateAccount: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(role)
  },
  canConfigureSystem: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN'].includes(role)
  },
  canManageFacilities: (role: UserRole): boolean => {
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(role)
  },
  canViewOwnRecord: (role: UserRole): boolean => {
    return role === 'PATIENT'
  },
  canGenerateEmergencyToken: (role: UserRole): boolean => {
    return role === 'PATIENT'
  }
}

export function useRBAC() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      
      // Get the current Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        console.warn('No active session, user not logged in');
        setUser(null);
        setLoading(false);
        return;
      }
      
      const supabaseUser = session.user;
      const metadata = supabaseUser.user_metadata || {};
      const roleStr = metadata.role || 'CHW'; // Default to CHW if no role set
      const role = toUserRole(roleStr);
      
      // Build the custom User object from auth data
      const customUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role: role,
        full_name: metadata.full_name || metadata.name || supabaseUser.email?.split('@')[0] || 'User',
        facility_code: metadata.facility_code || null,
        facility_name: metadata.facility_name || null,
        district: metadata.district || null,
        district_name: metadata.district_name || null,
        region: metadata.region || null,
        employee_id: metadata.employee_id || null,
        phone: metadata.phone || null,
        is_active: true,
        created_at: supabaseUser.created_at || new Date().toISOString(),
        created_by: null,
        last_login: supabaseUser.last_sign_in_at || new Date().toISOString()
      };
      
      setUser(customUser);
      setLoading(false);
    };
    
    loadUser();
    
    // Optional: Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Reload user on auth change
        loadUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (permissionName: keyof typeof permissions): boolean => {
    if (!user) return false;
    return permissions[permissionName](user.role);
  };

  const hasRoleLevel = (requiredLevel: number): boolean => {
    if (!user) return false;
    return roleHierarchy[user.role] >= requiredLevel;
  };

  const isAtLeast = (role: UserRole): boolean => {
    if (!user) return false;
    return roleHierarchy[user.role] >= roleHierarchy[role];
  };

  // Convenience methods
  const canApprove = (): boolean => hasPermission('canApproveRequests');
  const canEdit = (): boolean => hasPermission('canEditPatient');
  const canEditDirectly = (): boolean => hasPermission('canEditPatientDirectly');
  const canDelete = (): boolean => hasPermission('canDeletePatient');
  const canClose = (): boolean => hasPermission('canCloseAccount');
  const isAdmin = (): boolean => {
    if (!user) return false;
    return ['MASTER_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'FACILITY_ADMIN'].includes(user.role);
  };
  const isMasterAdmin = (): boolean => user?.role === 'MASTER_ADMIN';
  const isSuperAdmin = (): boolean => user?.role === 'SUPER_ADMIN';
  const isSystemAdmin = (): boolean => user?.role === 'SYSTEM_ADMIN';
  const isFacilityAdmin = (): boolean => user?.role === 'FACILITY_ADMIN';
  const isClinicalStaff = (): boolean => {
    if (!user) return false;
    return ['DOCTOR', 'SENIOR_DOCTOR', 'NURSE', 'SENIOR_NURSE', 'MIDWIFE'].includes(user.role);
  };

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
  };
}