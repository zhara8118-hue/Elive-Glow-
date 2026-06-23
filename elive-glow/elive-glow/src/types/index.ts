export type Role = 'owner' | 'manager';
export type CustomerType = 'new' | 'returning';
export type PaymentType = 'cash' | 'card';
export type AppointmentStatus = 'upcoming' | 'confirmed' | 'completed' | 'cancelled' | 'past';
export type UserStatus = 'invited' | 'active' | 'inactive';

export interface Branch {
  id: string;
  name: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  branch_id: string | null;
  photo_url: string | null;
  status: UserStatus;
  invited_at: string | null;
  created_at: string;
  updated_at: string;
  branch?: Branch;
}

export interface StaffMember {
  id: string;
  branch_id: string;
  name: string;
  photo_url: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  branch?: Branch;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  branch_id: string;
  name: string;
  contact_number: string | null;
  first_visit: string | null;
  last_visit: string | null;
  visit_count: number;
  created_at: string;
  updated_at: string;
  branch?: Branch;
}

export interface ModificationLog {
  modified_by: string;
  modified_by_name: string;
  modified_at: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
}

export interface SaleTransaction {
  id: string;
  branch_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_contact: string | null;
  customer_type: CustomerType;
  service_name: string;
  amount: number;
  payment_type: PaymentType;
  staff_id: string | null;
  sale_date: string;
  created_by: string | null;
  is_modified: boolean;
  modification_log: ModificationLog | null;
  created_at: string;
  updated_at: string;
  branch?: Branch;
  staff?: StaffMember;
}

export interface Expense {
  id: string;
  branch_id: string;
  category_id: string;
  amount: number;
  expense_date: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branch?: Branch;
  category?: ExpenseCategory;
}

export interface Appointment {
  id: string;
  branch_id: string;
  customer_name: string;
  customer_contact: string | null;
  service: string;
  staff_id: string | null;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branch?: Branch;
  staff?: StaffMember;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  branch_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  branch?: Branch;
}

export interface Service {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface KPIData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  customerCount: number;
  cashSales: number;
  cardSales: number;
  newCustomers: number;
  returningCustomers: number;
}

export interface DateFilter {
  from: string;
  to: string;
  preset?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}
