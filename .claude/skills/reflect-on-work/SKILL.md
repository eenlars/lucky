---
name: Reflect
description: reflect on recent work and clean up code for PR readiness
---

revisit my prompts. did you do it well? did you do it well enough? did you do everything i asked? are there areas of improvements? think again. did you create any workarounds that shouldn't be workarounds, or shortcuts? is the code clear and simple enough for others to understand and debug? does the code not break other parts of code that use it? it shouldn't be too simplified that it loses functionality or developer intent. did you run linter? if you're done, continue improving immediately. you should be able to prove that it works, not just state it. (i'm not saying you should prove it, i'm saying you should be able to)

is this maintainable? doesn't it bulk up the code? is the file size right? will other developers understand the code? will other developers be able to reuse the code without issues? do you actually understand the code?

of all the code that was just written, you clean up. you document, make sure the variables are all clear and unambiguous, remove unused scripts, or markdown files that are no longer necessary. the code has to be understandable for an outsider, and not use any's or as's. if unclear what files have been edited, you must ask the user to provide it. you must only work in the files you edited and the code that was just edited. you make it PR ready. you check all your edits and remove any .md files that are at the root of the project.


look and revise at yourself. which files have you editted? are the new files placed at the right place and not just put somewhere at the top of a directory? there should be no index.ts files, except in the shared folder. also: do the file names make sense? didn't you put bullshit somewhere? did you see any zod files that weren't put in the right zod folder? (contracts, shared folder or in the /lib/schemas?)


IF THERE ARE ANY JUST CONTINUE IMMEDIATELY DO NOT STOP
