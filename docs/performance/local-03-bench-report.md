| id | backend | frames | gl | conc | hw | reuse | serial | ok/fail | render s (sd) | frames s | stitch s | fps | browser s | verify s | quality s | GPU util % | VRAM MiB | CPU % | RAM Δ GB | CPU perf min % | film hashes | = ref |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| a1-cin-cpu-c2 | cpu | 360 | – | 2 | disable | n | n | 3/0 | 34.1 (0.99) | 33.5 | 0.42 | 10.57 | 0.17 | 0.77 | 0.65 | 0.0 | 0 | 20.1 | 1.52 | 151 | 1 | yes |
| a2-cin-three-vk-c2 | three | 360 | vulkan | 2 | disable | n | n | 3/0 | 18.6 (0.07) | 18.0 | 0.43 | 19.34 | 0.15 | 0.81 | 0.69 | 27.6 | 592 | 23.5 | 1.56 | 148 | 1 | yes |
| a3-cin-three-sw-c2 | three | 360 | swangle | 2 | disable | n | n | 2/0 | 146.1 (16.29) | 145.4 | 0.52 | 2.48 | 0.28 | 1.05 | 0.89 | 0.0 | 0 | 62.3 | 2.39 | 140 | 1 | NO |
| a4-cin-cpu-c2-serial | cpu | 360 | – | 2 | disable | n | y | 2/0 | 36.3 (1.46) | 33.2 | 2.78 | 9.93 | 0.40 | 1.02 | 0.90 | 0.0 | 0 | 26.6 | 1.16 | 151 | 1 | NO |
| a5-cin-three-vk-c2-serial | three | 360 | vulkan | 2 | disable | n | y | 2/0 | 21.0 (2.46) | 17.3 | 3.28 | 17.23 | 0.43 | 1.03 | 0.74 | 21.5 | 576 | 32.2 | 1.46 | 152 | 2 | NO |
| a6-af01-cpu-c2 | cpu | 900 | – | 2 | disable | n | n | 2/0 | 69.3 (2.97) | 68.4 | 0.59 | 13.00 | 0.28 | 2.06 | 1.13 | 0.0 | 0 | 22.5 | 1.07 | 150 | 1 | yes |
| a7-af01-three-vk-c2 | three | 900 | vulkan | 2 | disable | n | n | 2/0 | 48.2 (0.18) | 47.4 | 0.62 | 18.68 | 0.26 | 2.05 | 1.15 | 31.4 | 544 | 25.1 | 1.61 | 158 | 1 | NO |
| b1-cin-cpu-c1 | cpu | 360 | – | 1 | disable | n | n | 2/0 | 54.0 (0.84) | 53.4 | 0.48 | 6.67 | 0.15 | 0.91 | 0.76 | 0.0 | 0 | 18.9 | 1.48 | 145 | 1 | yes |
| b1-cin-cpu-c4 | cpu | 360 | – | 4 | disable | n | n | 2/0 | 19.9 (0.31) | 19.4 | 0.42 | 18.05 | 0.15 | 0.89 | 0.69 | 0.0 | 0 | 34.6 | 1.95 | 151 | 1 | yes |
| b1-cin-three-vk-c1 | three | 360 | vulkan | 1 | disable | n | n | 2/0 | 33.5 (0.42) | 32.9 | 0.44 | 10.75 | 0.15 | 0.87 | 0.69 | 27.9 | 271 | 18.7 | 1.56 | – | 2 | NO |
| b1-cin-three-vk-c4 | three | 360 | vulkan | 4 | disable | n | n | 2/0 | 12.5 (0.12) | 11.9 | 0.42 | 28.83 | 0.15 | 0.81 | 0.69 | 21.9 | 851 | 35.5 | 1.67 | 145 | 2 | NO |
| b2-cin-cpu-c8 | cpu | 360 | – | 8 | disable | n | n | 2/0 | 21.7 (4.72) | 21.1 | 0.51 | 16.97 | 0.36 | 1.64 | 0.83 | 0.0 | 0 | 63.4 | 2.65 | 152 | 1 | yes |
| b2-cin-three-vk-c8 | three | 360 | vulkan | 8 | disable | n | n | 2/0 | 11.2 (0.09) | 10.5 | 0.52 | 32.12 | 0.15 | 0.88 | 0.74 | 20.0 | 1332 | 48.8 | 1.92 | 146 | 1 | NO |
| b3-cin-cpu-c4 | cpu | 360 | – | 4 | disable | n | n | 2/0 | 21.0 (0.11) | 20.5 | 0.41 | 17.16 | 0.16 | 0.63 | 0.51 | 0.0 | 0 | 27.5 | 1.81 | 142 | 1 | yes |
| b3-cin-cpu-c8 | cpu | 360 | – | 8 | disable | n | n | 2/0 | 19.0 (0.95) | 18.6 | 0.34 | 18.94 | 0.19 | 0.70 | 0.58 | 0.0 | 0 | 45.8 | 2.61 | 145 | 1 | yes |
| b3-cin-three-vk-c4 | three | 360 | vulkan | 4 | disable | n | n | 2/0 | 11.0 (0.18) | 10.6 | 0.33 | 32.74 | 0.15 | 0.65 | 0.54 | 11.0 | 859 | 28.0 | 1.66 | 137 | 2 | NO |
| b3-cin-three-vk-c8 | three | 360 | vulkan | 8 | disable | n | n | 2/0 | 10.3 (0.18) | 9.8 | 0.37 | 34.92 | 0.16 | 0.70 | 0.57 | 11.9 | 1358 | 35.5 | 1.95 | 147 | 1 | NO |
| b4-cin-cpu-c4-ctrl | cpu | 360 | – | 4 | disable | n | n | 2/0 | 22.1 (0.33) | 21.7 | 0.31 | 16.30 | 0.15 | 0.62 | 0.51 | 0.0 | 0 | 25.5 | 1.88 | 143 | 1 | yes |
| b4-cin-cpu-c8-ctrl | cpu | 360 | – | 8 | disable | n | n | 2/0 | 15.9 (0.02) | 15.5 | 0.33 | 22.68 | 0.15 | 0.63 | 0.51 | 0.0 | 0 | 43.5 | 2.38 | 144 | 1 | yes |
| b4-cin-cpu-c8-ctrl2 | cpu | 360 | – | 8 | disable | n | n | 2/0 | 15.5 (0.25) | 14.8 | 0.55 | 23.29 | 0.15 | 0.63 | 0.51 | 0.0 | 0 | 44.3 | 2.43 | 141 | 1 | yes |
| b4-cin-cpu-c8-reuse | cpu | 360 | – | 8 | disable | y | n | 2/0 | 15.4 (0.08) | 14.9 | 0.41 | 23.43 | – | 0.62 | 0.51 | 0.0 | 0 | 43.1 | 2.33 | 148 | 1 | yes |
| b4-cin-cpu-c8-reuse2 | cpu | 360 | – | 8 | disable | y | n | 2/0 | 15.7 (0.69) | 15.2 | 0.37 | 22.98 | – | 0.62 | 0.52 | 0.0 | 0 | 42.4 | 2.31 | 143 | 1 | yes |
| b4-cin-three-vk-c4-ctrl | three | 360 | vulkan | 4 | disable | n | n | 2/0 | 11.0 (0.12) | 10.5 | 0.33 | 32.85 | 0.15 | 0.64 | 0.52 | 10.8 | 859 | 27.2 | 1.69 | 139 | 1 | NO |
| b4-cin-three-vk-c8-ctrl | three | 360 | vulkan | 8 | disable | n | n | 2/0 | 8.9 (0.00) | 8.5 | 0.32 | 40.40 | 0.15 | 0.65 | 0.53 | 13.8 | 1364 | 35.2 | 1.97 | – | 1 | NO |
| b4-cin-three-vk-c8-reuse | three | 360 | vulkan | 8 | disable | y | n | 2/0 | 9.8 (0.01) | 9.4 | 0.32 | 36.62 | – | 0.65 | 0.53 | 27.2 | 1351 | 34.3 | 1.71 | – | 2 | NO |
| c1-cin-cpu-c8-nvenc | cpu | 360 | – | 8 | required | n | n | 2/0 | 13.1 (0.30) | 12.7 | 0.31 | 27.43 | 0.15 | 0.59 | 0.49 | 1.2 | 232 | 33.7 | 1.67 | 151 | 1 | NO |
| c1-cin-three-vk-c8-nvenc | three | 360 | vulkan | 8 | required | n | n | 2/0 | 7.9 (0.11) | 7.5 | 0.32 | 45.58 | 0.15 | 0.59 | 0.48 | 18.2 | 1564 | 21.1 | 1.38 | 155 | 1 | NO |
| smoke-three-c2 | three | 360 | vulkan | 2 | disable | n | n | 1/0 | 21.0 (0.00) | 20.1 | 0.73 | 17.15 | 0.65 | 1.11 | 0.92 | 27.5 | 568 | 30.3 | 0.67 | 148 | 1 | yes |

