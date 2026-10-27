const alpha = (dt: number, cutoff: number) =>
  1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
export class OneEuroFilter {
  private value: number | null = null;
  private rawValue = 0;
  private derivative = 0;
  private time = 0;
  constructor(
    private minCutoff = 1,
    private beta = 0.04,
    private derivativeCutoff = 1,
  ) {}
  filter(value: number, time: number) {
    if (this.value === null) {
      this.value = value;
      this.rawValue = value;
      this.time = time;
      return value;
    }
    const dt = Math.max(0.001, (time - this.time) / 1000),
      speed = (value - this.rawValue) / dt;
    this.derivative +=
      alpha(dt, this.derivativeCutoff) * (speed - this.derivative);
    this.value +=
      alpha(dt, this.minCutoff + this.beta * Math.abs(this.derivative)) *
      (value - this.value);
    this.time = time;
    this.rawValue = value;
    return this.value;
  }
}
