---
name: Fix bug when stuck
description: This skill helps you explain a problem you're stuck on for a longer time and get back to the root of the problem.
---

you need to provide an explanation to dumbagent. dumbagent has no idea of any code and especially not structure. it does not know anything about the problem. you need to explain this problem from the basics. also scientifically, what seems to be the problem? what have we done to fix it, and for each thing we have tried, what did we assume, and what did we learn from it? do not try to give fixes. we're just about the problem. you could try to say what your feelings are for the fix. at least, the fix is most of the times very simple, but hard to find. did you look around enough? 

your output must be clear, organized. starting with the 
1. context
    - what is the architecture
    - what do we know the dumbagent does not know
    - what is the error/thing we see why it's a problem (in detail)
    - what we are building: a tool to make it easy to create 'backends' which are actually just agentic workflows.
    - how we are building it: every line of code should make sense
2. the problem we're facing
    - the files affected
    - the functions affected
    - all observations we made
3. the things we tried: per thing we tried (bullet point list with subbullets)
    - what we tried
    - why we thought it would work
    - why it didn't work
    - what we learned from it
4. the current state
    - what your assumptions are, that you are not completely sure of
    - where we're at
    - what you just did recently
5. the goal
    - how do we measure success?
    - what are the limitations (most of the times it's not creating new code, but reusing existing code, or finding an intelligent way to improve)

at the end add the following text: "after your analysis and root cause finding + fix + explanation why, i want you to ask two questions, that if answered, would most likely answer this problem in the near long term, instead of being a short quick fix"

assume you're writing it as patrick collison explaining to elon musk that on reading it, it's immedately clear what's there. elon doesn't like long texts. he loves clarity, thoughtfulness, research, and intelligence. he spots fake intelligence immediately.