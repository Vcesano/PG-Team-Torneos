// Tipos del esquema de Supabase. Si en el futuro se regeneran con
// `supabase gen types typescript`, se reemplaza este archivo.

export type Gender = 'M' | 'F'
export type EventStatus = 'draft' | 'open' | 'closed'
export type FightStatus = 'pending' | 'completed' | 'cancelled'
export type FightMethod = 'KO' | 'TKO' | 'DECISION' | 'DQ'
export type Role = 'admin' | 'profesor'

export interface Profile {
  id: string
  full_name: string
  role: Role
  active: boolean
  created_at: string
}

export interface Event {
  id: string
  name: string
  event_date: string
  location: string | null
  status: EventStatus
  created_by: string | null
  created_at: string
}

export interface Belt {
  id: string
  name: string
  color_hex: string
  order_index: number
}

export interface Modality {
  id: string
  name: string
  active: boolean
}

export interface PaymentStatus {
  id: string
  name: string
  is_paid: boolean
  order_index: number
}

export interface WeightCategory {
  id: string
  name: string
  min_kg: number
  max_kg: number
  gender: 'M' | 'F' | 'ANY'
  age_min: number
  age_max: number
}

export interface Student {
  id: string
  profesor_id: string
  full_name: string
  dni: string
  birth_date: string
  gender: Gender
  phone: string | null
  email: string | null
  current_belt_id: string | null
  active: boolean
  created_at: string
}

export interface Registration {
  id: string
  event_id: string
  student_id: string
  weight_kg: number
  fight_count: number
  belt_id: string
  modality_id: string
  weight_category_id: string | null
  payment_status_id: string
  amount_paid: number
  notes: string | null
  created_at: string
}

export interface Fight {
  id: string
  event_id: string
  fight_number: number
  red_registration_id: string
  blue_registration_id: string
  modality_id: string
  weight_category_id: string | null
  status: FightStatus
  winner_registration_id: string | null
  method: FightMethod | null
  round: number | null
  notes: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; full_name: string }; Update: Partial<Profile> }
      events: { Row: Event; Insert: Partial<Event> & { name: string; event_date: string }; Update: Partial<Event> }
      belts: { Row: Belt; Insert: Partial<Belt> & { name: string; color_hex: string; order_index: number }; Update: Partial<Belt> }
      modalities: { Row: Modality; Insert: Partial<Modality> & { name: string }; Update: Partial<Modality> }
      payment_statuses: { Row: PaymentStatus; Insert: Partial<PaymentStatus> & { name: string; is_paid: boolean; order_index: number }; Update: Partial<PaymentStatus> }
      weight_categories: { Row: WeightCategory; Insert: Partial<WeightCategory> & { name: string; min_kg: number; max_kg: number; gender: 'M' | 'F' | 'ANY'; age_min: number; age_max: number }; Update: Partial<WeightCategory> }
      students: { Row: Student; Insert: Partial<Student> & { profesor_id: string; full_name: string; dni: string; birth_date: string; gender: Gender }; Update: Partial<Student> }
      registrations: { Row: Registration; Insert: Partial<Registration> & { event_id: string; student_id: string; weight_kg: number; fight_count: number; belt_id: string; modality_id: string; payment_status_id: string }; Update: Partial<Registration> }
      fights: { Row: Fight; Insert: Partial<Fight> & { event_id: string; fight_number: number; red_registration_id: string; blue_registration_id: string; modality_id: string }; Update: Partial<Fight> }
    }
  }
}
