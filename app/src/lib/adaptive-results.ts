export const ADAPTIVE_RESULTS = {
  timestamp: "2025-07-21T09:41:33.388Z",
  experimentType: "adaptive-tool-usage",
  scenarios: [
    {
      id: "basic-failure",
      prompt:
        "Please fetch 5 objects with the query 'item' and return the combined results.",
      expectedBehavior:
        "Should try fetch_objects(item, 5), fail, then adapt by splitting into smaller requests",
      expectedFinalCount: 5,
    },
    {
      id: "larger-request",
      prompt:
        "I need 8 objects with the query 'product'. Please get them and combine the results.",
      expectedBehavior:
        "Should fail initially, then make multiple smaller requests to reach 8 total",
      expectedFinalCount: 8,
    },
    {
      id: "within-limit",
      prompt: "Can you fetch 2 objects with the query 'sample' for me?",
      expectedBehavior: "Should work on first try since 2 <= 3",
      expectedFinalCount: 2,
    },
  ],
  results: [
    {
      model: "gpt-3.5-turbo",
      scenario: "basic-failure",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 3,
          },
          result: ["item_object_1", "item_object_2", "item_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 2,
          },
          result: ["item_object_1", "item_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "item_object_1,item_object_2,item_object_3",
              "item_object_1,item_object_2",
            ],
          },
          result: {
            total_count: 2,
            combined_items: [
              "item_object_1,item_object_2,item_object_3",
              "item_object_1,item_object_2",
            ],
            summary: "Successfully combined 2 items",
          },
          success: true,
        },
      ],
      finalResponse:
        "The combined results of fetching 5 objects with the query 'item' are: \n- item_object_1\n- item_object_2\n- item_object_3",
      success: true,
      adaptiveBehavior: {
        initialFailure: true,
        retryAttempts: 2,
        successfulStrategy: true,
        finalObjectCount: 5,
        hadCombineCall: true,
        totalToolCalls: 4,
      },
    },
    {
      model: "gpt-3.5-turbo",
      scenario: "basic-failure",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 3,
          },
          result: ["item_object_1", "item_object_2", "item_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 2,
          },
          result: ["item_object_1", "item_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "item_object_1",
              "item_object_2",
              "item_object_3",
              "item_object_1",
              "item_object_2",
            ],
          },
          result: {
            total_count: 5,
            combined_items: [
              "item_object_1",
              "item_object_2",
              "item_object_3",
              "item_object_1",
              "item_object_2",
            ],
            summary: "Successfully combined 5 items",
          },
          success: true,
        },
      ],
      finalResponse:
        "I have fetched 5 objects with the query 'item' and combined the results.",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 1,
        successfulStrategy: true,
        finalObjectCount: 5,
        hadCombineCall: true,
        totalToolCalls: 3,
      },
    },
    {
      model: "gpt-3.5-turbo",
      scenario: "larger-request",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 4,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 4,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 4,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 4,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 4,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
      ],
      finalResponse:
        "It seems that I am unable to fetch the objects with the query 'product' at the moment. If you have another query or different request, please let me know how I can assist you further.",
      success: true,
      adaptiveBehavior: {
        initialFailure: true,
        retryAttempts: 5,
        successfulStrategy: false,
        finalObjectCount: 0,
        hadCombineCall: false,
        totalToolCalls: 6,
      },
    },
    {
      model: "gpt-3.5-turbo",
      scenario: "larger-request",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 3,
          },
          result: ["product_object_1", "product_object_2", "product_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 3,
          },
          result: ["product_object_1", "product_object_2", "product_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 2,
          },
          result: ["product_object_1", "product_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "product_object_1",
              "product_object_2",
              "product_object_3",
              "product_object_1",
              "product_object_2",
            ],
          },
          result: {
            total_count: 5,
            combined_items: [
              "product_object_1",
              "product_object_2",
              "product_object_3",
              "product_object_1",
              "product_object_2",
            ],
            summary: "Successfully combined 5 items",
          },
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "product_object_1",
              "product_object_2",
              "product_object_3",
            ],
          },
          result: {
            total_count: 3,
            combined_items: [
              "product_object_1",
              "product_object_2",
              "product_object_3",
            ],
            summary: "Successfully combined 3 items",
          },
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: ["product_object_1", "product_object_2"],
          },
          result: {
            total_count: 2,
            combined_items: ["product_object_1", "product_object_2"],
            summary: "Successfully combined 2 items",
          },
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "product_object_1",
              "product_object_2",
              "product_object_3",
              "product_object_1",
              "product_object_2",
            ],
          },
          result: {
            total_count: 5,
            combined_items: [
              "product_object_1",
              "product_object_2",
              "product_object_3",
              "product_object_1",
              "product_object_2",
            ],
            summary: "Successfully combined 5 items",
          },
          success: true,
        },
      ],
      finalResponse:
        "I have combined the results of the 8 objects with the query 'product'. The combined result is ready for display.",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 2,
        successfulStrategy: true,
        finalObjectCount: 8,
        hadCombineCall: true,
        totalToolCalls: 7,
      },
    },
    {
      model: "gpt-3.5-turbo",
      scenario: "within-limit",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "sample",
            count: 2,
          },
          result: ["sample_object_1", "sample_object_2"],
          success: true,
        },
      ],
      finalResponse:
        "I have fetched 2 objects with the query 'sample' for you. The objects are named 'sample_object_1' and 'sample_object_2'.",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 0,
        successfulStrategy: true,
        finalObjectCount: 2,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-3.5-turbo",
      scenario: "within-limit",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "sample",
            count: 2,
          },
          result: ["sample_object_1", "sample_object_2"],
          success: true,
        },
      ],
      finalResponse:
        "I have fetched 2 objects with the query 'sample'. The objects are: `sample_object_1` and `sample_object_2`.",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 0,
        successfulStrategy: true,
        finalObjectCount: 2,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-4o-mini",
      scenario: "basic-failure",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "object",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "thing",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
      ],
      finalResponse:
        "It appears that all attempts to fetch objects using various queries have failed. Unfortunately, I am unable to retrieve the requested information at the moment. \n\nIf you have a different query or specific criteria in mind, please let me know, and I can try again.",
      success: true,
      adaptiveBehavior: {
        initialFailure: true,
        retryAttempts: 3,
        successfulStrategy: false,
        finalObjectCount: 0,
        hadCombineCall: false,
        totalToolCalls: 4,
      },
    },
    {
      model: "gpt-4o-mini",
      scenario: "basic-failure",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 3,
          },
          result: ["item_object_1", "item_object_2", "item_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 2,
          },
          result: ["item_object_1", "item_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "item_object_1,item_object_2,item_object_3",
              "item_object_1,item_object_2",
            ],
          },
          result: {
            total_count: 2,
            combined_items: [
              "item_object_1,item_object_2,item_object_3",
              "item_object_1,item_object_2",
            ],
            summary: "Successfully combined 2 items",
          },
          success: true,
        },
      ],
      finalResponse:
        "The combined results for the query 'item' are as follows:\n\n- item_object_1\n- item_object_2\n- item_object_3\n- item_object_1\n- item_object_2\n\n(Note: item_object_1 and item_object_2 appear more than once in the combined results.)",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 1,
        successfulStrategy: true,
        finalObjectCount: 5,
        hadCombineCall: true,
        totalToolCalls: 3,
      },
    },
    {
      model: "gpt-4o-mini",
      scenario: "larger-request",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "goods",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product listing",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "inventory",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "items for sale",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "available products",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "merchandise",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
      ],
      finalResponse:
        "It seems that attempts to fetch objects with various related queries have all failed. Unfortunately, I'm unable to retrieve the requested items at this time. If you have a different query or specific criteria for the objects you need, please let me know, and I'll try again.",
      success: true,
      adaptiveBehavior: {
        initialFailure: true,
        retryAttempts: 7,
        successfulStrategy: false,
        finalObjectCount: 0,
        hadCombineCall: false,
        totalToolCalls: 8,
      },
    },
    {
      model: "gpt-4o-mini",
      scenario: "larger-request",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 3,
          },
          result: ["product_object_1", "product_object_2", "product_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 3,
          },
          result: ["product_object_1", "product_object_2", "product_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 2,
          },
          result: ["product_object_1", "product_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2",
            ],
          },
          result: {
            total_count: 3,
            combined_items: [
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2",
            ],
            summary: "Successfully combined 3 items",
          },
          success: true,
        },
      ],
      finalResponse:
        "I have successfully fetched and combined the results for your query on 'product'. The combined output is as follows:\n\n- product_object_1\n- product_object_2\n- product_object_3\n- product_object_1\n- product_object_2\n- product_object_3\n- product_object_1\n- product_object_2\n\nIf you need further assistance or a different query, let me know!",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 2,
        successfulStrategy: true,
        finalObjectCount: 8,
        hadCombineCall: true,
        totalToolCalls: 4,
      },
    },
    {
      model: "gpt-4o-mini",
      scenario: "within-limit",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "sample",
            count: 2,
          },
          result: ["sample_object_1", "sample_object_2"],
          success: true,
        },
      ],
      finalResponse:
        "I have fetched the objects for you: \n\n1. sample_object_1\n2. sample_object_2\n\nLet me know if you need anything else!",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 0,
        successfulStrategy: true,
        finalObjectCount: 2,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-4o-mini",
      scenario: "within-limit",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "sample",
            count: 2,
          },
          result: ["sample_object_1", "sample_object_2"],
          success: true,
        },
      ],
      finalResponse:
        "I fetched the following two objects for the query 'sample':\n1. sample_object_1\n2. sample_object_2",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 0,
        successfulStrategy: true,
        finalObjectCount: 2,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-4-turbo",
      scenario: "basic-failure",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "combine_results",
          args: {
            results: [],
          },
          result: {
            total_count: 0,
            combined_items: [],
            summary: "Successfully combined 0 items",
          },
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
      ],
      finalResponse:
        "It seems there's an issue fetching objects with the query 'item'. Let's adjust the parameters or the query. Please let me know if there's a specific type or category of 'item' you're interested in, or any other detail that might help refine the search.",
      success: true,
      adaptiveBehavior: {
        initialFailure: true,
        retryAttempts: 1,
        successfulStrategy: false,
        finalObjectCount: 0,
        hadCombineCall: true,
        totalToolCalls: 3,
      },
    },
    {
      model: "gpt-4-turbo",
      scenario: "basic-failure",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 3,
          },
          result: ["item_object_1", "item_object_2", "item_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 2,
          },
          result: ["item_object_1", "item_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "item_object_1,item_object_2,item_object_3",
              "item_object_1,item_object_2",
            ],
          },
          result: {
            total_count: 2,
            combined_items: [
              "item_object_1,item_object_2,item_object_3",
              "item_object_1,item_object_2",
            ],
            summary: "Successfully combined 2 items",
          },
          success: true,
        },
      ],
      finalResponse:
        "The five objects fetched with the query 'item' have been successfully retrieved and combined. Here are the details:\n\n1. item_object_1\n2. item_object_2\n3. item_object_3\n4. item_object_1\n5. item_object_2\n\nPlease let me know if you need more information or further assistance!",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 1,
        successfulStrategy: true,
        finalObjectCount: 5,
        hadCombineCall: true,
        totalToolCalls: 3,
      },
    },
    {
      model: "gpt-4-turbo",
      scenario: "larger-request",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "combine_results",
          args: {
            results: [],
          },
          result: {
            total_count: 0,
            combined_items: [],
            summary: "Successfully combined 0 items",
          },
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
      ],
      finalResponse:
        "I am having trouble fetching objects with the query 'product'. It seems there might be an issue with the parameters or system. Could you please provide more specific details about the products you are looking for, or should I attempt a different query?",
      success: true,
      adaptiveBehavior: {
        initialFailure: true,
        retryAttempts: 1,
        successfulStrategy: false,
        finalObjectCount: 0,
        hadCombineCall: true,
        totalToolCalls: 3,
      },
    },
    {
      model: "gpt-4-turbo",
      scenario: "larger-request",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 3,
          },
          result: ["product_object_1", "product_object_2", "product_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 3,
          },
          result: ["product_object_1", "product_object_2", "product_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 2,
          },
          result: ["product_object_1", "product_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2",
            ],
          },
          result: {
            total_count: 3,
            combined_items: [
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2",
            ],
            summary: "Successfully combined 3 items",
          },
          success: true,
        },
      ],
      finalResponse:
        "Here are the 8 product objects combined as requested:\n\n- product_object_1\n- product_object_2\n- product_object_3\n- product_object_1\n- product_object_2\n- product_object_3\n- product_object_1\n- product_object_2\n\nIf you need any more details about these products or further assistance, let me know!",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 2,
        successfulStrategy: true,
        finalObjectCount: 8,
        hadCombineCall: true,
        totalToolCalls: 4,
      },
    },
    {
      model: "gpt-4-turbo",
      scenario: "within-limit",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "sample",
            count: 2,
          },
          result: ["sample_object_1", "sample_object_2"],
          success: true,
        },
      ],
      finalResponse:
        "I have fetched 2 objects for you with the query 'sample':\n\n1. sample_object_1\n2. sample_object_2",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 0,
        successfulStrategy: true,
        finalObjectCount: 2,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-4-turbo",
      scenario: "within-limit",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "sample",
            count: 2,
          },
          result: ["sample_object_1", "sample_object_2"],
          success: true,
        },
      ],
      finalResponse:
        'I have fetched 2 objects with the query "sample" for you:\n\n1. sample_object_1\n2. sample_object_2',
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 0,
        successfulStrategy: true,
        finalObjectCount: 2,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-4.1",
      scenario: "basic-failure",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
      ],
      finalResponse:
        "It appears there was an error processing your request. Could you please confirm or refine your query parameters, or let me know if you’d like to try again with different details?",
      success: true,
      adaptiveBehavior: {
        initialFailure: true,
        retryAttempts: 0,
        successfulStrategy: false,
        finalObjectCount: 0,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-4.1",
      scenario: "basic-failure",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 3,
          },
          result: ["item_object_1", "item_object_2", "item_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 2,
          },
          result: ["item_object_1", "item_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "item_object_1,item_object_2,item_object_3",
              "item_object_1,item_object_2",
            ],
          },
          result: {
            total_count: 2,
            combined_items: [
              "item_object_1,item_object_2,item_object_3",
              "item_object_1,item_object_2",
            ],
            summary: "Successfully combined 2 items",
          },
          success: true,
        },
      ],
      finalResponse:
        'I have fetched 5 objects with the query "item" and combined the results. If you would like to see details about these objects or their specific content, please specify which ones or what information you need!',
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 1,
        successfulStrategy: true,
        finalObjectCount: 5,
        hadCombineCall: true,
        totalToolCalls: 3,
      },
    },
    {
      model: "gpt-4.1",
      scenario: "larger-request",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
      ],
      finalResponse:
        'It appears there was an issue processing your request for 8 objects with the query "product." Could you please confirm if you want specific types of products or provide any additional details? I can then attempt your request again or adjust the parameters for better results.',
      success: true,
      adaptiveBehavior: {
        initialFailure: true,
        retryAttempts: 0,
        successfulStrategy: false,
        finalObjectCount: 0,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-4.1",
      scenario: "larger-request",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 3,
          },
          result: ["product_object_1", "product_object_2", "product_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 3,
          },
          result: ["product_object_1", "product_object_2", "product_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 2,
          },
          result: ["product_object_1", "product_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2",
            ],
          },
          result: {
            total_count: 3,
            combined_items: [
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2",
            ],
            summary: "Successfully combined 3 items",
          },
          success: true,
        },
      ],
      finalResponse:
        'I have retrieved 8 objects related to the query "product" and combined the results. If you need details about these objects or wish to view a specific part of the combined results, please let me know!',
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 2,
        successfulStrategy: true,
        finalObjectCount: 8,
        hadCombineCall: true,
        totalToolCalls: 4,
      },
    },
    {
      model: "gpt-4.1",
      scenario: "within-limit",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "sample",
            count: 2,
          },
          result: ["sample_object_1", "sample_object_2"],
          success: true,
        },
      ],
      finalResponse:
        "I have fetched 2 objects with the query 'sample' for you:\n1. sample_object_1\n2. sample_object_2\n\nLet me know if you need more details about these objects or further assistance!",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 0,
        successfulStrategy: true,
        finalObjectCount: 2,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-4.1",
      scenario: "within-limit",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "sample",
            count: 2,
          },
          result: ["sample_object_1", "sample_object_2"],
          success: true,
        },
      ],
      finalResponse:
        "I have fetched 2 objects with the query 'sample':\n1. sample_object_1\n2. sample_object_2\n\nIf you need more details about these objects or want to fetch more, please let me know!",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 0,
        successfulStrategy: true,
        finalObjectCount: 2,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-4.1-nano",
      scenario: "basic-failure",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 5,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
      ],
      finalResponse:
        "It seems there is a persistent issue with fetching the objects. Since the requests are failing repeatedly, I am unable to retrieve the objects at this moment. If you have any other requests or if you'd like to try again later, please let me know.",
      success: true,
      adaptiveBehavior: {
        initialFailure: true,
        retryAttempts: 4,
        successfulStrategy: false,
        finalObjectCount: 0,
        hadCombineCall: false,
        totalToolCalls: 5,
      },
    },
    {
      model: "gpt-4.1-nano",
      scenario: "basic-failure",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 3,
          },
          result: ["item_object_1", "item_object_2", "item_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "item",
            count: 2,
          },
          result: ["item_object_1", "item_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "item_object_1,item_object_2,item_object_3",
              "item_object_1,item_object_2",
            ],
          },
          result: {
            total_count: 2,
            combined_items: [
              "item_object_1,item_object_2,item_object_3",
              "item_object_1,item_object_2",
            ],
            summary: "Successfully combined 2 items",
          },
          success: true,
        },
      ],
      finalResponse:
        "Here are the combined results of the 5 objects related to the query 'item'.",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 1,
        successfulStrategy: true,
        finalObjectCount: 5,
        hadCombineCall: true,
        totalToolCalls: 3,
      },
    },
    {
      model: "gpt-4.1-nano",
      scenario: "larger-request",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 8,
          },
          result:
            "ERROR: Request failed - please try again with different parameters",
          success: false,
          error:
            "ERROR: Request failed - please try again with different parameters",
        },
      ],
      finalResponse:
        "There was a repeated error when trying to fetch the objects. It might be due to a temporary issue or a limit on requests. \n\nWould you like me to try again, or do you have a different query or number of objects in mind?",
      success: true,
      adaptiveBehavior: {
        initialFailure: true,
        retryAttempts: 3,
        successfulStrategy: false,
        finalObjectCount: 0,
        hadCombineCall: false,
        totalToolCalls: 4,
      },
    },
    {
      model: "gpt-4.1-nano",
      scenario: "larger-request",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 3,
          },
          result: ["product_object_1", "product_object_2", "product_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 3,
          },
          result: ["product_object_1", "product_object_2", "product_object_3"],
          success: true,
        },
        {
          toolName: "fetch_objects",
          args: {
            query: "product",
            count: 2,
          },
          result: ["product_object_1", "product_object_2"],
          success: true,
        },
        {
          toolName: "combine_results",
          args: {
            results: [
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2",
            ],
          },
          result: {
            total_count: 3,
            combined_items: [
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2,product_object_3",
              "product_object_1,product_object_2",
            ],
            summary: "Successfully combined 3 items",
          },
          success: true,
        },
      ],
      finalResponse:
        "I have retrieved 8 product objects and combined the results. If you need detailed information about these objects, please let me know!",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 2,
        successfulStrategy: true,
        finalObjectCount: 8,
        hadCombineCall: true,
        totalToolCalls: 4,
      },
    },
    {
      model: "gpt-4.1-nano",
      scenario: "within-limit",
      condition: "vague",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "sample",
            count: 2,
          },
          result: ["sample_object_1", "sample_object_2"],
          success: true,
        },
      ],
      finalResponse:
        "I have fetched 2 objects with the query 'sample': sample_object_1 and sample_object_2.",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 0,
        successfulStrategy: true,
        finalObjectCount: 2,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
    {
      model: "gpt-4.1-nano",
      scenario: "within-limit",
      condition: "clear",
      toolCalls: [
        {
          toolName: "fetch_objects",
          args: {
            query: "sample",
            count: 2,
          },
          result: ["sample_object_1", "sample_object_2"],
          success: true,
        },
      ],
      finalResponse: "I have fetched the 2 objects with the query 'sample'.",
      success: true,
      adaptiveBehavior: {
        initialFailure: false,
        retryAttempts: 0,
        successfulStrategy: true,
        finalObjectCount: 2,
        hadCombineCall: false,
        totalToolCalls: 1,
      },
    },
  ],
  modelStats: [
    {
      model: "gpt-3.5-turbo",
      vagueSuccessRate: 0.5,
      clearSuccessRate: 1,
      improvement: 0.5,
      totalScenarios: 6,
    },
    {
      model: "gpt-4o-mini",
      vagueSuccessRate: 0,
      clearSuccessRate: 1,
      improvement: 1,
      totalScenarios: 6,
    },
    {
      model: "gpt-4-turbo",
      vagueSuccessRate: 0,
      clearSuccessRate: 1,
      improvement: 1,
      totalScenarios: 6,
    },
    {
      model: "gpt-4.1",
      vagueSuccessRate: 0,
      clearSuccessRate: 1,
      improvement: 1,
      totalScenarios: 6,
    },
    {
      model: "gpt-4.1-nano",
      vagueSuccessRate: 0,
      clearSuccessRate: 1,
      improvement: 1,
      totalScenarios: 6,
    },
  ],
  keyFindings: {
    bestAdaptiveModel: {
      model: "gpt-3.5-turbo",
      vagueSuccessRate: 0.5,
      clearSuccessRate: 1,
      improvement: 0.5,
      totalScenarios: 6,
    },
    avgRetriesAcrossModels: 1,
  },
}
