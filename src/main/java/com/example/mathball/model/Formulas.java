package com.example.mathball.model;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;

/**
 * 大数工具。全部伤害与血量运算一律走 BigInteger，禁止 long / double 参与。
 */
public final class Formulas {

    /** 阶乘缓存：index -> index!，懒加载增长。 */
    private static final List<BigInteger> FACTORIAL_CACHE = new ArrayList<>(List.of(BigInteger.ONE));

    private Formulas() {
    }

    /** n!，n >= 0。 */
    public static synchronized BigInteger factorial(int n) {
        if (n < 0) {
            throw new IllegalArgumentException("factorial 的参数不能为负数: " + n);
        }
        for (int i = FACTORIAL_CACHE.size(); i <= n; i++) {
            FACTORIAL_CACHE.add(FACTORIAL_CACHE.get(i - 1).multiply(BigInteger.valueOf(i)));
        }
        return FACTORIAL_CACHE.get(n);
    }

    /** 10 的 exponent 次幂。 */
    public static BigInteger pow10(int exponent) {
        if (exponent < 0) {
            throw new IllegalArgumentException("指数不能为负数: " + exponent);
        }
        return BigInteger.TEN.pow(exponent);
    }

    /** 判断 x 是否为 10 的整数次幂。 */
    public static boolean isPowerOfTen(BigInteger x) {
        if (x.signum() <= 0) {
            return false;
        }
        String s = x.toString();
        if (s.charAt(0) != '1') {
            return false;
        }
        for (int i = 1; i < s.length(); i++) {
            if (s.charAt(i) != '0') {
                return false;
            }
        }
        return true;
    }

    /** x 以 10 为底的指数，要求 x 是 10 的整数次幂。 */
    public static int exponentOf(BigInteger x) {
        if (!isPowerOfTen(x)) {
            throw new IllegalArgumentException("不是 10 的整数次幂: " + x);
        }
        return x.toString().length() - 1;
    }
}
