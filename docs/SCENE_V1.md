# Scene contract v1
Read `examples/*.json` as canonical examples and `src/core/contract.js` for executable validation.

Required fields: version=1, safe lowercase id, template (robot-treasure, orbit-explainer or robot-lab), title, voice (allowlist), copy (kicker, intro[3], question, reveal[2], outro[2]), narration (ordered nonoverlapping objects with start/end/text), captions (ordered nonoverlapping [start,end,text] tuples). Seconds are relative to the fixed 12-second timeline. Each narration slot must be at least 0.4 seconds. Empty captions allowed. Unknown fields rejected. Text is rendered, not executed. Text bounds are enforced; the renderer fits copy to available width. Voice generation may increase speed to fit a slot, and fails if it still cannot fit after five attempts.

The orbit-explainer template specifically illustrates hash-linked blocks; it is not a general explainer generator. The robot-treasure template preserves the robot/chest choreography. Use scenes semantically consistent with the selected template.

The robot-lab template depicts a robot powering an energy core. It reuses the same rig with different poses and a different camera path.
