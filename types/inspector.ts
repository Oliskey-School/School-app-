import { School } from '../types';

export type InspectionStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
export type InspectionItemStatus = 'Pass' | 'Fail' | 'N/A';

export interface InspectionItem {
  id: string;
  inspection_id: string;
  category: string;
  item_name: string;
  status: InspectionItemStatus;
  findings: string | null;
  created_at: string;
}

export interface Inspection {
  id: string;
  school_id: string;
  inspector_id: string;
  status: InspectionStatus;
  inspection_type?: string; // e.g., 'Routine', 'Follow-up', 'Emergency'
  risk_level?: 'High' | 'Medium' | 'Low';
  overall_rating?: string; 
  summary?: string;
  recommendations?: string;
  digital_signature_url?: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  branch_id: string | null;
  
  // Joined fields
  school?: School;
  items?: InspectionItem[];
  responses?: InspectionResponse[];
  photos?: InspectionPhoto[];
  domain_scores?: InspectionDomainScore[];
  is_escalated?: boolean;
}

export interface InspectionResponse {
  id: string;
  inspection_id: string;
  school_id: string;
  field_id: string;
  field_label?: string;
  response_value: string;
  response_type: string;
  created_at: string;
}

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  school_id: string;
  field_id: string;
  photo_url: string;
  annotation_data?: any;
  captured_at: string;
}

export interface InspectionDomainScore {
  id: string;
  inspection_id: string;
  school_id: string;
  domain_name: string;
  domain_score: number;
  max_score: number;
  created_at: string;
}

export interface InspectionTemplate {
  id: string;
  inspection_type: string;
  schema: InspectionSchema;
  version: number;
  is_active: boolean;
}

export interface InspectionSchema {
  sections: {
    id: string;
    title: string;
    domain?: string;
    weight?: number;
    fields: InspectionField[];
  }[];
}

export interface InspectionField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'dropdown' | 'multi_select' | 'score_slider' | 'photo_capture' | 'signature_pad' | 'date' | 'textarea';
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  hidden_by_default?: boolean;
  on_fail?: {
    show_fields: string[];
  };
  on_value?: {
    value: any;
    show_fields: string[];
  };
}

export interface InspectorProfile {
  id: string;
  user_id: string;
  full_name: string;
  inspector_code: string;
  region: string;
  ministry_department: string;
  avatar_url?: string;
  jurisdiction_ids: string[]; // List of school IDs or region IDs
  created_at: string;
  updated_at: string;
}

export interface InspectorStats {
  totalInspections: number;
  completedInspections: number;
  scheduledInspections: number;
  schoolsInspected: number;
  averageRating: number;
  monthlyTrends: { month: string; count: number }[];
  categoryPerformance: { category: string; passRate: number }[];
}

export interface SIPItem {
  id: string;
  school_id: string;
  issue: string;
  recommendation: string;
  deadline: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'High' | 'Medium' | 'Low';
}

export interface TeacherNominalSummary {
  total: number;
  qualified: number;
  unqualified: number;
  flagged_count: number;
}

export interface FacilitySummary {
  id: string;
  name: string;
  type: string;
  status: 'Operational' | 'Maintenance Required' | 'Non-Operational';
  last_inspected_at: string | null;
}

export interface SchoolProfile extends School {
  proprietor_name?: string;
  registration_number?: string;
  curriculum_type?: string;
  enrolment_total?: number;
  contact_phone?: string;
  contact_email?: string;
  lga?: string;
  last_wse_score?: number;
  gaps_grade?: string;
  risk_level?: 'High' | 'Medium' | 'Low';
  
  // Relations
  inspection_history: Inspection[];
  sip_items: SIPItem[];
  teacher_summary: TeacherNominalSummary;
  facility_summary: FacilitySummary[];
}

export interface SchoolFilter {
  type?: string[];
  status?: string[];
  grade?: string[];
  risk?: string[];
  search?: string;
}
