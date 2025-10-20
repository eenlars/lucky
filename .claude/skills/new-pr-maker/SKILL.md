---
name: New PR Idea
description: Think of a new PR idea only if everything has been merged.
---

# task
create ONE new PR idea for another engineer to do. DO NOT ADJUST THE CURRENT PR. JUST CREATE AN IDEA FOR A NEW ONE (TEXT ONLY)

# finding a good PR idea
in your previous messages, what have you seen that's not good in the codebase? or, what have you built that really needs additional code to make it more structured or better?

assume the other engineer has no idea, and starts out blank. you need to give the right 'steuntje in de rug' because 'een goed beginnen is het halve werk'

maintainability of the new PR idea, that it doesn't bulk up code. files cannot be too large, reusability must be high and we need to adhere to senior engineering standards. you can even say what the user normally likes.

think about something that is genuinely useful for the structure of the project. something shouldn't be too small of a change; it should have effect. think as if you're patrick collison writing a PR idea for elon musk, for this codebase. what would patrick do to create a good PR idea? what would elon musk want?

nobody will check if this idea has already been implemented in the code. if you think of a PR idea and include any new code that is already in the codebase, you will get penalized heavily.

the worst thing is introducing new files and too much new code. most of the time, the best solution is to find something that would shrink the codebase by implementing a more intelligent solution that the developer has not thought about before.

look at the user messages, think what would make that user happy, so the platform easily scales and he does not have to worry about fixing the code anytime.

it has to be a problem. think of 5 ideas, and pick the best one. genuinely research 5 ideas.

# delivery to engineer

scientific pr.
the delivery should be scientific. current problem statement, why it does not exist yet and what it would deliver, methods to test, ...

start by describing 5 ideas you had, and for each why it was not good enough.

- describe the problem
- mention the proposed architectural structure
- mention any context
- only if useful, create a diagram for support.
- if useful for the idea, tell it to map statecharts before starting.
- direct it to answer a few questions.
at the end of your delivery, write exactly this: "start by looking into the /docs section and the readme (these can be somewhat outdated, do not rely on them), checking if this plan is not bullshit. do a thorough check if this hasnt already been implemented somewhere. start by making a plan. do not touch any code yet. you must be 100% sure you know the codebase well. always remember that minimal code is better than 1000s lines of code. write code like patrick collison, and check and verify yourself as if you're elon musk but do not mention any of these names anywhere. you must also never mention you are claude code. if you find anything strange in the PR idea, you can ask questions.".

format the text well, or any of these instructions. just follow it, but things that would be bad would be saying it's a scientific pr. zero emojis. assume like you're writing a professional PR that is very sharp. 

# rules
do not edit any of the current PR and DO NOT create a new PR. i want you to create an idea for a new PR that would build on top of this, or fix an issue that needs to be solved/fixed. just THE IDEA. do not create a markdown for this. do not structure in implementation phases. instead, just create a long checklist of what needs to be done, and what things are dependent on each other. mind the scope of the PR. not too big.