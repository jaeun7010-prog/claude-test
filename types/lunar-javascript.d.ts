declare module "lunar-javascript" {
  export class Solar {
    static fromYmdHms(
      y: number,
      m: number,
      d: number,
      h: number,
      mi: number,
      s: number
    ): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    getLunar(): Lunar;
  }
  export class EightChar {
    setSect(sect: number): void;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
  }
  export class Lunar {
    getJieQiTable(): Record<string, Solar>;
    getEightChar(): EightChar;
  }
}
