import { NextRequest, NextResponse } from 'next/server'
import { ensureWorkflowExists, saveWorkflowVersion } from '@/trace-visualization/db/Workflow/retrieveWorkflow'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      dsl,
      commitMessage,
      workflowId,
      parentId,
      iterationBudget = 50,
      timeBudgetSeconds = 3600,
    } = body

    // Validate required fields
    if (!dsl || !commitMessage || !workflowId) {
      return NextResponse.json(
        { error: 'Missing required fields: dsl, commitMessage, or workflowId' },
        { status: 400 }
      )
    }

    // Ensure workflow exists in database
    await ensureWorkflowExists(commitMessage, workflowId)

    // Save the workflow version
    const newWorkflowVersion = await saveWorkflowVersion({
      dsl,
      commitMessage,
      workflowId,
      parentId,
      iterationBudget,
      timeBudgetSeconds,
    })

    return NextResponse.json({
      success: true,
      data: newWorkflowVersion,
    })
  } catch (error) {
    console.error('Error saving workflow version:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to save workflow version',
      },
      { status: 500 }
    )
  }
}