package com.example.mathball.service;

import com.example.mathball.model.BallFormula;
import com.example.mathball.model.Formulas;
import com.example.mathball.model.dto.LevelDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 公式与数值精度测试。重点：绝不允许 long / double 参与运算。
 */
class FormulaServiceTest {

    private final FormulaService service = new FormulaService();

    @Test
    @DisplayName("阶乘球：先升阶后结算，每击 +2")
    void factorialDamage() {
        // 初始 n = 2，第一次碰撞 n -> 4，伤害 4! = 24
        assertEquals(new BigInteger("24"), service.damage(BallFormula.FACTORIAL, 4));
        assertEquals(new BigInteger("720"), service.damage(BallFormula.FACTORIAL, 6));
        assertEquals(new BigInteger("40320"), service.damage(BallFormula.FACTORIAL, 8));
    }

    @Test
    @DisplayName("三角阶乘球：f(n) = T(n)!")
    void triFactorialDamage() {
        // n = 4 -> T(4) = 10 -> 10! = 3628800
        assertEquals(new BigInteger("3628800"), service.damage(BallFormula.TRI, 4));
        // n = 6 -> T(6) = 21 -> 21! = 51090942171709440000
        assertEquals(new BigInteger("51090942171709440000"), service.damage(BallFormula.TRI, 6));
    }

    @Test
    @DisplayName("正方阶乘球：f(n) = (n²)!")
    void squareFactorialDamage() {
        // n = 3 -> 9! = 362880
        assertEquals(new BigInteger("362880"), service.damage(BallFormula.SQR, 3));
        // n = 13 -> 169! 约 1.4e304，远超 long 上限
        BigInteger d = service.damage(BallFormula.SQR, 13);
        assertTrue(d.toString().length() == 305, "169! 应为 305 位十进制数，实际 " + d.toString().length());
    }

    @Test
    @DisplayName("21! 已超出 long 上限，必须用 BigInteger 精确表示")
    void beyondLongRange() {
        BigInteger v = Formulas.factorial(21);
        assertEquals("51090942171709440000", v.toString());
        assertThrows(ArithmeticException.class, () -> {
            // 证明 long 会溢出（用于文档化这条约束）
            long overflow = 1L;
            for (int i = 1; i <= 21; i++) {
                overflow = Math.multiplyExact(overflow, i);
            }
        });
    }

    @Test
    @DisplayName("10^300 与伤害相减的符号判定正确")
    void bigIntegerSubtraction() {
        BigInteger hp = Formulas.pow10(300);
        BigInteger dmg = service.damage(BallFormula.SQR, 13); // 169! > 10^300
        assertTrue(hp.subtract(dmg).signum() < 0, "169! 应能一击打穿 10^300");
        assertTrue(hp.subtract(service.damage(BallFormula.SQR, 12)).signum() > 0, "144! 不应打穿 10^300");
    }

    @Test
    @DisplayName("固定步长：三种球各自恒定且不随关卡变化")
    void stepIsFixed() {
        assertEquals(2, BallFormula.FACTORIAL.getStep());
        assertEquals(1, BallFormula.TRI.getStep());
        assertEquals(1, BallFormula.SQR.getStep());
    }

    @Test
    @DisplayName("formulaCheck 与前端本地重算规则一致（从 startN 起连续 4 次）")
    void buildCheck() {
        LevelDto.FormulaCheckDto check = service.buildCheck(BallFormula.FACTORIAL, 2, 4);
        assertEquals(2, check.startN());
        assertEquals(2, check.step());
        assertEquals(4, check.damage().size());
        // n = 4, 6, 8, 10（每击 +2）
        assertEquals("24", check.damage().get(0));
        assertEquals("720", check.damage().get(1));
        assertEquals("40320", check.damage().get(2));
        assertEquals("3628800", check.damage().get(3));
        assertEquals("24", check.cumulative().get(0));
        assertEquals("744", check.cumulative().get(1));
        assertEquals("41064", check.cumulative().get(2));
        assertEquals("3669864", check.cumulative().get(3));
    }

    @Test
    @DisplayName("10 的整数次幂判定")
    void powerOfTen() {
        assertTrue(Formulas.isPowerOfTen(Formulas.pow10(300)));
        assertTrue(Formulas.isPowerOfTen(BigInteger.ONE));
        assertTrue(!Formulas.isPowerOfTen(new BigInteger("1200")));
        assertEquals(300, Formulas.exponentOf(Formulas.pow10(300)));
    }
}
