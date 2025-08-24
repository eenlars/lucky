#!/usr/bin/env bun

import { supabase } from "./core/src/utils/clients/supabase/client"

async function checkRecords() {
  console.log("Checking DatasetRecord table...")
  
  const { data, error } = await supabase
    .from("DatasetRecord")
    .select("*")
    .limit(10)

  if (error) {
    console.error("Error:", error)
    return
  }

  console.log("Found records:", data?.length || 0)
  if (data && data.length > 0) {
    console.log("Sample records:")
    data.forEach(record => {
      console.log(`- ID: ${record.dataset_record_id}`)
      console.log(`  Input: ${record.workflow_input}`)
      console.log(`  Truth: ${record.ground_truth}`)
      console.log()
    })
  }
}

checkRecords().catch(console.error)