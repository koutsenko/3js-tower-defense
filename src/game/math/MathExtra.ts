/**
 * Дополнительные математические операции, отсутствующие в стандартном Math.
 *
 * Содержит вспомогательные вычисления для квадратных уравнений вида:
 *
 *     a·x² + b·x + c = 0
 *
 * В targeting квадратное уравнение возникает при поиске пересечения
 * прямого участка маршрута монстра с границей радиуса башни.
 */
export class MathExtra {
  static calculateDiscriminant(a: number, b: number, c: number): number {
    return b * b - 4 * a * c;
  }

  static findSmallerQuadraticRoot(
    a: number,
    b: number,
    c: number,
    discriminantTolerance = 0,
  ): number | null {
    const discriminant = MathExtra.calculateDiscriminant(a, b, c);

    if (discriminant < -discriminantTolerance) {
      return null;
    }

    return (-b - Math.sqrt(Math.max(0, discriminant))) / (2 * a);
  }
}
