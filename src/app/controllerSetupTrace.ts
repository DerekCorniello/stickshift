import type { GamepadSnapshot } from "../typing";
import type { CaptureWindow } from "./controllerCapture";
import type { ControllerProfile } from "./controllerSetup";

// Ten minutes at 30 samples per second, bounded even if setup stays open.
const MAX_SAMPLES = 18000;
const SAMPLE_MS = 1000 / 30;

export class ControllerSetupTrace {
  private samples: unknown[] = [];
  private lastTime = -Infinity;
  private lastStep = "";
  private startedAt: number | null = null;

  record(
    now: number,
    step: string,
    pad: GamepadSnapshot,
    capture: CaptureWindow | null,
    feedback: string | null,
  ) {
    if (step === this.lastStep && now - this.lastTime < SAMPLE_MS) return;
    this.startedAt ??= now;
    this.lastTime = now;
    this.lastStep = step;
    this.samples.push({
      milliseconds: now - this.startedAt,
      step,
      axes: [...pad.axes],
      buttons: pad.buttons.map(({ value, pressed }) => ({ value, pressed })),
      feedback,
      capture: capture
        ? {
            baselineAxes: [...capture.baselineAxes],
            baselineButtons: [...capture.baselineButtons],
            armed: capture.armed,
            armedButtons: [...capture.armedButtons],
            armedAxes: [...capture.armedAxes],
            ready: capture.ready,
            candidate: capture.candidate,
            heldMs: now - capture.candidateSince,
            candidateSamples: capture.candidateSamples,
            directionPeak: capture.directionPeak,
            travel: capture.travel.map((axis) => ({ ...axis })),
          }
        : null,
    });
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
  }

  report(pad: GamepadSnapshot, profile: ControllerProfile, userAgent: string) {
    return {
      format: "stickshift-setup-trace-v1",
      userAgent,
      controller: {
        id: pad.id,
        index: pad.index,
        mapping: pad.mapping,
        availableAxes: pad.availableAxes,
      },
      profile,
      samples: [...this.samples],
    };
  }
}
