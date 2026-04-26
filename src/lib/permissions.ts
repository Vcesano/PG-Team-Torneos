import type { Profile, Student } from './database.types'

export const isAdmin = (profile: Profile | null) => profile?.role === 'admin'

export const canEditStudent = (profile: Profile | null, student: Pick<Student, 'profesor_id'>) => {
  if (!profile) return false
  return profile.role === 'admin' || profile.id === student.profesor_id
}
