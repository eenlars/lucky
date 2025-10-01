/**
 * Tool Registry - Re-exports from @lucky/tools
 *
 * This file provides backward compatibility by re-exporting
 * tools from the @lucky/tools package.
 */

import { toolGroups } from "@lucky/tools"

/**
 * All tools from all groups, flattened into a single array
 */
export const ALL_TOOLS = toolGroups.groups.flatMap(group => group.tools.map(t => t.toolFunc))
