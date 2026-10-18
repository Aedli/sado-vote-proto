// 시드 기반 난수 (SPEC §1). Math.random()은 사용하지 않는다.

/** 32비트 정수 해시 (여러 값을 섞어 하위 스트림 시드를 만든다) */
export function hash32(...values: number[]): number {
  let h = 0x811c9dc5;
  for (const v of values) {
    h ^= v >>> 0;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
  }
  return h >>> 0;
}

/** 문자열 라벨을 숫자로 */
export function labelHash(label: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 해시 기반 [0,1) 균등값. 호출 순서와 무관하게 같은 입력이면 같은 값 */
export function hashUniform(...values: number[]): number {
  return hash32(...values) / 4294967296;
}

/** 해시 기반 표준정규값 */
export function hashNormal(...values: number[]): number {
  const u1 = Math.max(hashUniform(...values, 1), 1e-12);
  const u2 = hashUniform(...values, 2);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** mulberry32, [0,1) */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** 라벨별 독립 하위 스트림 (예: 플레이어 행동이 봇 난수 순서를 바꾸지 않게) */
  fork(label: string | number): Rng {
    const l = typeof label === 'number' ? label : labelHash(label);
    return new Rng(hash32(this.s, l));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** [min, max] 정수 균등 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  normal(mean = 0, sd = 1): number {
    const u1 = Math.max(this.next(), 1e-12);
    const u2 = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  logNormal(mu: number, sigma: number): number {
    return Math.exp(this.normal(mu, sigma));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /** 가중치 비례 인덱스 1개 */
  weightedIndex(weights: ArrayLike<number>): number {
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += weights[i];
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    return weights.length - 1;
  }

  /** 가중 비복원 추출 k개 (순서 있음) */
  weightedSample(weights: ArrayLike<number>, k: number): number[] {
    const w = Array.from(weights);
    const out: number[] = [];
    for (let n = 0; n < k && n < w.length; n++) {
      if (!w.some((x) => x > 0)) break;
      const i = this.weightedIndex(w);
      out.push(i);
      w[i] = 0;
    }
    return out;
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}
