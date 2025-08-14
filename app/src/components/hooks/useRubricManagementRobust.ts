import { useState, useEffect, useCallback, useRef } from "react"
import type { RubricCriteria } from "../types/evaluation"
import { DEFAULT_CRITERIA } from "../types/evaluation"
import { createRubricString, calculateTotalMaxPoints, calculateTotalAchievedPoints, hasResults, generateFakeScores } from "../utils/rubric-utils"
import { validateRubricCriteria } from "../utils/validation"
import { useDebounce } from "./useDebounce"

const STORAGE_KEY_PREFIX = "workflow-rubric-"
const MAX_CRITERIA = 20
const MIN_CRITERIA = 1

export function useRubricManagementRobust(
  ioId: string, 
  updateCase: (id: string, updates: Record<string, unknown>) => void
) {
  // Load from localStorage or use defaults
  const loadStoredCriteria = useCallback((): RubricCriteria[] => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${ioId}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (error) {
      console.error("Failed to load stored criteria:", error)
    }
    return DEFAULT_CRITERIA
  }, [ioId])

  const [criteria, setCriteria] = useState<RubricCriteria[]>(loadStoredCriteria)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Version tracking to prevent race conditions
  const updateVersionRef = useRef(0)
  
  // Debounced criteria for auto-save
  const debouncedCriteria = useDebounce(criteria, 500)

  const totalMaxPoints = calculateTotalMaxPoints(criteria)
  const totalAchievedPoints = calculateTotalAchievedPoints(criteria)
  const hasRubricResults = hasResults(criteria)

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${ioId}`, JSON.stringify(criteria))
    } catch (error) {
      console.error("Failed to save criteria to localStorage:", error)
    }
  }, [criteria, ioId])

  // Auto-save rubric with debouncing
  useEffect(() => {
    if (debouncedCriteria.length === 0) return
    
    const currentVersion = ++updateVersionRef.current
    const rubricString = createRubricString(debouncedCriteria)
    
    setIsUpdating(true)
    
    // Prevent concurrent updates
    const timeoutId = setTimeout(() => {
      if (currentVersion === updateVersionRef.current) {
        updateCase(ioId, { expected: rubricString })
        setIsUpdating(false)
      }
    }, 100)
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [debouncedCriteria, ioId, updateCase])

  const validateAllCriteria = useCallback((criteriaList: RubricCriteria[]) => {
    const errors: Record<string, string[]> = {}
    criteriaList.forEach(criterion => {
      const criterionErrors = validateRubricCriteria(criterion)
      if (criterionErrors.length > 0) {
        errors[criterion.id] = criterionErrors
      }
    })
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [])

  const addCriteria = useCallback(() => {
    if (criteria.length >= MAX_CRITERIA) {
      alert(`Maximum ${MAX_CRITERIA} criteria allowed`)
      return
    }
    
    const newId = `criterion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newCriterion: RubricCriteria = {
      id: newId,
      name: "",
      maxPoints: 5,
      achievedPoints: null
    }
    
    setCriteria(prev => [...prev, newCriterion])
  }, [criteria.length])

  const updateCriteria = useCallback((id: string, updates: Partial<RubricCriteria>) => {
    setCriteria(prev => {
      const updated = prev.map(c => {
        if (c.id !== id) return c
        
        const updatedCriterion = { ...c, ...updates }
        
        // Validate max points
        if (updates.maxPoints !== undefined) {
          updatedCriterion.maxPoints = Math.max(1, Math.min(100, updates.maxPoints))
        }
        
        // Validate achieved points
        if (updates.achievedPoints !== undefined && updates.achievedPoints !== null) {
          updatedCriterion.achievedPoints = Math.max(
            0, 
            Math.min(updatedCriterion.maxPoints, updates.achievedPoints)
          )
        }
        
        return updatedCriterion
      })
      
      validateAllCriteria(updated)
      return updated
    })
  }, [validateAllCriteria])

  const removeCriteria = useCallback((id: string) => {
    if (criteria.length <= MIN_CRITERIA) {
      alert(`At least ${MIN_CRITERIA} criterion is required`)
      return
    }
    
    setCriteria(prev => {
      const filtered = prev.filter(c => c.id !== id)
      validateAllCriteria(filtered)
      return filtered
    })
  }, [criteria.length, validateAllCriteria])

  const simulateRubricResults = useCallback(() => {
    setCriteria(prev => generateFakeScores(prev))
  }, [])

  const resetCriteria = useCallback(() => {
    setCriteria(DEFAULT_CRITERIA)
    setValidationErrors({})
  }, [])

  const clearStoredData = useCallback(() => {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${ioId}`)
    } catch (error) {
      console.error("Failed to clear stored criteria:", error)
    }
  }, [ioId])

  return {
    criteria,
    setCriteria,
    totalMaxPoints,
    totalAchievedPoints,
    hasRubricResults,
    addCriteria,
    updateCriteria,
    removeCriteria,
    simulateRubricResults,
    createRubricString: () => createRubricString(criteria),
    validationErrors,
    isUpdating,
    resetCriteria,
    clearStoredData,
    isValid: Object.keys(validationErrors).length === 0
  }
}