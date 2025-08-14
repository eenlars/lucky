import type { RubricCriteria } from "../types/evaluation"

export function validateRubricCriteria(criteria: RubricCriteria): string[] {
  const errors: string[] = []
  
  if (!criteria.name.trim()) {
    errors.push("Criterion name cannot be empty")
  }
  
  if (criteria.maxPoints < 1) {
    errors.push("Points must be at least 1")
  }
  
  if (criteria.maxPoints > 100) {
    errors.push("Points cannot exceed 100")
  }
  
  if (criteria.achievedPoints !== null) {
    if (criteria.achievedPoints < 0) {
      errors.push("Achieved points cannot be negative")
    }
    
    if (criteria.achievedPoints > criteria.maxPoints) {
      errors.push("Achieved points cannot exceed max points")
    }
  }
  
  return errors
}

export function validateTask(task: string): string | null {
  if (!task.trim()) {
    return "Task description is required"
  }
  
  if (task.length < 10) {
    return "Task description should be at least 10 characters"
  }
  
  if (task.length > 1000) {
    return "Task description cannot exceed 1000 characters"
  }
  
  return null
}

export function sanitizeInput(input: string): string {
  // Remove any potentially harmful characters while preserving formatting
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .trim()
}

export function isValidWorkflowId(id: string): boolean {
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}