Conditions: a*/b1/b2/smoke rows measured 2026-11-24 under memory pressure (≈13 GB of 15.2 GB idle, non-paged pool ≈2.2 GB, Fast Startup kept kernel state across "shutdowns"). b3 rows measured 2026-11-24 23:41–23:50, 5–15 min after a true cold boot (boot type 0x0, 23:36:37; non-paged pool 0.73 GB) — machine still settling, c8 rows in b3 ran first and are pessimistic. b4 and c1 rows measured 2026-11-25 on the settled machine (available ≈7.1 GB, non-paged pool ≈0.7 GB), with no-reuse controls interleaved with reuse runs; compare concurrency/reuse/encoder only within b4+c1. Every b3/b4/c1 run: verify PASS, quality pass, frame-glitch clean; Three/vulkan min PSNR vs reference 56.26–56.31 dB (x264 rows).

## NVENC encode quality (c1, `--hw-encode required`, cinematic 1080×1920, 360 f)
frame_glitch.py compares at 90×160 grayscale (corruption detector, not an encode-quality metric), so encode quality was measured at full resolution with ffmpeg psnr/ssim (YUV 4:2:0). Reference: near-lossless CPU render `out/bench/c1-lossless-cpu-ref` (Remotion CLI, x264 `--crf=1`; CRF 0 is refused by Remotion 4.0.546 for h264), valid because CPU frames are bit-deterministic.

| encode | profile | bitrate | PSNR avg / min vs CRF1 | SSIM all | render c8 |
|---|---|---|---|---|---|
| x264 default (reference film) | High | 5.10 Mbps | 49.34 / 47.69 dB | 0.99579 | 15.5–15.9 s |
| NVENC (Remotion default, no crf) | Main | 2.06 Mbps | 47.90 / 45.85 dB | 0.99361 | 13.1 s |

NVENC vs x264 reference directly: CPU 48.45 dB avg (min 47.69), SSIM 0.99489; Three/vulkan 47.61 dB avg (min 46.59), SSIM 0.99394, 2.05 vs 6.94 Mbps, 7.9 s vs 8.9 s. Verdict: NVENC is a measurable quality/bitrate trade (−1.4 dB avg, −1.8 dB min, 40% bitrate) for 11–17% faster renders; opt-in draft/preview profile only, x264 stays default for qualification. Not human-reviewed.
