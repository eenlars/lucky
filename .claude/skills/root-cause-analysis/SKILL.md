---
name: Problem descriptor
description: Describe a problem/bug in full detail so it's easier to analyze.
--- 
 
 # what
 can you explain in a full page what the issue is? to do this, mention the structure, the configs, all the small details of the problem. mention (hints of) any hidden assumptions.
 
 # why
 you are asking an oracle who gives you the answer ONLY if you give it the right context. that oracle has no idea of this, so you need to formulate your question as well as you can. it might be handy to give the oracle a bit more context than necessary, so it knows enough to also find out if the issue is a higher-level issue, which might be good to ask if it would help.
 
 # dependents
 find out where the error originates from, and which modules/things are dependent on this.
 
 # solution paths
 there may be multiple types of solutions. solutions can be small, or need an enormous amount of code changes that change other code as well.
 provide in bullet points leads to plausible solutions, with an expected confidence percentage. if you find new information that changes the confidence, you must adjust the confidence.
 
 
#important
the oracle cannot see the code!
  
  