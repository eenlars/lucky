/**
 * Population test fixtures - re-exports from central coreMocks
 * This file maintains backward compatibility while consolidating mocks
 */

export {
  createMockEvolutionSettings,
  createSingleMockGenome as createMockGenome,
  createMockGenomes,
  getMockRunService,
} from "@core/utils/__tests__/setup/coreMocks"
