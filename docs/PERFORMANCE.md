# Performance evidence and methodology

No comparison benchmark has been run. No startup, CPU, memory, installer-size or
resource-reduction claims are made. Current diagnostics report counts and engine family;
they do not fabricate memory or startup metrics.

The checkpoint lazily creates account windows, retains profiles on close and performs no
background polling. It does not implement automatic suspension or performance modes.
Automatic unloading must wait for per-account consent and reliable active-call detection.
Closing an account is an explicit user action and can interrupt that service's activity.

Benchmark on the same machine/OS/runtime version/power plan/network with authorized test
accounts and identical service selections. Record Ybochat commit, SyntraChat commit, OS,
CPU/RAM, display scale, WebView version, release build flags and profile warmth. Do not
compare an unoptimized debug executable to a packaged production Electron build.

Measure at least five repetitions; report raw samples, median and p95:

| Scenario | Required measurement | Current result |
| --- | --- | --- |
| Cold/warm startup | process start to interactive shell | Not measured |
| Idle / five / ten services | full process-tree private working set/RSS after 60s settling | Not measured |
| Tab switching | input to visible interactive content | Embedded tabs not implemented |
| Background CPU | process-tree CPU over five minutes | Not measured |
| Binary/installer | file bytes for same release targets | No release/installer comparison |

Include engine child processes (WebView2/msedgewebview2, WebKitWebProcess, GPU/network
processes), and distinguish shared from private pages. Budget targets will be established
from baseline measurements; they are never guarantees.
