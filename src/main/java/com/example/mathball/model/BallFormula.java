package com.example.mathball.model;

import java.math.BigInteger;

/**
 * 公式球定义。
 *
 * <p>step 是球种的固有属性：开局选球即确定，全程恒定、不随关卡变化、玩家不可调整。
 * 新增球种只需在此追加一个枚举值，禁止改动关卡血量表。
 */
public enum BallFormula {

    /** 阶乘球：f(n) = n!，每击 +1 阶 */
    FACTORIAL("阶乘球", "n!", 1, 1) {
        @Override
        public BigInteger value(int n) {
            return Formulas.factorial(n);
        }
    },

    /** 三角阶乘球：f(n) = T(n)!，T(n) = n(n+1)/2，每击 +1 阶 */
    TRI("三角阶乘球", "T(n)!", 1, 2) {
        @Override
        public BigInteger value(int n) {
            return Formulas.factorial(n * (n + 1) / 2);
        }
    },

    /** 正方阶乘球：f(n) = (n²)!，每击 +1 阶 */
    SQR("正方阶乘球", "(n²)!", 1, 3) {
        @Override
        public BigInteger value(int n) {
            return Formulas.factorial(n * n);
        }
    };

    private final String displayName;
    private final String formulaText;
    private final int step;
    private final int stars;

    BallFormula(String displayName, String formulaText, int step, int stars) {
        this.displayName = displayName;
        this.formulaText = formulaText;
        this.step = step;
        this.stars = stars;
    }

    /** 求 n 阶时该公式的运算结果，即本次碰撞的伤害。 */
    public abstract BigInteger value(int n);

    public String getDisplayName() {
        return displayName;
    }

    public String getFormulaText() {
        return formulaText;
    }

    /** 固定升阶步长，全程恒定。 */
    public int getStep() {
        return step;
    }

    public int getStars() {
        return stars;
    }
}
