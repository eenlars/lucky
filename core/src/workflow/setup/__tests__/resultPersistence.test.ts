import { persistWorkflow } from "@core/utils/persistence/file/resultPersistence"
import { getDefaultModels } from "@core/utils/spending/defaultModels"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { PATHS } from "@runtime/settings/constants"
import * as fs from "fs/promises"
import * as path from "path"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest"

describe("resultPersistence", () => {
  const testWorkflowConfig: WorkflowConfig = {
    entryNodeId: "test-node-1",
    nodes: [
      {
        nodeId: "test-node-1",
        systemPrompt: "Test prompt",
        handOffs: ["end"],
        codeTools: [],
        mcpTools: [],
        description: "Test node",
        modelName: getDefaultModels().default,
      },
    ],
  }

  const testFileName = "test-persistence.json"

  // use a test-specific directory to avoid touching the real setup file
  const TEST_DIR = path.join(PATHS.node.logging, "test-persistence")
  const TEST_SETUP_FILE = path.join(TEST_DIR, "test-setupfile.json")

  // save original setupFile path
  const originalSetupFile = PATHS.setupFile
  // The actual directory where files are saved is hardcoded in persistWorkflow
  const actualOutDir = path.dirname(PATHS.setupFile) // This resolves correctly
  const actualBackupDir = path.join(PATHS.node.logging, "backups")

  beforeAll(async () => {
    // create test directory
    await fs.mkdir(TEST_DIR, { recursive: true })

    // override PATHS.setupFile to point to test directory
    Object.defineProperty(PATHS, "setupFile", {
      value: TEST_SETUP_FILE,
      writable: true,
      configurable: true,
    })
  })

  afterAll(async () => {
    // restore original setupFile path
    Object.defineProperty(PATHS, "setupFile", {
      value: originalSetupFile,
      writable: true,
      configurable: true,
    })

    // final cleanup of test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true })
    } catch {
      // ignore errors
    }

    // cleanup any test files in actual directories
    await cleanupActualDirs()
  })

  // helper function to check if file exists
  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  // helper to clean up files in actual directories
  async function cleanupActualDirs() {
    // clean up test files from actual OUT_DIR - only specific test files
    const testFiles = [
      path.join(actualOutDir, testFileName),
      // DO NOT delete actual setupfile.json - only test files
    ]

    // Add all possible concurrent test files (be thorough)
    for (let i = 0; i < 10; i++) {
      testFiles.push(path.join(actualOutDir, `concurrent-test-${i}.json`))
    }

    // Only delete specific test files, never entire directories
    for (const file of testFiles) {
      try {
        const stats = await fs.stat(file)
        if (stats.isFile()) {
          await fs.unlink(file)
        }
      } catch {
        // ignore if doesn't exist or not accessible
      }
    }

    // clean up backup files - only specific test file backups
    try {
      const backupFiles = await fs.readdir(actualBackupDir)
      const testBackups = backupFiles.filter(
        (f) =>
          f.startsWith(`${testFileName}_`) ||
          // DO NOT delete setupfile.json backups - only test file backups
          f.match(
            /concurrent-test-\d+\.json_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z\.json/
          )
      )

      // Only delete specific backup files, never entire directories
      for (const backup of testBackups) {
        try {
          const backupPath = path.join(actualBackupDir, backup)
          const stats = await fs.stat(backupPath)
          if (stats.isFile()) {
            await fs.unlink(backupPath)
          }
        } catch {
          // ignore if doesn't exist or not accessible
        }
      }
    } catch {
      // backup dir might not exist, that's ok
    }
  }

  // helper function to clean up test files
  async function cleanupTestFiles() {
    // clean up the entire test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true })
    } catch {
      // directory might not exist, that's ok
    }

    // also clean up actual directories
    await cleanupActualDirs()
  }

  beforeEach(async () => {
    // ensure clean state before each test
    await cleanupTestFiles()
    // recreate test directory
    await fs.mkdir(TEST_DIR, { recursive: true })
  })

  afterEach(async () => {
    // clean up after each test
    await cleanupTestFiles()
  })

  describe("persistWorkflow", () => {
    it("should save workflow config to the specified file", async () => {
      await persistWorkflow(testWorkflowConfig, testFileName)

      // check that the file was created in the actual OUT_DIR
      const filePath = path.join(actualOutDir, testFileName)
      expect(await fileExists(filePath)).toBe(true)

      // verify content
      const content = await fs.readFile(filePath, "utf-8")
      const parsed = JSON.parse(content)
      expect(parsed).toEqual(testWorkflowConfig)
    })

    it("should save workflow config to test setupfile", async () => {
      await persistWorkflow(testWorkflowConfig, testFileName)

      // check that file was created in the actual setup directory
      const filePath = path.join(actualOutDir, testFileName)
      expect(await fileExists(filePath)).toBe(true)

      // verify content
      const content = await fs.readFile(filePath, "utf-8")
      const parsed = JSON.parse(content)
      expect(parsed).toEqual(testWorkflowConfig)
    })

    it("should create a timestamped backup file", async () => {
      await persistWorkflow(testWorkflowConfig, testFileName)

      // check that backup directory has files
      const backupFiles = await fs.readdir(actualBackupDir)
      const backupName = path.basename(testFileName, path.extname(testFileName))
      const testBackups = backupFiles.filter((f) =>
        f.startsWith(`${backupName}_`)
      )

      expect(testBackups.length).toBeGreaterThan(0)

      // verify backup content
      const backupPath = path.join(actualBackupDir, testBackups[0])
      const content = await fs.readFile(backupPath, "utf-8")
      const parsed = JSON.parse(content)
      expect(parsed).toEqual(testWorkflowConfig)
    })

    it("should use default filename when not specified", async () => {
      await persistWorkflow(testWorkflowConfig)

      // check that setupfile.json was created in the actual setup directory
      const filePath = path.join(actualOutDir, "setupfile.json")
      expect(await fileExists(filePath)).toBe(true)

      // verify content
      const content = await fs.readFile(filePath, "utf-8")
      const parsed = JSON.parse(content)
      expect(parsed).toEqual(testWorkflowConfig)
    })

    it("should overwrite existing files", async () => {
      const firstConfig = { ...testWorkflowConfig, entryNodeId: "first-node" }
      const secondConfig = { ...testWorkflowConfig, entryNodeId: "second-node" }

      // save first config
      await persistWorkflow(firstConfig, testFileName)

      // save second config
      await persistWorkflow(secondConfig, testFileName)

      // verify file contains second config
      const filePath = path.join(actualOutDir, testFileName)
      const content = await fs.readFile(filePath, "utf-8")
      const parsed = JSON.parse(content)
      expect(parsed.entryNodeId).toBe("second-node")
    })

    it("should handle complex workflow configs", async () => {
      const complexConfig: WorkflowConfig = {
        entryNodeId: "starter",
        nodes: [
          {
            nodeId: "starter",
            systemPrompt: "Complex test prompt with special chars: {}[]\"'",
            handOffs: ["processor", "validator"],
            codeTools: [],
            mcpTools: [],
            description: "Starter node",
            modelName: getDefaultModels().default,
          },
          {
            nodeId: "processor",
            systemPrompt: "Process data",
            handOffs: ["end"],
            codeTools: [],
            mcpTools: [],
            description: "Processor node",
            modelName: getDefaultModels().default,
          },
        ],
      }

      await persistWorkflow(complexConfig, testFileName)

      // verify complex config is saved correctly
      const filePath = path.join(actualOutDir, testFileName)
      const content = await fs.readFile(filePath, "utf-8")
      const parsed = JSON.parse(content)
      expect(parsed).toEqual(complexConfig)
    })
  })

  describe("file deletion", () => {
    it("should be able to delete saved files", async () => {
      // save a file
      await persistWorkflow(testWorkflowConfig, testFileName)

      const filePath = path.join(actualOutDir, testFileName)
      expect(await fileExists(filePath)).toBe(true)

      // delete the file
      await fs.unlink(filePath)

      // verify it's deleted
      expect(await fileExists(filePath)).toBe(false)
    })

    it("should handle deletion of non-existent files gracefully", async () => {
      const nonExistentPath = path.join(actualOutDir, "non-existent.json")

      // this should not throw
      try {
        await fs.unlink(nonExistentPath)
      } catch (error: any) {
        expect(error.code).toBe("ENOENT")
      }
    })
  })

  describe("concurrent operations", () => {
    it("should handle multiple concurrent saves", async () => {
      const configs = Array.from({ length: 5 }, (_, i) => ({
        ...testWorkflowConfig,
        entryNodeId: `node-${i}`,
      }))

      // save all configs concurrently
      await Promise.all(
        configs.map((config, i) =>
          persistWorkflow(config, `concurrent-test-${i}.json`)
        )
      )

      // verify all files exist
      for (let i = 0; i < configs.length; i++) {
        const filePath = path.join(actualOutDir, `concurrent-test-${i}.json`)
        expect(await fileExists(filePath)).toBe(true)

        const content = await fs.readFile(filePath, "utf-8")
        const parsed = JSON.parse(content)
        expect(parsed.entryNodeId).toBe(`node-${i}`)
      }

      // cleanup concurrent files after verification
      for (let i = 0; i < configs.length; i++) {
        try {
          const filePath = path.join(actualOutDir, `concurrent-test-${i}.json`)
          await fs.unlink(filePath)
        } catch (error) {
          // ignore if file doesn't exist or can't be deleted
        }
      }
    })
  })
})
