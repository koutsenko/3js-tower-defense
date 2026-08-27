import { describe, expect, it } from 'vitest';
import { MathExtra } from '../../../src/game/math/MathExtra';

describe('MathExtra (FR-007, AC-005)', () => {
  describe('calculateDiscriminant', () => {
    it('calculates the discriminant of a quadratic equation', () => {
      expect(MathExtra.calculateDiscriminant(1, -5, 6)).toBe(1);
    });
  });

  describe('findSmallerQuadraticRoot', () => {
    it('returns the smaller root', () => {
      expect(MathExtra.findSmallerQuadraticRoot(1, -5, 6)).toBe(2);
    });

    it('returns null when the equation has no real roots', () => {
      expect(MathExtra.findSmallerQuadraticRoot(1, 0, 1)).toBeNull();
    });

    it('treats a slightly negative discriminant within tolerance as zero', () => {
      expect(MathExtra.findSmallerQuadraticRoot(1, 2, 1.0000000001, 1e-9)).toBe(
        -1,
      );
    });
  });
});
