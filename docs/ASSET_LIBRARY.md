# Asset and animation library v0.2

Three registered visual assets: retro-robot, treasure-chest, energy-core. The robot has independent walk, reach, head orientation and blink parameters. The chest has an articulated lid. The energy core has rotation and pulse. These are projected box meshes, not true Three.js geometry. `emitAsset(id, box, pose)` composes each into the common CPU mesh renderer. Pose coordinates are in world units; scale is uniform. Keep this API internal until the general scene contract is versioned.

Shared motion: clamp, smoothstep, eased interpolation, piecewise keyframes. Shared visual primitives: text, polygon, glow, star, paper labels and rounded boxes. Shared camera: perspective projection and painter-sorted face rendering. Baseline choreography is preserved by extracting its original geometry and lighting math. The new robot-lab scene reuses the robot with a separate camera/pose sequence and the energy-core asset. Orbit-explainer shares motion and typography.

## Tests
Registry/contract parity; unknown asset rejection; keyframe boundaries and malformed inputs; transform semantics; stable robot material identity across poses; chest hinge motion; deterministic core; projection and visible faces; full scene deterministic traces. CI renders all three examples with local Kokoro and full media checks. Visual review remains necessary.

## Next
Extract environments, broaden asset families and add a real depth-buffered optional backend before extending the scene contract to arbitrary asset placement.
