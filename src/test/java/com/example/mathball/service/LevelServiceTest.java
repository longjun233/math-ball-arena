package com.example.mathball.service;

import com.example.mathball.config.MathBallProperties;
import com.example.mathball.model.BallFormula;
import com.example.mathball.model.dto.LevelDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 关卡服务测试：血量由指数现算、限时由尖刺速度反推、非法配置必须被拒绝。
 */
class LevelServiceTest {

    private MathBallProperties props;
    private LevelService service;

    @BeforeEach
    void setUp() {
        props = new MathBallProperties();
        service = new LevelService(props, new FormulaService());
    }

    private MathBallProperties.LevelSpec spec(int level, BallFormula ball, List<Integer> exponents, double speed) {
        MathBallProperties.LevelSpec s = new MathBallProperties.LevelSpec();
        s.setLevel(level);
        s.setRecommendedBall(ball);
        s.setHpExponent(exponents);
        s.setSpikeSpeed(speed);
        return s;
    }

    @Test
    @DisplayName("第 9 关第 3 道屏障必须是 10^300（301 位十进制字符串）")
    void finalBarrierIsTenTo300() {
        props.setLevels(List.of(spec(9, BallFormula.SQR, List.of(150, 225, 300), 115)));

        LevelDto dto = service.level(9);

        assertEquals(3, dto.barrierHp().size());
        assertEquals(301, dto.barrierHp().get(2).length());
        assertEquals(BigInteger.TEN.pow(300).toString(), dto.barrierHp().get(2));
        assertEquals("SQR", dto.recommendedBall());
    }

    @Test
    @DisplayName("限时 = 尖刺行程 / 尖刺速度")
    void timeLimitDerivedFromSpeed() {
        props.setLevels(List.of(spec(1, BallFormula.FACTORIAL, List.of(4, 12, 20), 70)));

        LevelDto dto = service.level(1);

        assertEquals(700.0 / 70.0, dto.timeLimitSec(), 1e-9);
        assertEquals(70.0, dto.spike().speed(), 1e-9);
        assertEquals(700, dto.spike().travel());
    }

    @Test
    @DisplayName("血量必须严格指数递增，否则拒绝启动")
    void rejectsNonIncreasingHp() {
        props.setLevels(List.of(spec(1, BallFormula.FACTORIAL, List.of(20, 12, 4), 70)));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> service.level(1));
        assertTrue(ex.getMessage().contains("指数递增"));
    }

    @Test
    @DisplayName("屏障数量必须恰好为 3")
    void rejectsWrongBarrierCount() {
        props.setLevels(List.of(spec(1, BallFormula.FACTORIAL, List.of(4, 12), 70)));

        assertThrows(IllegalStateException.class, () -> service.level(1));
    }

    @Test
    @DisplayName("formulaCheck 会随推荐球种变化")
    void formulaCheckFollowsRecommendedBall() {
        props.setLevels(List.of(
                spec(1, BallFormula.FACTORIAL, List.of(4, 12, 20), 70),
                spec(8, BallFormula.TRI, List.of(60, 100, 140), 100)));

        assertEquals("FACTORIAL", service.level(1).formulaCheck().ball());
        assertEquals(2, service.level(1).formulaCheck().step());
        assertEquals("TRI", service.level(8).formulaCheck().ball());
        assertEquals(1, service.level(8).formulaCheck().step());
    }
}
